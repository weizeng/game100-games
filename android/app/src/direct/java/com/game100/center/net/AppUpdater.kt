package com.game100.center.net

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.game100.center.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ExecutorCompletionService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * App 自升级：拉取云端 app.json，比对 versionCode，
 * 有新版则下载 APK 并调起系统安装器。
 */
object AppUpdater {
    // 多条线路同时请求，取版本号最大的（见 fetchInfo）
    private val APP_INFO_URLS = listOf(
        "https://raw.githubusercontent.com/weizeng/game100-games/main/app.json",
        "https://cdn.jsdelivr.net/gh/weizeng/game100-games@main/app.json",
        "https://fastly.jsdelivr.net/gh/weizeng/game100-games@main/app.json",
        "https://gcore.jsdelivr.net/gh/weizeng/game100-games@main/app.json",
        "https://testingcf.jsdelivr.net/gh/weizeng/game100-games@main/app.json",
    )
    private const val PREFS = "game100"
    private const val KEY_LAST_CHECK = "update_last_check"
    private const val CHECK_INTERVAL = 24 * 3600 * 1000L

    data class AppInfo(
        val versionCode: Int,
        val versionName: String,
        val apkUrl: String,
        val changelog: String
    )

    /** 每天最多自动检查一次 */
    fun shouldCheck(ctx: Context): Boolean {
        val last = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getLong(KEY_LAST_CHECK, 0)
        return System.currentTimeMillis() - last > CHECK_INTERVAL
    }

