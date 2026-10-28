package com.game100.center

import android.annotation.SuppressLint
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.drawable.RippleDrawable
import android.view.Gravity
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.drawable.DrawableCompat
import androidx.core.widget.NestedScrollView
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.game100.center.data.GameRepository
import com.game100.center.model.GameItem
import com.game100.center.model.RemoteGame
import com.game100.center.model.Studio
import com.game100.center.net.AppUpdater
import com.game100.center.net.GameDownloader
import com.game100.center.ui.FeaturedAdapter
import com.game100.center.ui.GameRowAdapter
import com.game100.center.ui.StudioUi
import com.game100.center.ui.UiMotion
import com.game100.center.util.ZipUtils
import com.google.android.material.appbar.MaterialToolbar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class MainActivity : AppCompatActivity() {

    companion object {
        /** 游戏详情页用的缓存：id -> RemoteGame */
        val gameCache = mutableMapOf<String, RemoteGame>()
    }

    private lateinit var repo: GameRepository
    private lateinit var adapter: GameRowAdapter
    private lateinit var featAdapter: FeaturedAdapter
    private lateinit var newAdapter: FeaturedAdapter
    private lateinit var swipe: SwipeRefreshLayout

    private val categories = listOf(
        "全部", "精品", "新上架",
        "科学实验", "经典重温", "射击", "跑酷跳跃", "塔防策略", "卡牌构筑",
        "棋牌对战", "消除合成", "益智解谜", "休闲模拟", "街机动作", "节奏音乐", "金融益智"
    )
    private var selectedCat = "全部"
    private var searchQuery = ""
    private var allItems: List<GameItem> = emptyList()
    private var lastRemote: List<RemoteGame> = emptyList()
    private val chipViews = mutableListOf<TextView>()
    /** 出品方筛选：null = 全部 */
    private var selectedStudio: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        // 滚动容器自己不要拿焦点：它一旦是焦点，列表里新出现的卡片会被系统自动塞进焦点（键盘/手柄模式），
        // 换筛选时卡片被回收，NestedScrollView 重新布局就会崩（parameter must be a descendant of this view）。
        findViewById<View>(R.id.home_scroll).isFocusable = false
        repo = GameRepository(this)
        selectedCat = savedInstanceState?.getString("selectedCat") ?: "全部"
        searchQuery = savedInstanceState?.getString("searchQuery") ?: ""
        selectedStudio = savedInstanceState?.getString("selectedStudio")
        // 从详情页点出品方跳过来：只看该出品方
        intent.getStringExtra("studio_filter")?.let { s ->
            intent.removeExtra("studio_filter")
            selectedStudio = Studio.canonical(s).ifEmpty { null }
        }

        // 兼容旧入口：按关键词搜索
        intent.getStringExtra("search_query")?.let { q ->
            intent.removeExtra("search_query")
            searchQuery = q
        }

        // 从详情页返回的下载请求
        intent.getStringExtra("download_game_id")?.let { gid ->
            intent.removeExtra("download_game_id")
            // 延迟到列表加载完成后触发下载
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                allItems.find { it.id == gid }?.let { item ->
                    if (item.canDownload) downloadGame(item)
                }
            }, 1500)
        }

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        toolbar.menu.findItem(R.id.action_refresh)?.icon?.let {
            DrawableCompat.setTint(it, getColor(R.color.text_primary))
        }
        toolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_refresh -> {
                    refreshRemote(silent = false)
                    true
                }
                R.id.action_settings -> {
                    startActivity(Intent(this, SettingsActivity::class.java))
                    true
                }
                else -> false
            }
        }

        val recycler = findViewById<RecyclerView>(R.id.recycler)
        // 皮肤 B：3 列糖果卡片网格（窄屏 <340dp 退回 2 列）
        val spans = if (resources.configuration.screenWidthDp < 340) 2 else 3
        recycler.layoutManager = androidx.recyclerview.widget.GridLayoutManager(this, spans)
        adapter = GameRowAdapter(
            onClick = { onGameClick(it) },
            onAction = { onGameAction(it) },
            onLongClick = { onGameLongClick(it) }
        )
        recycler.adapter = adapter

        val featRecycler = findViewById<RecyclerView>(R.id.feat_recycler)
        featRecycler.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        featAdapter = FeaturedAdapter(onClick = { onGameClick(it) })
        featRecycler.adapter = featAdapter

        val newRecycler = findViewById<RecyclerView>(R.id.new_recycler)
        newRecycler.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        newAdapter = FeaturedAdapter(onClick = { onGameClick(it) })
        newRecycler.adapter = newAdapter
        findViewById<View>(R.id.btn_more_new).setOnClickListener {
            selectCategory("新上架")
            findViewById<NestedScrollView>(R.id.home_scroll).post {
                val title = findViewById<View>(R.id.tv_games_title)
                findViewById<NestedScrollView>(R.id.home_scroll).smoothScrollTo(
                    0, title.top + (title.parent as View).top
                )
            }
        }
        UiMotion.press(findViewById(R.id.btn_more_new))

        swipe = findViewById(R.id.swipe)
        swipe.setColorSchemeResources(R.color.pink, R.color.coin, R.color.cyan)
        swipe.setProgressBackgroundColorSchemeResource(R.color.bg_secondary)
        swipe.setOnRefreshListener { refreshRemote(silent = false) }

        buildCategoryChips()
        UiMotion.enterPage(findViewById(R.id.swipe))
        UiMotion.press(findViewById(R.id.btn_reset_filters))

        val searchBar = findViewById<android.widget.EditText>(R.id.search_bar)
        searchBar.setText(searchQuery)
        findViewById<View>(R.id.btn_more_featured).setOnClickListener {
            selectCategory(if (allItems.any { it.isPremium }) "精品" else "新上架")
            findViewById<NestedScrollView>(R.id.home_scroll).post {
                val title = findViewById<View>(R.id.tv_games_title)
                findViewById<NestedScrollView>(R.id.home_scroll).smoothScrollTo(
                    0, title.top + (title.parent as View).top
                )
            }
        }
        UiMotion.press(findViewById(R.id.science_banner))
        UiMotion.press(findViewById(R.id.btn_more_featured))
        // 科学实验入口与首页内容一起滚动。
        findViewById<View>(R.id.science_banner).setOnClickListener {
            startActivity(Intent(this, ScienceLabActivity::class.java))
        }
        findViewById<View>(R.id.btn_reset_filters).setOnClickListener {
            selectedCat = "全部"
            selectedStudio = null
            searchBar.text.clear()
            refreshChips()
            buildStudioChips()
            applyFilter()
        }
        searchBar.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                searchQuery = s?.toString() ?: ""
                applyFilter()
            }
        })

        loadLocal()
        checkAppUpdate()
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    private fun buildCategoryChips() {
        val row = findViewById<LinearLayout>(R.id.cat_row)
        row.removeAllViews()
        chipViews.clear()
        for (cat in categories) {
            val tv = TextView(this).apply {
                text = (chipEmoji[cat]?.let { "$it " } ?: "") + cat
                textSize = 13.5f
                minHeight = dp(44)
                gravity = Gravity.CENTER
                isFocusable = true
                setPadding(dp(15), dp(9), dp(15), dp(13))
                setOnClickListener { selectCategory(cat) }
            }
            UiMotion.press(tv)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.marginEnd = dp(8)
            row.addView(tv, lp)
            chipViews.add(tv)
        }
        refreshChips()
    }

    private val chipEmoji = mapOf(
        "精品" to "🔥", "新上架" to "✨",
        "科学实验" to "🔬", "经典重温" to "👾", "射击" to "🎯", "跑酷跳跃" to "🏃",
        "塔防策略" to "🏰", "卡牌构筑" to "🃏", "棋牌对战" to "♟️", "消除合成" to "💎",
        "益智解谜" to "🧩", "休闲模拟" to "🎈", "街机动作" to "🕹️", "节奏音乐" to "🎵",
        "金融益智" to "📈"
    )

    /** 分类胶囊（皮肤 B）：选中 = 金币立体按钮，未选 = 玻璃胶囊。 */
    private fun chipBg(selected: Boolean): android.graphics.drawable.Drawable {
        val r = dp(22).toFloat()
        return if (selected) {
            val ledge = GradientDrawable().apply { setColor(getColor(R.color.coin_edge)); cornerRadius = r }
            val face = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(
                getColor(R.color.coin_hi), getColor(R.color.coin), getColor(R.color.coin_lo))).apply {
                cornerRadius = r; setStroke(dp(1), getColor(R.color.coin_line))
            }
            android.graphics.drawable.LayerDrawable(arrayOf(ledge, face)).apply {
                setLayerInset(0, 0, dp(3), 0, 0); setLayerInset(1, 0, 0, 0, dp(4))
            }
        } else {
            val ledge = GradientDrawable().apply { setColor(getColor(R.color.ledge)); cornerRadius = r }
            val face = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(
                getColor(R.color.glass_top), getColor(R.color.glass_bottom))).apply {
                cornerRadius = r; setStroke(dp(1), getColor(R.color.glass_line))
            }
            android.graphics.drawable.LayerDrawable(arrayOf(ledge, face)).apply {
                setLayerInset(0, 0, dp(3), 0, 0); setLayerInset(1, 0, 0, 0, dp(3))
            }
        }
    }

    /** 出品方筛选栏：全部 + 每个出品方（带数量），选中态用出品方自己的颜色 */
    private fun buildStudioChips() {
        val row = findViewById<LinearLayout>(R.id.studio_row)
        while (row.childCount > 1) row.removeViewAt(1)  // 第 0 个是“出品方”标签
        val entries: List<Pair<String?, Int>> = listOf<Pair<String?, Int>>(null to allItems.size) + Studio.counts(allItems)
        for ((studio, count) in entries) {
            val tv = TextView(this).apply {
                isFocusable = true
                StudioUi.styleFilterChip(this, studio, count, selected = studio == selectedStudio)
                setOnClickListener { selectStudio(studio) }
            }
            UiMotion.press(tv)
            row.addView(tv, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { marginEnd = dp(8) })
        }
        // 只有一个出品方时没必要显示筛选栏
        findViewById<View>(R.id.studio_scroll).visibility = if (entries.size > 2) View.VISIBLE else View.GONE
    }

    /**
     * 选择出品方。注意：不能在 TextView(...).apply { } 里直接写 findViewById ——
     * 那里的 this 是胶囊自己，会在胶囊内部找 R.id.recycler 得到 null（v4.13 点出品方胶囊闪退的原因）。
     */
    private fun selectStudio(studio: String?) {
        if (selectedStudio == studio) return
        selectedStudio = studio
        buildStudioChips()
        applyFilter()
        findViewById<View?>(R.id.recycler)?.let { UiMotion.enter(it) }
    }

    private fun refreshChips() {
        for (i in categories.indices) {
            val sel = categories[i] == selectedCat
            chipViews[i].background = RippleDrawable(
                ColorStateList.valueOf(getColor(R.color.ripple)), chipBg(sel), null
            )
            chipViews[i].isSelected = sel
            chipViews[i].setTextColor(getColor(if (sel) R.color.coin_ink else R.color.text_primary))
            chipViews[i].setTypeface(null, if (sel) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
        }
    }

    private fun selectCategory(cat: String) {
        if (selectedCat == cat) return
        selectedCat = cat
        refreshChips()
        applyFilter()
        UiMotion.pop(chipViews[categories.indexOf(cat)])
        UiMotion.enter(findViewById(R.id.recycler))
        UiMotion.enter(findViewById(R.id.empty_state))
    }

    /** 筛选出错时（不应发生）不闪退：显示空状态，提示用户点“查看全部游戏” */
    private fun applyFilter() {
        try {
            releaseListFocus()
            applyFilterUnsafe()
        } catch (e: Exception) {
            android.util.Log.e("Game100", "筛选失败，已显示空状态", e)
            runCatching {
                adapter.submit(emptyList())
                findViewById<View>(R.id.recycler).visibility = View.GONE
                findViewById<View>(R.id.empty_state).visibility = View.VISIBLE
                findViewById<TextView>(R.id.tv_empty).text = "列表暂时出了点问题\n点“查看全部游戏”再试一次。"
                findViewById<View>(R.id.btn_reset_filters).visibility = View.VISIBLE
            }
        }
    }

    /**
     * 列表即将整体换内容：如果焦点在某张游戏卡片上（键盘/手柄/无障碍导航时会这样），先把焦点移走。
     * 否则卡片被回收后 NestedScrollView 重新布局时会拿着“已经不在列表里的焦点卡片”去算位置，
     * 抛 “parameter must be a descendant of this view”。
     */
    private fun releaseListFocus() {
        val rv = findViewById<View?>(R.id.recycler) ?: return
        if (!rv.hasFocus()) return
        val target = chipViews.getOrNull(categories.indexOf(selectedCat))
        if (target == null || !target.requestFocus()) rv.findFocus()?.clearFocus()
    }

    private fun applyFilterUnsafe() {
        var filtered = when (selectedCat) {
            "全部" -> allItems
            "精品" -> allItems.filter { it.isPremium }.sortedWith(::featuredOrder)
            "新上架" -> allItems.filter { it.isNew }
            else -> allItems.filter { it.category == selectedCat }
        }
        filtered = Studio.filter(filtered, selectedStudio)
        if (searchQuery.isNotBlank()) {
            val q = searchQuery.trim()
            filtered = filtered.filter {
                it.name.contains(q, ignoreCase = true) ||
                it.desc.contains(q, ignoreCase = true) ||
                it.id.contains(q, ignoreCase = true) ||
                it.studio.contains(q, ignoreCase = true)
            }
        }
        adapter.submit(filtered)
        findViewById<TextView>(R.id.tv_games_title).text = when {
            searchQuery.isNotBlank() -> "搜索结果"
            selectedStudio != null && selectedCat == "全部" -> "$selectedStudio 出品"
            selectedCat == "全部" -> "全部游戏"
            else -> selectedCat
        }
        findViewById<TextView>(R.id.tv_result_count).text = getString(R.string.game_count, filtered.size)
        findViewById<View>(R.id.empty_state).visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        findViewById<View>(R.id.recycler).visibility = if (filtered.isEmpty()) View.GONE else View.VISIBLE
        val hasFilter = selectedCat != "全部" || searchQuery.isNotBlank() || selectedStudio != null
        findViewById<TextView>(R.id.tv_empty).text = if (hasFilter)
            "没有找到相关游戏\n换个关键词，或试试其他分类。"
        else "游戏库暂时为空\n下拉刷新，获取最新游戏。"
        findViewById<View>(R.id.btn_reset_filters).visibility = if (hasFilter) View.VISIBLE else View.GONE
        refreshFeatured()
    }

    private fun showItems(items: List<GameItem>) {
        allItems = items
        val scienceCount = items.count { it.category == "科学实验" }
        findViewById<TextView>(R.id.science_summary).text = if (scienceCount > 0)
            "$scienceCount 个实验 · 物理 / 化学 / 生物"
        else "物理 / 化学 / 生物"
        findViewById<TextView>(R.id.tv_subtitle).text =
            getString(R.string.subtitle_games, items.size)
        // 当前筛选的出品方已不存在时回到全部
        if (selectedStudio != null && Studio.counts(items).none { it.first == selectedStudio }) selectedStudio = null
        buildStudioChips()
        applyFilter()
    }

    /** 推荐位：有 featured 序号的按 1…N（最新在前），其余按名称。 */
    private fun featuredOrder(a: GameItem, b: GameItem): Int {
        val ar = if (a.featuredRank > 0) a.featuredRank else Int.MAX_VALUE
        val br = if (b.featuredRank > 0) b.featuredRank else Int.MAX_VALUE
        if (ar != br) return ar - br
        return a.name.compareTo(b.name)
    }

    private fun refreshFeatured() {
        // Keep discovery out of the way while the user searches or browses a category.
        val showFeatured = selectedCat == "全部" && searchQuery.isBlank() && selectedStudio == null
        val featGames = (allItems.filter { it.isPremium } + allItems.filter { it.isNew && !it.isPremium })
            .distinctBy { it.id }
            .sortedWith(::featuredOrder)
            .take(8)
        findViewById<View>(R.id.science_banner).visibility = if (showFeatured) View.VISIBLE else View.GONE
        val featHeader = findViewById<View>(R.id.feat_section_header)
        val featTitle = findViewById<TextView>(R.id.feat_title)
        val featRecycler = findViewById<RecyclerView>(R.id.feat_recycler)
        if (showFeatured && featGames.isNotEmpty()) {
            featHeader.visibility = View.VISIBLE
            featTitle.text = if (allItems.any { it.isPremium }) "精选推荐" else "新鲜上架"
            featRecycler.visibility = View.VISIBLE
            featAdapter.submit(featGames)
        } else {
            featHeader.visibility = View.GONE
            featRecycler.visibility = View.GONE
        }
        // 「新游戏」专区：横向滚动，数据 = isNew（升级带来的新增也会标 isNew）
        val newHeader = findViewById<View>(R.id.new_section_header)
        val newRecycler = findViewById<RecyclerView>(R.id.new_recycler)
        val newGames = allItems.filter { it.isNew }
            .sortedWith(::featuredOrder)
            .take(20)
        if (showFeatured && newGames.isNotEmpty()) {
            newHeader.visibility = View.VISIBLE
            newRecycler.visibility = View.VISIBLE
            newAdapter.submit(newGames)
        } else {
            newHeader.visibility = View.GONE
            newRecycler.visibility = View.GONE
        }
    }

    // ---------- App 自升级 ----------

    private fun checkAppUpdate() {
        if (!AppUpdater.shouldCheck(this)) return
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val info = AppUpdater.fetchInfo() ?: return@launch
                AppUpdater.markChecked(this@MainActivity)
                if (!AppUpdater.hasUpdate(info)) return@launch
                withContext(Dispatchers.Main) { AppUpdater.showUpdateFlow(this@MainActivity, info) }
            } catch (e: Exception) {
                // 检查失败静默，下次启动再试
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // 从游戏/设置页返回时：先确保内置游戏存在（设置页"清除"后需要恢复），
        // 再用上次的远端列表重建，保留分类选择与列表内容
        refreshChips()
        lifecycleScope.launch(Dispatchers.IO) {
            repo.ensureBundledGames(BuildConfig.VERSION_CODE)
            val items = repo.buildGameList(lastRemote)
            withContext(Dispatchers.Main) { showItems(items) }
        }
    }

    /** 详情页点“出品方”回到首页（CLEAR_TOP + SINGLE_TOP）：只看该出品方的全部游戏 */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val s = intent.getStringExtra("studio_filter") ?: return
        selectedStudio = Studio.canonical(s).ifEmpty { null }
        selectedCat = "全部"
        searchQuery = ""
        findViewById<android.widget.EditText>(R.id.search_bar).text.clear()
        refreshChips()
        buildStudioChips()
        applyFilter()
        findViewById<NestedScrollView>(R.id.home_scroll).post {
            val title = findViewById<View>(R.id.tv_games_title)
            findViewById<NestedScrollView>(R.id.home_scroll).smoothScrollTo(0, title.top + (title.parent as View).top)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("selectedCat", selectedCat)
        outState.putString("searchQuery", searchQuery)
        outState.putString("selectedStudio", selectedStudio)
    }

    private fun loadLocal() {
        lifecycleScope.launch(Dispatchers.IO) {
            repo.ensureBundledGames(BuildConfig.VERSION_CODE)
            val items = repo.buildGameList(emptyList())
            withContext(Dispatchers.Main) {
                showItems(items)
            }
            // 静默同步一次远端
            val remote = try {
                repo.fetchRemote()
            } catch (e: Exception) {
                null
            }
            if (remote != null && remote.isNotEmpty()) {
                lastRemote = remote
                remote.forEach { gameCache[it.id] = it }
                repo.updateSeenGames(remote)
                val merged = repo.buildGameList(remote)
                withContext(Dispatchers.Main) { showItems(merged) }
            }
        }
    }

    private fun refreshRemote(silent: Boolean) {
        if (!silent) swipe.isRefreshing = true
        lifecycleScope.launch(Dispatchers.IO) {
            val remote = try {
                repo.fetchRemote()
            } catch (e: Exception) {
                null
            }
            if (remote != null) {
                lastRemote = remote
                repo.updateSeenGames(remote)
            }
            val items = repo.buildGameList(remote ?: lastRemote)
            withContext(Dispatchers.Main) {
                swipe.isRefreshing = false
                showItems(items)
                if (!silent && BuildConfig.ONLINE_CATALOG) {
                    if (remote == null) {
                        toast(getString(R.string.source_sync_failed))
                    } else {
                        toast(getString(R.string.source_synced, remote.size))
                    }
                }
            }
        }
    }

    private fun onGameClick(item: GameItem) {
        when {
            item.hasUpdate -> {
                AlertDialog.Builder(this)
                    .setMessage(getString(R.string.update_or_play, item.name, item.installedVersion, item.remote!!.version))
                    .setPositiveButton(R.string.update_now) { _, _ -> downloadGame(item) }
                    .setNegativeButton(R.string.play_now) { _, _ -> openGame(item.id) }
                    .show()
            }
            item.installed -> openGame(item.id)
            item.canDownload -> downloadGame(item)
            else -> toast(item.desc.ifBlank { getString(R.string.not_installed) })
        }
    }

    /** 列表右侧动作按钮：更新/下载/开始，直接执行不弹窗 */
    private fun onGameAction(item: GameItem) {
        when {
            item.hasUpdate -> downloadGame(item)
            item.canDownload -> downloadGame(item)
            item.installed -> openGame(item.id)
            else -> toast(item.desc.ifBlank { getString(R.string.not_installed) })
        }
    }

    private fun onGameLongClick(item: GameItem) {
        if (!item.installed) return
        AlertDialog.Builder(this)
            .setTitle(R.string.confirm_delete_title)
            .setMessage(getString(R.string.confirm_delete_msg, item.name))
            .setPositiveButton(R.string.delete) { _, _ ->
                lifecycleScope.launch(Dispatchers.IO) {
                    repo.deleteGame(item.id)
                    val items = repo.buildGameList(lastRemote)
                    withContext(Dispatchers.Main) { showItems(items) }
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun openGame(id: String) {
        // 确保详情页能拿到数据：先从缓存找，找不到从 allItems 构造
        if (!gameCache.containsKey(id)) {
            allItems.find { it.id == id }?.let { item ->
                val rg = item.remote ?: RemoteGame(
                    id = item.id, name = item.name, desc = item.desc,
                    version = item.installedVersion, icon = item.icon, color = item.color,
                    category = item.category, url = "", size = 0, premium = item.isPremium,
                    studio = item.studio
                )
                gameCache[id] = rg
            }
        }
        val intent = Intent(this, GameDetailActivity::class.java)
        intent.putExtra("game_id", id)
        startActivity(intent)
    }

    private fun formatSize(bytes: Long): String {
        return when {
            bytes >= 1024 * 1024 -> String.format("%.1fMB", bytes / (1024.0 * 1024.0))
            bytes >= 1024 -> String.format("%.0fKB", bytes / 1024.0)
            else -> "$bytes B"
        }
    }

    @SuppressLint("InflateParams")
    private fun downloadGame(item: GameItem) {
        val remote = item.remote ?: return
        val zip = File(repo.downloadDir, "${item.id}.zip")
        if (GameDownloader.isDownloading(zip.absolutePath)) {
            toast("${item.name} 正在下载中")
            return
        }
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_download, null)
        val progressBar = dialogView.findViewById<ProgressBar>(R.id.dl_progress)
        val progressText = dialogView.findViewById<TextView>(R.id.dl_text)
        val statusText = dialogView.findViewById<TextView>(R.id.dl_status)
        val cancelled = java.util.concurrent.atomic.AtomicBoolean(false)
        val dialog = AlertDialog.Builder(this)
            .setTitle("${getString(R.string.downloading)} ${item.name}")
            .setView(dialogView)
            .setCancelable(false)
            .setNegativeButton(R.string.cancel) { _, _ -> cancelled.set(true) }
            .create()
        dialog.show()

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val totalSize = remote.size
                GameDownloader.download(
                    remote.url, zip, expectedSize = totalSize,
                    cancelled = { cancelled.get() },
                    onStatus = { msg -> launch(Dispatchers.Main) { statusText.text = msg } },
                ) { p ->
                    launch(Dispatchers.Main) {
                        progressBar.progress = p
                        // 显示 MB 进度：1.2MB / 3.5MB (34%)
                        val text = if (totalSize > 0) {
                            val done = p * totalSize / 100
                            "${formatSize(done)} / ${formatSize(totalSize)} ($p%)"
                        } else {
                            "$p%"
                        }
                        progressText.text = text
                    }
                }
                // 先解压到临时目录并校验，成功后再替换旧版本（失败不会弄坏已安装的游戏）
                val staging = File(repo.downloadDir, "${item.id}.staging")
                staging.deleteRecursively()
                zip.inputStream().use { ins -> ZipUtils.unzip(ins, staging) }
                if (!File(staging, "index.html").exists()) {
                    staging.deleteRecursively()
                    throw GameDownloader.DownloadException("游戏包损坏：缺少 index.html，请重试", null)
                }
                val dest = File(repo.gamesDir, item.id)
                val old = File(repo.downloadDir, "${item.id}.old")
                old.deleteRecursively()
                repo.gamesDir.mkdirs()
                if (dest.exists() && !dest.renameTo(old)) dest.deleteRecursively()
                if (!staging.renameTo(dest)) {
                    staging.copyRecursively(dest, overwrite = true)
                    staging.deleteRecursively()
                }
                old.deleteRecursively()
                zip.delete()
                val items = repo.buildGameList(listOf(remote))
                withContext(Dispatchers.Main) {
                    if (isFinishing || isDestroyed) return@withContext
                    dialog.dismiss()
                    adapter.submit(items)
                    toast(getString(R.string.download_done))
                    openGame(item.id)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    if (isFinishing || isDestroyed) return@withContext
                    dialog.dismiss()
                    if (e is GameDownloader.CancelledException) {
                        toast("已取消下载")
                        return@withContext
                    }
                    val msg = (e as? GameDownloader.DownloadException)?.userMessage
                        ?: getString(R.string.download_failed, e.message ?: "未知错误")
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("${item.name} 下载失败")
                        .setMessage(msg)
                        .setPositiveButton("重试") { _, _ -> downloadGame(item) }
                        .setNegativeButton(R.string.cancel, null)
                        .show()
                }
            }
        }
    }

    private fun toast(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }
}
