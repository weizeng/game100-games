package com.game100.center.ui

import android.content.Context
import android.content.Intent
import android.os.Looper
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import androidx.test.core.app.ApplicationProvider
import com.game100.center.BuildConfig
import com.game100.center.GameDetailActivity
import com.game100.center.MainActivity
import com.game100.center.R
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import java.io.File
import java.net.ServerSocket
import kotlin.concurrent.thread

/**
 * 首页出品方筛选回归测试（v4.13 真机：点「◆ Grok 出品」闪退）。
 * 用仓库真实的 manifest.json（256 款，Muse 236 / Grok 20）+ 构建时内置的全部游戏，
 * 另造：部分游戏有更新、几款只在线上（未下载）的 Muse/Grok/新出品方游戏。
 */
@RunWith(RobolectricTestRunner::class)
class StudioFilterUiTest {
    private lateinit var server: ServerSocket
    private val ctx: Context = ApplicationProvider.getApplicationContext()
    private lateinit var manifest: JSONObject
    private var controller: ActivityController<MainActivity>? = null

    @Before
    fun setUp() {
        val gamesDir = File(System.getProperty("game100.gamesDir")!!)
        manifest = JSONObject(File(gamesDir.parentFile, "manifest.json").readText())
        val games = manifest.getJSONArray("games")
        // 前 8 款给出更新
        for (i in 0 until 8) games.getJSONObject(i).let { it.put("version", it.getInt("version") + 1) }
        fun extra(id: String, studio: String?, cat: String) = JSONObject().apply {
            put("id", id); put("name", "线上$id"); put("desc", "只在线上"); put("version", 1); put("icon", "🎲")
            put("color", "#336699"); put("category", cat); put("url", "http://127.0.0.1/none/$id.zip"); put("size", 1000)
            if (studio != null) put("studio", studio)
        }
        games.put(extra("zzgrokonline", "Grok", "益智解谜"))
        games.put(extra("zzmuseonline", "muse", "街机动作"))
        games.put(extra("zzacme", "Acme Lab", "休闲趣味"))
        games.put(extra("zznostudio", null, "经典重温"))
        val body = manifest.toString().toByteArray()
        server = ServerSocket(0)
        thread(isDaemon = true) {
            while (!server.isClosed) {
                val sock = runCatching { server.accept() }.getOrNull() ?: break
                thread(isDaemon = true) {
                    sock.use { so ->
                        val r = so.getInputStream().bufferedReader()
                        while (true) { val l = r.readLine() ?: break; if (l.isEmpty()) break }
                        val out = so.getOutputStream()
                        out.write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${body.size}\r\nConnection: close\r\n\r\n".toByteArray())
                        out.write(body); out.flush()
                    }
                }
            }
        }
        ctx.getSharedPreferences("game100", Context.MODE_PRIVATE).edit()
            .putString("manifest_url", "http://127.0.0.1:${server.localPort}/manifest.json")
            .putLong("update_last_check", System.currentTimeMillis()) // 不触发 App 自升级检查
            .commit()
        MainActivity.gameCache.clear()
    }

    @After
    fun tearDown() {
        controller?.let { runCatching { it.pause().stop().destroy() } }
        server.close()
    }

    private fun idle() = shadowOf(Looper.getMainLooper()).idle()

