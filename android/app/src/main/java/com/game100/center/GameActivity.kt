package com.game100.center

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.game100.center.data.HomeRecommend
import com.game100.center.data.UserData
import com.game100.center.net.LeaderboardSync
import com.game100.center.net.ReviewSync
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

class GameActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_GAME_ID = "game_id"
        private const val POST_PLAY_PROMPT_MIN_MS = 30_000L
    }

    private lateinit var webView: WebView
    private lateinit var userData: UserData
    private lateinit var gameId: String
    private var lastCloudScore = 0
    private var sessionStartMs = 0L
    private var menuExpanded = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            )
        setContentView(R.layout.activity_game)

        userData = UserData(this)
        gameId = intent.getStringExtra(EXTRA_GAME_ID) ?: run {
            finish()
            return
        }

        webView = findViewById(R.id.webview)
        val progress = findViewById<ProgressBar>(R.id.progress)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
        }
        webView.addJavascriptInterface(JsBridge(this) { score ->
            onScoreReported(score)
        }, "NativeBridge")
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                injectScoreHook()
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }
        }

        setupQuickMenu()
        if (!loadGameById(gameId)) {
            Toast.makeText(this, "游戏文件缺失", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    private fun loadGameById(id: String): Boolean {
        val indexFile = File(filesDir, "games/$id/index.html")
        if (!indexFile.exists()) return false
        gameId = id
        lastCloudScore = 0
        sessionStartMs = System.currentTimeMillis()
        userData.recordRecentPlay(id)
        refreshQuickFavLabel()
        setMenuExpanded(false)
        webView.loadUrl("file://${indexFile.absolutePath}")
        return true
    }

    private fun setupQuickMenu() {
        val fab = findViewById<TextView>(R.id.quick_fab)
        val panel = findViewById<View>(R.id.quick_menu_panel)
        fab.setOnClickListener { setMenuExpanded(!menuExpanded) }

        findViewById<View>(R.id.quick_restart).setOnClickListener {
            setMenuExpanded(false)
            webView.reload()
        }
        findViewById<View>(R.id.quick_fav).setOnClickListener {
            val now = userData.toggleFavorite(gameId)
            refreshQuickFavLabel()
            Toast.makeText(this, if (now) "♥ 已收藏" else "已取消收藏", Toast.LENGTH_SHORT).show()
            setMenuExpanded(false)
        }
        findViewById<View>(R.id.quick_random).setOnClickListener {
            setMenuExpanded(false)
            switchToNextRandomGame()
        }
        findViewById<View>(R.id.quick_feedback).setOnClickListener {
            setMenuExpanded(false)
            showBugDialog(gameId)
        }
        findViewById<View>(R.id.quick_exit).setOnClickListener {
            setMenuExpanded(false)
            requestExitWithOptionalRating()
        }
        panel.visibility = View.GONE
    }

    private fun setMenuExpanded(expanded: Boolean) {
        menuExpanded = expanded
        val fab = findViewById<TextView>(R.id.quick_fab)
        val panel = findViewById<View>(R.id.quick_menu_panel)
        fab.text = if (expanded) "✕" else "☰"
        fab.alpha = if (expanded) 0.96f else 0.72f
        panel.visibility = if (expanded) View.VISIBLE else View.GONE
    }

    private fun refreshQuickFavLabel() {
        val favTv = findViewById<TextView>(R.id.quick_fav)
        val fav = userData.isFavorite(gameId)
        favTv.text = if (fav) "♥ 已收藏" else "♡ 收藏游戏"
        favTv.setTextColor(getColor(if (fav) R.color.badge_red else R.color.text_primary))
    }

    private fun switchToNextRandomGame() {
        val snapshot = MainActivity.allGamesSnapshot
        val next = HomeRecommend.pickRandomGame(
            items = snapshot,
            excludeId = gameId,
            recentIds = userData.getRecentPlayIds()
        )
        if (next != null && loadGameById(next.id)) {
            Toast.makeText(this, "🎲 切换到：${next.name}", Toast.LENGTH_SHORT).show()
            return
        }
        // 快照为空时扫描本机已装游戏目录兜底
        val localIds = File(filesDir, "games").listFiles()
            ?.filter { it.isDirectory && File(it, "index.html").exists() && it.name != gameId }
            ?.map { it.name }
            .orEmpty()
        if (localIds.isEmpty()) {
            Toast.makeText(this, "暂无其他已安装游戏可切换", Toast.LENGTH_SHORT).show()
            return
        }
        val pickId = localIds[java.util.Random().nextInt(localIds.size)]
        if (loadGameById(pickId)) {
            val title = MainActivity.gameCache[pickId]?.name ?: pickId
            Toast.makeText(this, "🎲 切换到：$title", Toast.LENGTH_SHORT).show()
        }
    }

    /** 玩满 30 秒且从未评分/从未提示过时，退出前温和弹一次 1-Tap 轻量评分 */
    private fun requestExitWithOptionalRating() {
        val playedMs = System.currentTimeMillis() - sessionStartMs
        if (playedMs < POST_PLAY_PROMPT_MIN_MS ||
            userData.getRating(gameId) > 0 ||
            userData.hasPromptedRating(gameId)
        ) {
            finish()
            return
        }
        userData.markPromptedRating(gameId)
        val gameName = MainActivity.gameCache[gameId]?.name ?: gameId
        var chosenStars = 5
        val density = resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(14), dp(20), dp(6))
        }
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }
        val starViews = mutableListOf<TextView>()
        fun updateStars() {
            starViews.forEachIndexed { idx, tv ->
                tv.text = if (idx < chosenStars) "★" else "☆"
            }
        }
        repeat(5) { idx ->
            val tv = TextView(this).apply {
                textSize = 32f
                gravity = Gravity.CENTER
                setTextColor(getColor(R.color.accent))
                layoutParams = LinearLayout.LayoutParams(0, dp(48), 1f)
                setOnClickListener {
                    chosenStars = idx + 1
                    updateStars()
                }
            }
            starViews.add(tv)
            row.addView(tv)
        }
        updateStars()
        root.addView(row)

        AlertDialog.Builder(this)
            .setTitle("刚才「$gameName」好玩吗？")
            .setMessage("给个星级，帮助大家发现好游戏")
            .setView(root)
            .setPositiveButton("提交并退出") { _, _ ->
                val targetId = gameId
                val stars = chosenStars
                userData.setRating(targetId, stars)
                val appCtx = applicationContext
                kotlin.concurrent.thread(isDaemon = true) {
                    ReviewSync.submit(appCtx, targetId, stars, emptyList(), "")
                }
                Toast.makeText(this, "感谢评分 $stars 星！", Toast.LENGTH_SHORT).show()
                finish()
            }
            .setNegativeButton("下次再说") { _, _ -> finish() }
            .setOnCancelListener { finish() }
            .show()
    }

    /** 游戏主动 reportScore，或注入脚本从 localStorage 嗅探到的新高分 */
    private fun onScoreReported(score: Int) {
        if (score <= 0) return
        val isRecord = userData.reportScore(gameId, score)
        if (isRecord) {
            Toast.makeText(this, "🎉 新纪录：$score 分！", Toast.LENGTH_SHORT).show()
        }
        if (score > lastCloudScore) {
            lastCloudScore = score
            val targetId = gameId
            lifecycleScope.launch(Dispatchers.IO) {
                LeaderboardSync.submitBest(this@GameActivity, targetId, score)
            }
        }
    }

    private fun injectScoreHook() {
        val idJson = JSONObject.quote(gameId)
        val js = """
            (function(gid){
              if (window.__g100ScoreHook) return;
              window.__g100ScoreHook = true;
              var last = 0;
              function maybe(score){
                score = parseInt(score, 10);
                if (!isFinite(score) || score <= 0 || score <= last) return;
                if (score > 1000000000) return;
                last = score;
                try {
                  if (window.NativeBridge && NativeBridge.reportScore) NativeBridge.reportScore(score);
                } catch (e) {}
              }
              function keyLooksScore(k){
                if (!k) return false;
                k = String(k);
                if (/mute|sound|theme|mode|prog|progress|level|unlock|setting|lang|name|nick/i.test(k)) return false;
                return /(^|[_-])(hs|best|high|hiscore|highscore|record|score)([_-]|$)/i.test(k)
                    || k === 'g100_' + gid + '_hs'
                    || k === gid + '_best'
                    || k === gid + '_hs';
              }
              try {
                var origSet = Storage.prototype.setItem;
                Storage.prototype.setItem = function(key, value){
                  var ret = origSet.call(this, key, value);
                  try {
                    if (keyLooksScore(key)) {
                      var n = parseInt(value, 10);
                      if (String(n) === String(value).trim()) maybe(n);
                    }
                  } catch (e) {}
                  return ret;
                };
              } catch (e) {}
              function hookGameUI(){
                try {
                  if (!window.GameUI || GameUI.__g100Hooked) return;
                  if (typeof GameUI.storageSet === 'function') {
                    var orig = GameUI.storageSet.bind(GameUI);
                    GameUI.storageSet = function(k,v){ var r=orig(k,v); try{ if(keyLooksScore(k)){ var n=parseInt(v,10); if(String(n)===String(v).trim()) maybe(n);} }catch(e){} return r; };
                  }
                  GameUI.reportScore = function(s){ maybe(s); };
                  GameUI.__g100Hooked = true;
                } catch (e) {}
              }
              hookGameUI();
              setInterval(hookGameUI, 1500);
              try {
                var keys = [gid+'_best','g100_'+gid+'_hs',gid+'_hs','best','highScore','hiscore'];
                keys.forEach(function(k){
                  var v = localStorage.getItem(k);
                  if (v != null) maybe(v);
                });
              } catch (e) {}
            })($idJson);
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    private fun showBugDialog(gameId: String) {
        com.game100.center.ui.FeedbackDialog.show(this, gameId)
    }

    @Deprecated("back press")
    override fun onBackPressed() {
        if (menuExpanded) {
            setMenuExpanded(false)
            return
        }
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            requestExitWithOptionalRating()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}
