package com.game100.center

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.drawable.DrawableCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.game100.center.data.GameRepository
import com.game100.center.model.GameItem
import com.game100.center.model.RemoteGame
import com.game100.center.net.AppUpdater
import com.game100.center.net.GameDownloader
import com.game100.center.ui.GameAdapter
import com.game100.center.util.ZipUtils
import com.google.android.material.appbar.MaterialToolbar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var repo: GameRepository
    private lateinit var adapter: GameAdapter
    private lateinit var swipe: SwipeRefreshLayout

    private val categories = listOf("全部", "街机动作", "益智解谜", "休闲趣味", "经典重温")
    private var selectedCat = "全部"
    private var allItems: List<GameItem> = emptyList()
    private var lastRemote: List<RemoteGame> = emptyList()
    private val chipViews = mutableListOf<TextView>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        repo = GameRepository(this)
        selectedCat = savedInstanceState?.getString("selectedCat") ?: "全部"

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
        recycler.layoutManager = GridLayoutManager(this, 3)
        adapter = GameAdapter(
            onClick = { onGameClick(it) },
            onLongClick = { onGameLongClick(it) }
        )
        recycler.adapter = adapter

        swipe = findViewById(R.id.swipe)
        swipe.setColorSchemeResources(R.color.brand, R.color.accent)
        swipe.setOnRefreshListener { refreshRemote(silent = false) }

        buildCategoryChips()
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
                setPadding(dp(14), dp(7), dp(14), dp(7))
                setOnClickListener { selectCategory(cat) }
            }
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
            cornerRadius = dp(20).toFloat()
            if (selected) {
                orientation = GradientDrawable.Orientation.TL_BR
                colors = intArrayOf(
                    Color.parseColor("#FF6F61"),
                    Color.parseColor("#FFB84D")
                )
            } else {
                setColor(getColor(R.color.bg_chip))
            }
        }
    }

    private fun refreshChips() {
        for (i in categories.indices) {
            val sel = categories[i] == selectedCat
            chipViews[i].background = chipBg(sel)
            chipViews[i].setTextColor(getColor(if (sel) android.R.color.white else R.color.text_secondary))
            chipViews[i].setTypeface(null, if (sel) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
        }
    }

    private fun selectCategory(cat: String) {
        selectedCat = cat
        refreshChips()
        applyFilter()
    }

    private fun applyFilter() {
        adapter.submit(if (selectedCat == "全部") allItems else allItems.filter { it.category == selectedCat })
    }

    private fun showItems(items: List<GameItem>) {
        allItems = items
        applyFilter()
        findViewById<TextView>(R.id.tv_subtitle).text =
            getString(R.string.subtitle_games, items.size)
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
            if (remote != null) lastRemote = remote
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

    private fun onGameLongClick(item: GameItem) {
        if (!item.installed) return
        AlertDialog.Builder(this)
            .setTitle(R.string.confirm_delete_title)
            .setMessage(getString(R.string.confirm_delete_msg, item.name))
            .setPositiveButton(R.string.delete) { _, _ ->
                lifecycleScope.launch(Dispatchers.IO) {
                    repo.deleteGame(item.id)
                    val items = repo.buildGameList(emptyList())
                    withContext(Dispatchers.Main) { adapter.submit(items) }
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun openGame(id: String) {
        val intent = Intent(this, GameActivity::class.java)
        intent.putExtra(GameActivity.EXTRA_GAME_ID, id)
        startActivity(intent)
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
                GameDownloader.download(remote.url, tmp) { p ->
                    launch(Dispatchers.Main) {
                        progressBar.progress = p
                        progressText.text = "$p%"
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
