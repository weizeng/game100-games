package com.game100.center

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.view.Gravity
import com.game100.center.ui.GameAdapter
import com.game100.center.ui.UiMotion
import com.game100.center.ui.FavoriteBurst
import com.google.android.material.appbar.MaterialToolbar
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.game100.center.data.UserData
import com.game100.center.model.RemoteGame

/**
 * 游戏详情页：游戏信息、开始、收藏与个人评分。
 */
class GameDetailActivity : AppCompatActivity() {

    private lateinit var userData: UserData
    private lateinit var game: RemoteGame

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_game_detail)
        findViewById<MaterialToolbar>(R.id.detail_toolbar).setNavigationOnClickListener { finish() }

        userData = UserData(this)

        // 从 Intent 获取游戏信息
        val gameId = intent.getStringExtra("game_id") ?: run { finish(); return }
        // 简化：从 GameRepository 获取（实际应传完整对象或查缓存）
        // 这里通过 MainActivity 的静态缓存获取
        game = MainActivity.gameCache[gameId] ?: run { finish(); return }


        findViewById<TextView>(R.id.detail_icon).apply {
            text = game.icon
            background = GameAdapter.tileBackground(this@GameDetailActivity, game.color)
        }
        findViewById<TextView>(R.id.detail_name).text = game.name
        findViewById<TextView>(R.id.detail_category).text = game.category
        findViewById<TextView>(R.id.detail_size).text =
            if (game.size > 0) "${formatSize(game.size)}  ·  离线可玩" else "已下载到本机"
        findViewById<TextView>(R.id.detail_desc).text =
            game.desc.ifBlank { "暂无简介" }

        // 最高分
        val best = userData.getBestScore(gameId)
        if (best > 0) {
            findViewById<TextView>(R.id.detail_best_score).apply {
                visibility = android.view.View.VISIBLE
                text = "🏆 历史最高分：$best"
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

        // 星级评分
        val starsRow = findViewById<LinearLayout>(R.id.stars_row)
        val starViews = mutableListOf<TextView>()
        fun refreshStars() {
            val rating = userData.getRating(gameId)
            starViews.forEachIndexed { i, tv ->
                tv.text = if (i < rating) "★" else "☆"
                tv.isSelected = i < rating
            }
            findViewById<TextView>(R.id.detail_rating_text).text =
                if (rating > 0) "你的评分：$rating 星" else "点击星星评分"
        }
        repeat(5) { i ->
            val tv = TextView(this).apply {
                text = "☆"
                textSize = 30f
                gravity = Gravity.CENTER
                isFocusable = true
                setTextColor(getColor(R.color.accent))
                contentDescription = "评为${i + 1}星"
                layoutParams = LinearLayout.LayoutParams(0, dp(52), 1f)
                setOnClickListener {
                    userData.setRating(gameId, i + 1)
                    refreshStars()
                    starViews.take(i + 1).forEachIndexed { index, star ->
                        UiMotion.pop(star, index * 45L)
                    }
                    Toast.makeText(this@GameDetailActivity, "已评分 ${i + 1} 星", Toast.LENGTH_SHORT).show()
                }
            }
            starViews.add(tv)
            starsRow.addView(tv)
        }
        refreshStars()

        // 开始游戏
        findViewById<Button>(R.id.btn_play).setOnClickListener {
            val intent = Intent(this, GameActivity::class.java).apply {
                putExtra("game_id", game.id)
            }
            startActivity(intent)
        }
        val content = findViewById<android.view.ViewGroup>(android.R.id.content)
        UiMotion.bindButtons(content)
        UiMotion.enterPage(content)
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun formatSize(bytes: Long): String = when {
        bytes <= 0 -> "未知大小"
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "%.1f KB".format(bytes / 1024.0)
        else -> "%.1f MB".format(bytes / 1024.0 / 1024.0)
    }
}
