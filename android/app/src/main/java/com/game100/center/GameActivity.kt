package com.game100.center

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.game100.center.data.UserData
import com.game100.center.net.LeaderboardSync
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import org.json.JSONObject
import java.net.URLEncoder

class GameActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_GAME_ID = "game_id"
    }

    private lateinit var webView: WebView
    private lateinit var gameId: String
    private var lastCloudScore = 0

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

        gameId = intent.getStringExtra(EXTRA_GAME_ID) ?: run {
            finish()
            return
        }
        val indexFile = File(filesDir, "games/$gameId/index.html")
        if (!indexFile.exists()) {
            Toast.makeText(this, "游戏文件缺失", Toast.LENGTH_SHORT).show()
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
        webView.loadUrl("file://${indexFile.absolutePath}")

        val btnBug = findViewById<Button>(R.id.bug_button)
        btnBug.setOnClickListener { showBugDialog(gameId) }
    }

    /** 游戏主动 reportScore，或注入脚本从 localStorage 嗅探到的新高分 */
    private fun onScoreReported(score: Int) {
        if (score <= 0) return
        val userData = UserData(this)
        val isRecord = userData.reportScore(gameId, score)
        if (isRecord) {
            Toast.makeText(this, "🎉 新纪录：$score 分！", Toast.LENGTH_SHORT).show()
        }
        if (score > lastCloudScore) {
            lastCloudScore = score
            lifecycleScope.launch(Dispatchers.IO) {
                LeaderboardSync.submitBest(this@GameActivity, gameId, score)
            }
        }
    }

    /**
     * 不改动游戏 zip：在 WebView 里挂钩 GameUI.storageSet / localStorage，
     * 看到像最高分的数字就回调 NativeBridge.reportScore。
     * 游戏本身仍完全离线可玩；无网时云端同步静默失败。
     */
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
              // 进页时读一次常见键
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
        val input = EditText(this)
        input.hint = "描述一下哪里不对（比如：点开始没反应）"
        val pad = (16 * resources.displayMetrics.density).toInt()
        input.setPadding(pad, pad, pad, pad)
        AlertDialog.Builder(this)
            .setTitle("🐛 提交 bug")
            .setMessage("描述会和游戏名（$gameId）、App 版本一起发到 GitHub，每日自动修复任务会处理它。")
            .setView(input)
            .setPositiveButton("提交") { _, _ ->
                val desc = input.text.toString().trim().ifEmpty { "（用户没有填写描述）" }
                openBugIssue(gameId, desc)
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun openBugIssue(gameId: String, desc: String) {
        val title = URLEncoder.encode("🐛 [$gameId] bug 反馈", "UTF-8")
        val body = URLEncoder.encode(
            "游戏：$gameId\nApp 版本：${BuildConfig.VERSION_NAME}\n\n问题描述：\n$desc",
            "UTF-8"
        )
        val url = "https://github.com/weizeng/game100-games/issues/new?title=$title&body=$body"
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (e: Exception) {
            Toast.makeText(this, "打不开浏览器，没法提交", Toast.LENGTH_SHORT).show()
        }
    }

    @Deprecated("back press")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}
