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
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.game100.center.data.GameRepository
import com.game100.center.model.GameItem
import com.game100.center.model.RemoteGame
import com.game100.center.net.AppUpdater
import com.game100.center.net.GameDownloader
import com.game100.center.ui.FeaturedAdapter
import com.game100.center.ui.GameRowAdapter
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
    private lateinit var swipe: SwipeRefreshLayout

    private val categories = listOf("全部", "精品", "科学实验", "街机动作", "益智解谜", "休闲趣味", "经典重温")
    private var selectedCat = "全部"
    private var searchQuery = ""
    private var allItems: List<GameItem> = emptyList()
    private var lastRemote: List<RemoteGame> = emptyList()
    private val chipViews = mutableListOf<TextView>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        repo = GameRepository(this)
        selectedCat = savedInstanceState?.getString("selectedCat") ?: "全部"
        searchQuery = savedInstanceState?.getString("searchQuery") ?: ""

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
        recycler.layoutManager = LinearLayoutManager(this)
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

        swipe = findViewById(R.id.swipe)
        swipe.setColorSchemeResources(R.color.brand, R.color.accent)
        swipe.setOnRefreshListener { refreshRemote(silent = false) }

        buildCategoryChips()
        UiMotion.enterPage(findViewById(R.id.swipe))
        UiMotion.press(findViewById(R.id.btn_reset_filters))

        val searchBar = findViewById<android.widget.EditText>(R.id.search_bar)
        searchBar.setText(searchQuery)
        // 🔬 科学实验室入口
        findViewById<View>(R.id.science_banner).setOnClickListener {
            startActivity(Intent(this, ScienceLabActivity::class.java))
        }
        findViewById<View>(R.id.btn_reset_filters).setOnClickListener {
            selectedCat = "全部"
            searchBar.text.clear()
            refreshChips()
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
                text = cat
                textSize = 13f
                minHeight = dp(44)
                gravity = Gravity.CENTER
                isFocusable = true
                setPadding(dp(16), dp(10), dp(16), dp(10))
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

    private fun chipBg(selected: Boolean): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(14).toFloat()
            setColor(getColor(if (selected) R.color.stage else R.color.bg_card))
            if (!selected) setStroke(dp(1), getColor(R.color.divider))
        }
    }

    private fun refreshChips() {
        for (i in categories.indices) {
            val sel = categories[i] == selectedCat
            chipViews[i].background = RippleDrawable(
                ColorStateList.valueOf(getColor(R.color.ripple)), chipBg(sel), null
            )
            chipViews[i].isSelected = sel
            chipViews[i].setTextColor(getColor(if (sel) android.R.color.white else R.color.text_secondary))
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

    private fun applyFilter() {
        var filtered = when (selectedCat) {
            "全部" -> allItems
            "精品" -> allItems.filter { it.isPremium }
            else -> allItems.filter { it.category == selectedCat }
        }
        if (searchQuery.isNotBlank()) {
            val q = searchQuery.trim()
            filtered = filtered.filter {
                it.name.contains(q, ignoreCase = true) ||
                it.desc.contains(q, ignoreCase = true) ||
                it.id.contains(q, ignoreCase = true)
            }
        }
        adapter.submit(filtered)
        findViewById<TextView>(R.id.tv_games_title).text = when {
            searchQuery.isNotBlank() -> "搜索结果"
            selectedCat == "全部" -> "全部游戏"
            else -> selectedCat
        }
        findViewById<TextView>(R.id.tv_result_count).text = getString(R.string.game_count, filtered.size)
        findViewById<View>(R.id.empty_state).visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        findViewById<View>(R.id.recycler).visibility = if (filtered.isEmpty()) View.GONE else View.VISIBLE
        val hasFilter = selectedCat != "全部" || searchQuery.isNotBlank()
        findViewById<TextView>(R.id.tv_empty).text = if (hasFilter)
            "没有找到相关游戏\n换个关键词，或试试其他分类。"
        else "游戏库暂时为空\n下拉刷新，获取最新游戏。"
        findViewById<View>(R.id.btn_reset_filters).visibility = if (hasFilter) View.VISIBLE else View.GONE
        refreshFeatured()
    }

    private fun showItems(items: List<GameItem>) {
        allItems = items
        findViewById<TextView>(R.id.tv_subtitle).text =
            getString(R.string.subtitle_games, items.size)
        applyFilter()
    }

    private fun refreshFeatured() {
        // Keep discovery out of the way while the user searches or browses a category.
        val showFeatured = selectedCat == "全部" && searchQuery.isBlank()
        val featGames = (allItems.filter { it.isPremium } + allItems.filter { it.isNew && !it.isPremium })
            .distinctBy { it.id }.take(8)
        val featTitle = findViewById<TextView>(R.id.feat_title)
        val featRecycler = findViewById<RecyclerView>(R.id.feat_recycler)
        if (showFeatured && featGames.isNotEmpty()) {
            featTitle.visibility = View.VISIBLE
            featTitle.text = if (allItems.any { it.isPremium }) "精选推荐" else "新鲜上架"
            featRecycler.visibility = View.VISIBLE
            featAdapter.submit(featGames)
        } else {
            featTitle.visibility = View.GONE
            featRecycler.visibility = View.GONE
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

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("selectedCat", selectedCat)
        outState.putString("searchQuery", searchQuery)
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
                if (!silent) {
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
                    category = item.category, url = "", size = 0, premium = item.isPremium
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
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_download, null)
        val progressBar = dialogView.findViewById<ProgressBar>(R.id.dl_progress)
        val progressText = dialogView.findViewById<TextView>(R.id.dl_text)
        val dialog = AlertDialog.Builder(this)
            .setTitle("${getString(R.string.downloading)} ${item.name}")
            .setView(dialogView)
            .setCancelable(false)
            .create()
        dialog.show()

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val tmp = File(repo.downloadDir, "${item.id}.zip.tmp")
                val totalSize = remote.size
                GameDownloader.download(remote.url, tmp) { p ->
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
                // 解压安装
                val dest = File(repo.gamesDir, item.id)
                if (dest.exists()) dest.deleteRecursively()
                tmp.inputStream().use { ins -> ZipUtils.unzip(ins, dest) }
                tmp.delete()
                // 校验
                if (!File(dest, "index.html").exists()) {
                    throw IllegalStateException("游戏包损坏：缺少 index.html")
                }
                val items = repo.buildGameList(listOf(remote))
                withContext(Dispatchers.Main) {
                    dialog.dismiss()
                    adapter.submit(items)
                    toast(getString(R.string.download_done))
                    openGame(item.id)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    dialog.dismiss()
                    toast(getString(R.string.download_failed, e.message ?: "未知错误"))
                }
            }
        }
    }

    private fun toast(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }
}
