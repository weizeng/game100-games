package com.game100.center

import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.game100.center.data.GameRepository
import com.game100.center.data.HomeRecommend
import com.game100.center.data.UserData
import com.game100.center.model.RemoteGame
import com.game100.center.net.LeaderboardSync
import com.game100.center.net.ReviewApi
import com.game100.center.net.ReviewSync
import com.game100.center.ui.FavoriteBurst
import com.game100.center.ui.FeaturedAdapter
import com.game100.center.ui.GameAdapter
import com.game100.center.ui.StudioUi
import com.game100.center.ui.UiMotion
import com.google.android.material.appbar.MaterialToolbar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * 游戏详情页：头图、快捷事实条、玩法介绍、全服排行、全服评分/印象标签/短评、同类推荐。
 */
class GameDetailActivity : AppCompatActivity() {

    private lateinit var userData: UserData
    private lateinit var game: RemoteGame
    private var lbLoadedOnce = false
    private var lbLoading = false
    private val selectedTags = linkedSetOf<String>()
    private val tagChipViews = mutableMapOf<String, TextView>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_game_detail)
        findViewById<MaterialToolbar>(R.id.detail_toolbar).setNavigationOnClickListener { finish() }

        userData = UserData(this)

        val gameId = intent.getStringExtra("game_id") ?: run { finish(); return }
        game = MainActivity.gameCache[gameId] ?: run { finish(); return }

        findViewById<TextView>(R.id.detail_icon).apply {
            text = game.icon
            background = GameAdapter.tileBackground(this@GameDetailActivity, game.color, sizeDp = 128f, radiusDp = 36f)
        }
        findViewById<View>(R.id.detail_hero).background =
            GameAdapter.heroBackground(this, game.color)
        val repo = GameRepository(this)
        val installedVer = repo.getInstalledVersion(game.id)
        findViewById<TextView>(R.id.detail_name).text = game.name
        findViewById<TextView>(R.id.detail_category).text = game.category
        findViewById<TextView>(R.id.detail_version).text =
            if (installedVer > 0 && game.version > installedVer) "v$installedVer → v${game.version}" else "v${game.version}"
        findViewById<TextView>(R.id.detail_size).text = when {
            installedVer > 0 && game.version > installedVer -> "已装 v$installedVer · 最新 v${game.version}（${formatSize(game.size)}）"
            installedVer > 0 -> "v$installedVer · ✔ 已下载到本机 · 没网也能玩"
            game.size > 0 -> "v${game.version} · ${formatSize(game.size)} · 下载后离线可玩"
            else -> "v${game.version} · ✔ 已下载到本机 · 没网也能玩"
        }
        findViewById<TextView>(R.id.detail_desc).text =
            game.desc.ifBlank { "离线可玩小游戏，点开即玩。" }

        // 快捷事实条初始化
        findViewById<TextView>(R.id.detail_fact_offline).text =
            if (installedVer > 0) "✔ 已就绪" else if (game.size > 0) "⬇ ${formatSize(game.size)}" else "✔ 离线可玩"
        findViewById<TextView>(R.id.detail_fact_offline_sub).text =
            if (installedVer > 0) "离线秒开" else "下载后离线"
        refreshBestScore(gameId)

        // 出品方：彩色胶囊，点击回首页只看该出品方
        val studio = game.displayStudio()
        findViewById<TextView>(R.id.detail_studio).apply {
            StudioUi.bindDetailChip(this, studio)
            setOnClickListener {
                val intent = Intent(this@GameDetailActivity, MainActivity::class.java).apply {
                    putExtra("studio_filter", studio)
                    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
                startActivity(intent)
            }
        }

        // 收藏按钮
        val btnFav = findViewById<TextView>(R.id.btn_favorite)
        fun refreshFav() {
            val selected = userData.isFavorite(gameId)
            btnFav.text = if (selected) "♥" else "♡"
            btnFav.isSelected = selected
            btnFav.setTextColor(getColor(if (selected) R.color.badge_red else R.color.text_secondary))
            btnFav.contentDescription = if (selected) "取消收藏${game.name}" else "收藏${game.name}"
        }
        refreshFav()
        btnFav.setOnClickListener {
            val now = userData.toggleFavorite(gameId)
            refreshFav()
            if (now) FavoriteBurst.show(btnFav)
            Toast.makeText(this, if (now) "已收藏" else "已取消收藏", Toast.LENGTH_SHORT).show()
        }

        // 评价与印象标签模块
        setupReviewComposer(gameId)

        // 开始游戏 / 下载游戏
        val btnPlay = findViewById<Button>(R.id.btn_play)
        fun refreshPlayButton() {
            if (repo.isInstalled(game.id)) {
                btnPlay.text = "▶ 开始游戏"
                btnPlay.setBackgroundResource(R.drawable.btn_coin)
                btnPlay.setTextColor(getColor(R.color.coin_ink))
                btnPlay.setOnClickListener {
                    val intent = Intent(this, GameActivity::class.java).apply {
                        putExtra(GameActivity.EXTRA_GAME_ID, game.id)
                    }
                    startActivity(intent)
                }
            } else {
                btnPlay.text = "⬇ 下载游戏"
                btnPlay.setBackgroundResource(R.drawable.btn_cyan)
                btnPlay.setTextColor(getColor(R.color.cyan_ink))
                btnPlay.setOnClickListener {
                    Toast.makeText(this, "正在下载 ${game.name}...", Toast.LENGTH_SHORT).show()
                    val intent = Intent(this, MainActivity::class.java).apply {
                        putExtra("download_game_id", game.id)
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    startActivity(intent)
                    finish()
                }
            }
        }
        refreshPlayButton()

        bindLeaderboard(gameId)
        bindCloudReviews(gameId)
        bindSimilarGames(game)

        val content = findViewById<android.view.ViewGroup>(android.R.id.content)
        UiMotion.bindButtons(content)
        UiMotion.enterPage(content)
    }

    private fun refreshBestScore(gameId: String) {
        val best = userData.getBestScore(gameId)
        val factBest = findViewById<TextView>(R.id.detail_fact_best)
        if (best > 0) {
            factBest.text = "🏆 $best"
            findViewById<TextView>(R.id.detail_best_score).apply {
                visibility = View.VISIBLE
                text = "🏆 本机历史最高分：$best"
            }
        } else {
            factBest.text = "🎯 待刷新"
        }
    }

    private fun setupReviewComposer(gameId: String) {
        val starsRow = findViewById<LinearLayout>(R.id.stars_row)
        val starViews = mutableListOf<TextView>()
        val ratingText = findViewById<TextView>(R.id.detail_rating_text)
        val commentInput = findViewById<EditText>(R.id.review_comment_input)
        val btnSubmit = findViewById<Button>(R.id.btn_submit_review)

        selectedTags.clear()
        selectedTags.addAll(userData.getReviewTags(gameId))
        commentInput.setText(userData.getReviewComment(gameId))

        fun refreshStars() {
            val rating = userData.getRating(gameId)
            starViews.forEachIndexed { i, tv ->
                tv.text = if (i < rating) "★" else "☆"
                tv.isSelected = i < rating
            }
            ratingText.text = when (rating) {
                5 -> "你的评分：5 星 · 强烈推荐！"
                4 -> "你的评分：4 星 · 很好玩"
                3 -> "你的评分：3 星 · 还不错"
                2 -> "你的评分：2 星 · 有待改进"
                1 -> "你的评分：1 星 · 不太合胃口"
                else -> "点击星星评分"
            }
        }

        repeat(5) { i ->
            val tv = TextView(this).apply {
                text = "☆"
                textSize = 30f
                gravity = Gravity.CENTER
                isFocusable = true
                setTextColor(getColor(R.color.accent))
                contentDescription = "评为${i + 1}星"
                layoutParams = LinearLayout.LayoutParams(0, dp(48), 1f)
                setOnClickListener {
                    userData.setRating(gameId, i + 1)
                    refreshStars()
                    starViews.take(i + 1).forEachIndexed { index, star ->
                        UiMotion.pop(star, index * 45L)
                    }
                }
            }
            starViews.add(tv)
            starsRow.addView(tv)
        }
        refreshStars()

        // 6 个快捷印象标签（分 2 行 × 3 列展示）
        val tagsContainer = findViewById<LinearLayout>(R.id.review_tags_container)
        tagsContainer.removeAllViews()
        tagChipViews.clear()
        fun styleTagChip(tv: TextView, selected: Boolean) {
            tv.setBackgroundResource(if (selected) R.drawable.pill_action else R.drawable.pill_secondary)
            tv.setTextColor(getColor(if (selected) R.color.coin_ink else R.color.text_primary))
            tv.isSelected = selected
        }
        ReviewApi.PRESET_TAGS.chunked(3).forEachIndexed { rowIdx, rowTags ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { if (rowIdx > 0) topMargin = dp(8) }
            }
            rowTags.forEachIndexed { colIdx, tag ->
                val tv = TextView(this).apply {
                    text = tag
                    textSize = 12.5f
                    gravity = Gravity.CENTER
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    minHeight = dp(38)
                    setPadding(dp(8), dp(6), dp(8), dp(8))
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                        if (colIdx > 0) marginStart = dp(8)
                    }
                    setOnClickListener {
                        if (tag in selectedTags) {
                            selectedTags.remove(tag)
                        } else if (selectedTags.size >= 3) {
                            Toast.makeText(this@GameDetailActivity, "最多选择 3 个印象标签", Toast.LENGTH_SHORT).show()
                            return@setOnClickListener
                        } else {
                            selectedTags.add(tag)
                        }
                        styleTagChip(this, tag in selectedTags)
                        UiMotion.pop(this)
                    }
                }
                styleTagChip(tv, tag in selectedTags)
                tagChipViews[tag] = tv
                row.addView(tv)
            }
            tagsContainer.addView(row)
        }

        btnSubmit.setOnClickListener {
            val rating = userData.getRating(gameId)
            if (rating <= 0) {
                Toast.makeText(this, "请先点击星星评分", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val comment = commentInput.text?.toString().orEmpty().trim()
            val tags = selectedTags.toList()
            btnSubmit.isEnabled = false
            btnSubmit.text = "正在提交…"
            lifecycleScope.launch(Dispatchers.IO) {
                val synced = ReviewSync.submit(this@GameDetailActivity, gameId, rating, tags, comment)
                withContext(Dispatchers.Main) {
                    btnSubmit.isEnabled = true
                    btnSubmit.text = getString(R.string.reviews_submit)
                    Toast.makeText(
                        this@GameDetailActivity,
                        if (synced) "评价已发布，感谢分享！" else "已保存到本机（联网后可同步全服）",
                        Toast.LENGTH_SHORT
                    ).show()
                    bindCloudReviews(gameId)
                }
            }
        }
    }

    private fun bindCloudReviews(gameId: String) {
        // 先用缓存快速刷新快捷事实条
        val cached = ReviewSync.cachedSummaryOf(gameId)
        val localRating = userData.getRating(gameId)
        val factRating = findViewById<TextView>(R.id.detail_fact_rating)
        val factRatingSub = findViewById<TextView>(R.id.detail_fact_rating_sub)
        if (cached != null && cached.count > 0) {
            factRating.text = String.format("★ %.1f", cached.avgRating)
            factRatingSub.text = "${cached.count} 人评分"
        } else if (localRating > 0) {
            factRating.text = "★ $localRating.0"
            factRatingSub.text = "你的评分"
        }

        lifecycleScope.launch(Dispatchers.IO) {
            val payload = ReviewSync.fetchDetail(gameId)
            withContext(Dispatchers.Main) {
                if (isFinishing || isDestroyed) return@withContext
                val summary = payload.summary
                val badgeTv = findViewById<TextView>(R.id.review_summary_badge)
                if (summary != null && summary.count > 0) {
                    val avgText = String.format("★ %.1f", summary.avgRating)
                    factRating.text = avgText
                    factRatingSub.text = "${summary.count} 人评价"
                    badgeTv.text = "$avgText · ${summary.count}人"
                    renderTopTags(summary.topTags)
                } else {
                    badgeTv.text = if (localRating > 0) "你的评分 ★$localRating" else ""
                    findViewById<View>(R.id.review_top_tags_scroll).visibility = View.GONE
                }
                renderReviewList(payload.reviews)
            }
        }
    }

    private fun renderTopTags(topTags: List<ReviewApi.TagCount>) {
        val scroll = findViewById<View>(R.id.review_top_tags_scroll)
        val row = findViewById<LinearLayout>(R.id.review_top_tags_row)
        row.removeAllViews()
        if (topTags.isEmpty()) {
            scroll.visibility = View.GONE
            return
        }
        scroll.visibility = View.VISIBLE
        for (tc in topTags) {
            val pill = TextView(this).apply {
                text = "${tc.tag} · ${tc.count}"
                textSize = 12f
                setTextColor(getColor(R.color.cyan))
                setTypeface(null, android.graphics.Typeface.BOLD)
                setBackgroundResource(R.drawable.pill_secondary)
                setPadding(dp(11), dp(5), dp(11), dp(6))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { marginEnd = dp(8) }
            }
            row.addView(pill)
        }
    }

    private fun renderReviewList(reviews: List<ReviewApi.ReviewItem>) {
        val container = findViewById<LinearLayout>(R.id.reviews_list_container)
        val emptyTv = findViewById<TextView>(R.id.reviews_empty_text)
        container.removeAllViews()
        if (reviews.isEmpty()) {
            emptyTv.visibility = View.VISIBLE
            return
        }
        emptyTv.visibility = View.GONE
        for (item in reviews.take(10)) {
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(12), dp(10), dp(12), dp(10))
                setBackgroundResource(R.drawable.pill_secondary)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = dp(8) }
            }
            val header = TextView(this).apply {
                val stars = "★".repeat(item.rating) + "☆".repeat(5 - item.rating)
                text = "${item.nickname}   $stars"
                textSize = 12.5f
                setTypeface(null, android.graphics.Typeface.BOLD)
                setTextColor(getColor(R.color.accent))
            }
            card.addView(header)
            if (item.tags.isNotEmpty()) {
                val tagsTv = TextView(this).apply {
                    text = item.tags.joinToString(" · ") { "#$it" }
                    textSize = 11.5f
                    setTextColor(getColor(R.color.mint))
                    setPadding(0, dp(3), 0, 0)
                }
                card.addView(tagsTv)
            }
            if (item.comment.isNotBlank()) {
                val body = TextView(this).apply {
                    text = item.comment
                    textSize = 13.5f
                    setTextColor(getColor(R.color.text_primary))
                    setPadding(0, dp(4), 0, 0)
                }
                card.addView(body)
            }
            container.addView(card)
        }
    }

    private fun bindSimilarGames(current: RemoteGame) {
        val section = findViewById<View>(R.id.similar_section)
        val recycler = findViewById<RecyclerView>(R.id.similar_recycler)
        val snapshot = MainActivity.allGamesSnapshot
        val similar = HomeRecommend.pickSimilar(
            targetId = current.id,
            targetCategory = current.category,
            targetStudio = current.displayStudio(),
            items = snapshot,
            limit = 6
        )
        if (similar.isEmpty()) {
            section.visibility = View.GONE
            return
        }
        section.visibility = View.VISIBLE
        recycler.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        val adapter = FeaturedAdapter(
            onClick = { item ->
                if (!MainActivity.gameCache.containsKey(item.id)) {
                    MainActivity.gameCache[item.id] = item.remote ?: RemoteGame(
                        id = item.id, name = item.name, desc = item.desc,
                        version = item.installedVersion, icon = item.icon, color = item.color,
                        category = item.category, url = "", size = 0, premium = item.isPremium,
                        studio = item.studio
                    )
                }
                startActivity(Intent(this, GameDetailActivity::class.java).apply {
                    putExtra("game_id", item.id)
                })
            },
            kickerOf = { g -> if (g.category == current.category) "同品类" else g.category }
        )
        recycler.adapter = adapter
        adapter.submit(similar)
    }

    override fun onResume() {
        super.onResume()
        if (::game.isInitialized) {
            refreshBestScore(game.id)
            if (lbLoadedOnce) bindLeaderboard(game.id)
            bindCloudReviews(game.id)
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun bindLeaderboard(gameId: String) {
        val panel = findViewById<LinearLayout>(R.id.leaderboard_panel)
        val listTv = findViewById<TextView>(R.id.leaderboard_list)
        val statusTv = findViewById<TextView>(R.id.leaderboard_status)
        val myTv = findViewById<TextView>(R.id.leaderboard_mine)
        if (!BuildConfig.ONLINE_CATALOG) {
            panel.visibility = View.GONE
            return
        }
        if (lbLoading) return
        lbLoading = true
        panel.visibility = View.VISIBLE
        panel.setOnClickListener(null)
        statusTv.text = getString(R.string.leaderboard_loading)
        listTv.text = ""
        myTv.text = ""
        lifecycleScope.launch(Dispatchers.IO) {
            val res = LeaderboardSync.fetchTopResult(this@GameDetailActivity, gameId, 10)
            val mine = if (res.ok) LeaderboardSync.fetchMyRank(this@GameDetailActivity, gameId) else null
            withContext(Dispatchers.Main) {
                lbLoading = false
                lbLoadedOnce = true
                if (!res.ok) {
                    statusTv.text = getString(R.string.leaderboard_error)
                    listTv.text = ""
                    panel.setOnClickListener { bindLeaderboard(gameId) }
                } else if (res.entries.isEmpty()) {
                    statusTv.text = getString(R.string.leaderboard_empty)
                    listTv.text = ""
                } else {
                    statusTv.text = "🏆 " + getString(R.string.leaderboard_title)
                    listTv.text = res.entries.joinToString("\n") { e ->
                        val medal = when (e.rank.toInt()) {
                            1 -> "🥇"
                            2 -> "🥈"
                            3 -> "🥉"
                            else -> "${e.rank}."
                        }
                        "$medal  ${e.nickname}  ·  ${e.score}"
                    }
                }
                myTv.text = when {
                    mine == null -> ""
                    !mine.ranked -> getString(R.string.leaderboard_not_ranked)
                    else -> getString(R.string.leaderboard_my_rank, mine.rank, mine.score)
                }
            }
        }
    }

    private fun formatSize(bytes: Long): String = when {
        bytes <= 0 -> "未知大小"
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "%.1f KB".format(bytes / 1024.0)
        else -> "%.1f MB".format(bytes / 1024.0 / 1024.0)
    }
}
