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
import java.io.File
import java.net.URLEncoder

class GameActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_GAME_ID = "game_id"
    }

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 全屏沉浸
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            )
        setContentView(R.layout.activity_game)

        val gameId = intent.getStringExtra(EXTRA_GAME_ID)
        if (gameId.isNullOrBlank()) {
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
            val userData = com.game100.center.data.UserData(this)
            val isRecord = userData.reportScore(gameId, score)
            if (isRecord) {
                android.widget.Toast.makeText(this, "🎉 新纪录：$score 分！", android.widget.Toast.LENGTH_SHORT).show()
            }
        }, "NativeBridge")
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }
        }
        webView.loadUrl("file://${indexFile.absolutePath}")

        // 🐛 bug 提交按钮（v1.10）：跳预填好的 GitHub Issue，每日自动修复任务处理
        val btnBug = findViewById<Button>(R.id.bug_button)
        btnBug.setOnClickListener { showBugDialog(gameId) }
    }

    /**
     * v1.10：游戏内 🐛 提交 bug。
     * 弹框让用户写一句话描述，然后跳到 GitHub 预填 Issue 页面；
     * 每日自动任务会读取 Issue、分析并修复、关闭 Issue。
     */
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