    private fun layout(a: MainActivity) {
        val root = a.window.decorView
        root.measure(
            View.MeasureSpec.makeMeasureSpec(1080, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(2340, View.MeasureSpec.EXACTLY)
        )
        root.layout(0, 0, 1080, 2340)
        idle()
    }

    /** 等首页加载完（本地 + 线上合并） */
    private fun waitLoaded(a: MainActivity, expected: Int) {
        val deadline = System.currentTimeMillis() + 120_000
        while (System.currentTimeMillis() < deadline) {
            idle()
            if (countChip(a, null) == expected) { layout(a); return }
            Thread.sleep(50)
        }
        throw AssertionError("首页没有加载完：全部 = ${countChip(a, null)}，期望 $expected")
    }

    private fun studioChips(a: MainActivity): List<TextView> {
        val row = a.findViewById<LinearLayout>(R.id.studio_row)
        return (1 until row.childCount).map { row.getChildAt(it) as TextView }
    }

    private fun chipFor(a: MainActivity, studio: String?): TextView =
        studioChips(a).first { c ->
            val t = c.text.toString()
            if (studio == null) t.startsWith("全部") else t.contains(" $studio 出品")
        }

    private fun countChip(a: MainActivity, studio: String?): Int = runCatching {
        chipFor(a, studio).text.toString().substringAfterLast("· ").trim().toInt()
    }.getOrDefault(-1)

    private fun shown(a: MainActivity): Int {
        val rv = a.findViewById<RecyclerView>(R.id.recycler)
        return if (rv.visibility == View.VISIBLE) rv.adapter!!.itemCount else 0
    }

    private fun tap(a: MainActivity, v: View) {
        assertTrue(v.performClick())
        idle(); layout(a)
    }

    private fun expectedTotal(): Int =
        if (BuildConfig.ONLINE_CATALOG) manifest.getJSONArray("games").length()
        else File(System.getProperty("game100.gamesDir")!!).listFiles()!!.count { File(it, "meta.json").isFile }

    private fun launch(intent: Intent? = null): MainActivity {
        val c = if (intent != null) Robolectric.buildActivity(MainActivity::class.java, intent)
        else Robolectric.buildActivity(MainActivity::class.java)
        controller = c
        c.setup()
        return c.get()
    }

    private fun studiosOf(): Map<String, Int> {
        val out = HashMap<String, Int>()
        val gamesDir = File(System.getProperty("game100.gamesDir")!!)
        if (BuildConfig.ONLINE_CATALOG) {
            val arr: JSONArray = manifest.getJSONArray("games")
            for (i in 0 until arr.length()) {
                val s = com.game100.center.model.Studio.resolve(arr.getJSONObject(i).optString("studio"), null)
                out[s] = (out[s] ?: 0) + 1
            }
        } else {
            gamesDir.listFiles()!!.filter { File(it, "meta.json").isFile }.forEach {
                val s = com.game100.center.model.Studio.resolve(JSONObject(File(it, "meta.json").readText()).optString("studio"), null)
                out[s] = (out[s] ?: 0) + 1
            }
        }
        return out
    }

    @Test
    fun tapEveryStudioChipAndCombos() {
        val a = launch()
        val total = expectedTotal()
        waitLoaded(a, total)
        val studios = studiosOf()
        assertEquals(total, shown(a))

        for ((studio, n) in studios) {
            assertEquals("chip 计数 $studio", n, countChip(a, studio))
            tap(a, chipFor(a, studio))
            assertEquals("筛选 $studio", n, shown(a))
            assertTrue(chipFor(a, studio).isSelected)
        }
        // 出品方 + 分类
        tap(a, chipFor(a, "Grok"))
        val cats = a.findViewById<LinearLayout>(R.id.cat_row)
        for (i in 0 until cats.childCount) {
            tap(a, cats.getChildAt(i))
            assertTrue(shown(a) >= 0)
        }
        tap(a, cats.getChildAt(0))
        // 出品方 + 搜索（含空结果）
        val search = a.findViewById<EditText>(R.id.search_bar)
        search.setText("霓虹"); idle(); layout(a)
        tap(a, chipFor(a, "Muse"))
        search.setText("不存在的游戏名xyz"); idle(); layout(a)
        assertEquals(0, shown(a))
        assertEquals(View.VISIBLE, a.findViewById<View>(R.id.empty_state).visibility)
        tap(a, chipFor(a, "Grok"))
        assertEquals(0, shown(a))
        search.setText(""); idle(); layout(a)
        assertEquals(studios["Grok"], shown(a))
        // 清空筛选
        tap(a, a.findViewById(R.id.btn_reset_filters))
        assertEquals(total, shown(a))
        // 来回快速切换
        repeat(5) {
            tap(a, chipFor(a, "Grok")); tap(a, chipFor(a, "Muse")); tap(a, chipFor(a, null))
        }
        assertEquals(total, shown(a))
    }

    @Test
    fun grokFilterSurvivesRecreate() {
        val a = launch()
        val total = expectedTotal()
        waitLoaded(a, total)
        tap(a, chipFor(a, "Grok"))
        val grok = shown(a)
        controller!!.recreate()
        val b = controller!!.get()
        waitLoaded(b, total)
        assertEquals(grok, shown(b))
        assertTrue(chipFor(b, "Grok").isSelected)
    }

    @Test
    fun detailStudioPillOpensFilteredHome() {
        val a = launch()
        val total = expectedTotal()
        waitLoaded(a, total)
        tap(a, chipFor(a, "Grok"))
        val rv = a.findViewById<RecyclerView>(R.id.recycler)
        val first = (rv.adapter as GameRowAdapter).currentList.first()
        assertEquals("Grok", first.studio)
        // 打开详情页，点出品方胶囊
        MainActivity.gameCache[first.id] = first.remote ?: com.game100.center.model.RemoteGame(
            first.id, first.name, first.desc, first.installedVersion, first.icon, first.color, first.category, "", 0, studio = first.studio)
        val d = Robolectric.buildActivity(GameDetailActivity::class.java,
            Intent(ctx, GameDetailActivity::class.java).putExtra("game_id", first.id)).setup().get()
        val pill = d.findViewById<TextView>(R.id.detail_studio)
        assertTrue(pill.text.contains("Grok"))
        assertTrue(pill.performClick())
        val next = shadowOf(d).nextStartedActivity
        assertEquals("Grok", next.getStringExtra("studio_filter"))
        // 首页收到 studio_filter（SINGLE_TOP → onNewIntent）
        controller!!.newIntent(next)
        idle(); layout(a)
        assertEquals(total.let { _ -> studiosOf()["Grok"] }, shown(a))
        // 冷启动带 studio_filter
        controller!!.pause().stop().destroy()
        val c = launch(Intent(ctx, MainActivity::class.java).putExtra("studio_filter", "grok"))
        waitLoaded(c, total)
        assertEquals(studiosOf()["Grok"], shown(c))
    }

    /** 老版本装过的游戏（meta.json 没有 studio、版本相同）：启动时从内置包补上出品方（cn 离线渠道靠这条） */
    @Test
    fun startupBackfillsStudioForOldInstalls() {
        val repoMeta = JSONObject(File(System.getProperty("game100.gamesDir")!!, "neontd/meta.json").readText())
        assertEquals("Grok", repoMeta.getString("studio"))
        val dir = File(ctx.filesDir, "games/neontd").apply { mkdirs() }
        val old = JSONObject(repoMeta.toString()).apply { remove("studio") }
        File(dir, "meta.json").writeText(old.toString())
        File(dir, "index.html").writeText("<html></html>")
        File(ctx.filesDir, "games/.bundled_v2").writeText("29") // 上一个 App 版本
        val a = launch()
        waitLoaded(a, expectedTotal())
        assertEquals("Grok", JSONObject(File(dir, "meta.json").readText()).optString("studio"))
        assertEquals(old.getInt("version"), JSONObject(File(dir, "meta.json").readText()).getInt("version"))
        tap(a, chipFor(a, "Grok"))
        val ids = (a.findViewById<RecyclerView>(R.id.recycler).adapter as GameRowAdapter).currentList.map { it.id }
        assertTrue("neontd 应在 Grok 筛选里：$ids", "neontd" in ids)
    }

    /** 键盘/手柄模式下焦点停在某张游戏卡片上时换筛选：卡片被回收也不能崩 */
    @Test
    fun filterWhileCardFocused() {
        val a = launch()
        val total = expectedTotal()
        waitLoaded(a, total)
        val rv = a.findViewById<RecyclerView>(R.id.recycler)
        val cats = a.findViewById<LinearLayout>(R.id.cat_row)
        for (step in 0 until 6) {
            val card = rv.getChildAt(rv.childCount - 1)
            card.isFocusable = true
            assertTrue("卡片应能拿到焦点", card.requestFocus())
            when (step % 3) {
                0 -> tap(a, chipFor(a, "Grok"))
                1 -> tap(a, cats.getChildAt(1 + step % (cats.childCount - 1)))
                else -> tap(a, chipFor(a, null))
            }
            assertTrue(shown(a) >= 0)
        }
        a.findViewById<EditText>(R.id.search_bar).setText("不存在的游戏名xyz"); idle(); layout(a)
        assertEquals(0, shown(a))
    }
}
