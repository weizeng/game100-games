package com.game100.center.net

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.game100.center.BuildConfig
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * App 自升级：拉取云端 app.json，比对 versionCode，
 * 有新版则下载 APK 并调起系统安装器。
 */
object AppUpdater {
    const val APP_INFO_URL = "https://cdn.jsdelivr.net/gh/weizeng/game100-games@main/app.json"
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

    @Throws(Exception::class)
    fun fetchInfo(): AppInfo? {
        val conn = (URL(APP_INFO_URL).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 15000
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

    @Throws(Exception::class)
    fun downloadApk(ctx: Context, url: String, onProgress: (Int) -> Unit): File {
        val dir = ctx.externalCacheDir ?: ctx.cacheDir
        val out = File(dir, "update.apk")
        if (out.exists()) out.delete()
        GameDownloader.download(url, out, onProgress)
        return out
    }

    fun installApk(ctx: Context, apk: File) {
        val uri: Uri = FileProvider.getUriForFile(
            ctx, "${ctx.packageName}.fileprovider", apk
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        ctx.startActivity(intent)
    }
}