    fun markChecked(ctx: Context) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putLong(KEY_LAST_CHECK, System.currentTimeMillis()).apply()
    }

    /** 全部线路的总等待上限 */
    private const val FETCH_BUDGET_MS = 15_000L

    /**
     * 同时向所有线路请求 app.json，取 versionCode 最大的那份。
     * jsDelivr 的 @main 别名经常缓存旧提交（发版后几小时内 cdn 节点仍返回旧版本），
     * 以前“第一个成功就用”会让用户一直看不到新版本。
     * 一旦拿到比当前版本新的结果就立即返回；否则等全部线路结束（最多 15 秒）。
     */
    @Throws(Exception::class)
    fun fetchInfo(): AppInfo? {
        val pool = Executors.newFixedThreadPool(APP_INFO_URLS.size) { r ->
            Thread(r, "app-info").apply { isDaemon = true }
        }
        try {
            val cs = ExecutorCompletionService<AppInfo?>(pool)
            APP_INFO_URLS.forEach { url -> cs.submit { fetchFrom(url) } }
            val deadline = System.currentTimeMillis() + FETCH_BUDGET_MS
            var best: AppInfo? = null
            var lastErr: Exception? = null
            repeat(APP_INFO_URLS.size) {
                val left = deadline - System.currentTimeMillis()
                if (left <= 0) return@repeat
                val f = cs.poll(left, TimeUnit.MILLISECONDS) ?: return@repeat
                try {
                    val info = f.get()
                    if (info != null) {
                        best = pickNewer(best, info)
                        if (hasUpdate(info)) return best
                    }
                } catch (e: Exception) {
                    lastErr = (e.cause as? Exception) ?: e
                }
            }
            return best ?: throw (lastErr ?: IOException("版本服务不可用"))
        } finally {
            pool.shutdownNow()
        }
    }

    internal fun pickNewer(a: AppInfo?, b: AppInfo): AppInfo =
        if (a == null || b.versionCode > a.versionCode) b else a

    @Throws(Exception::class)
    private fun fetchFrom(url: String): AppInfo? {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 10000
            readTimeout = 10000
            useCaches = false
            setRequestProperty("User-Agent", "Game100/${BuildConfig.VERSION_NAME}")
            instanceFollowRedirects = true
        }
        try {
            conn.connect()
            if (conn.responseCode != HttpURLConnection.HTTP_OK) {
                throw IOException("版本服务返回 HTTP ${conn.responseCode}")
            }
            val o = JSONObject(conn.inputStream.bufferedReader(Charsets.UTF_8).readText())
            return AppInfo(
                versionCode = o.optInt("versionCode", 0),
                versionName = o.optString("versionName", ""),
                apkUrl = o.optString("apkUrl", ""),
                changelog = o.optString("changelog", "")
            )
        } finally {
            conn.disconnect()
        }
    }

    fun hasUpdate(info: AppInfo): Boolean =
        info.versionCode > BuildConfig.VERSION_CODE && info.apkUrl.isNotBlank()

    /** 手动检查：不受每天一次限制。info 为 null 表示云端无版本信息。 */
    fun checkNow(
        activity: AppCompatActivity,
        onResult: (AppInfo?) -> Unit,
        onError: (String) -> Unit
    ) {
        activity.lifecycleScope.launch(Dispatchers.IO) {
            try {
                val info = fetchInfo()
                if (info != null) markChecked(activity)
                withContext(Dispatchers.Main) { onResult(info) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { onError(e.message ?: "网络错误") }
            }
        }
    }

    /** 弹框 → 下载（进度条）→ 调起安装，通用流程 */
    @SuppressLint("SetTextI18n")
    fun showUpdateFlow(activity: AppCompatActivity, info: AppInfo) {
        val msg = "发现新版本 v${info.versionName}\n\n${info.changelog}".trim()
        AlertDialog.Builder(activity)
            .setTitle("应用有更新")
            .setMessage(msg)
            .setPositiveButton("立即更新") { _, _ -> downloadAndInstall(activity, info) }
            .setNegativeButton("稍后再说", null)
            .show()
    }

    private fun dp(ctx: Context, v: Int): Int = (v * ctx.resources.displayMetrics.density).toInt()

    private fun downloadAndInstall(activity: AppCompatActivity, info: AppInfo) {
        val bar = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            val pad = dp(activity, 24)
            setPadding(pad, dp(activity, 8), pad, dp(activity, 16))
        }
        val dialog = AlertDialog.Builder(activity)
            .setTitle("正在下载 v${info.versionName}")
            .setView(bar)
            .setCancelable(false)
            .show()
        activity.lifecycleScope.launch(Dispatchers.IO) {
            val apk = try {
                downloadApk(activity, info.apkUrl) { p ->
                    launch(Dispatchers.Main) { bar.progress = p }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    dialog.dismiss()
                    showFailure(activity, info, "更新包下载失败：${e.message ?: "网络错误"}")
                }
                return@launch
            }
            withContext(Dispatchers.Main) {
                dialog.dismiss()
                try {
                    installApk(activity, apk)
                } catch (e: Exception) {
                    showFailure(activity, info, "无法打开安装程序：${e.message ?: e.javaClass.simpleName}")
                }
            }
        }
    }

    /** 下载或安装失败：给出“重试”和“用浏览器下载”两条路，不让用户卡死在 App 里 */
    private fun showFailure(activity: AppCompatActivity, info: AppInfo, reason: String) {
        if (activity.isFinishing || activity.isDestroyed) return
        AlertDialog.Builder(activity)
            .setTitle("更新没有完成")
            .setMessage("$reason\n\n可以重试，或用浏览器下载安装包后手动安装（不会丢失游戏和进度）。")
            .setPositiveButton("用浏览器下载") { _, _ -> openInBrowser(activity, info.apkUrl) }
            .setNeutralButton("重试") { _, _ -> downloadAndInstall(activity, info) }
            .setNegativeButton("取消", null)
            .show()
    }

    fun openInBrowser(ctx: Context, url: String) {
        try {
            ctx.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(ctx, "没有找到浏览器，请手动打开：$url", Toast.LENGTH_LONG).show()
        }
    }

    /** 更新包目录：内部缓存 cacheDir/updates/，对应 res/xml/file_paths.xml 的 cache-path "updates/" */
    const val UPDATE_DIR = "updates"
    const val APK_NAME = "update.apk"

    fun updateDir(ctx: Context): File = File(ctx.cacheDir, UPDATE_DIR)

    fun authority(ctx: Context): String = "${ctx.packageName}.fileprovider"

    @Throws(Exception::class)
    fun downloadApk(ctx: Context, url: String, onProgress: (Int) -> Unit): File {
        val dir = updateDir(ctx).apply { mkdirs() }
        val out = File(dir, APK_NAME)
        if (out.exists()) out.delete()
        // 旧版本下载在外部缓存里的包，顺手清掉
        ctx.externalCacheDir?.let { File(it, APK_NAME).delete() }
        GameDownloader.download(url, out, isGameZip = false, onProgress = onProgress)
        return out
    }

    /** 拿到给安装器用的 content:// 地址；路径没在 file_paths.xml 里声明时会抛 IllegalArgumentException */
    fun contentUriFor(ctx: Context, apk: File): Uri =
        FileProvider.getUriForFile(ctx, authority(ctx), apk)

    fun installApk(ctx: Context, apk: File) {
        val uri: Uri = contentUriFor(ctx, apk)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        ctx.startActivity(intent)
    }
}
