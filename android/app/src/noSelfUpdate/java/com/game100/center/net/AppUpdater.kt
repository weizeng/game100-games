package com.game100.center.net

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * play / cn 渠道的"无自更新"实现。
 *
 * 应用商店渠道必须由商店负责升级：
 * - Google Play《设备和网络滥用》政策：应用不得通过 Google Play 更新机制以外的方式修改、替换或更新自身；
 * - REQUEST_INSTALL_PACKAGES 不得用于自更新。
 * 因此这里不下载 APK、不调起安装器，"检查更新"只会打开应用商店详情页。
 * 对外 API 与 src/direct 中的完整实现保持一致，调用方无需区分渠道。
 */
object AppUpdater {

    data class AppInfo(
        val versionCode: Int,
        val versionName: String,
        val apkUrl: String,
        val changelog: String
    )

    /** 商店渠道从不自动检查 */
    fun shouldCheck(ctx: Context): Boolean = false

    fun markChecked(ctx: Context) {}

    fun fetchInfo(): AppInfo? = null

    fun hasUpdate(info: AppInfo): Boolean = false

    /** 手动"检查更新"：直接跳到应用商店详情页 */
    fun checkNow(
        activity: AppCompatActivity,
        onResult: (AppInfo?) -> Unit,
        onError: (String) -> Unit
    ) {
        openStorePage(activity)
        onResult(null)
    }

    fun showUpdateFlow(activity: AppCompatActivity, info: AppInfo) {
        openStorePage(activity)
    }

    /** market:// 由设备上的应用商店（Google Play / 华为 / 小米 / OPPO / vivo 等）处理 */
    fun openStorePage(ctx: Context) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=${ctx.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            ctx.startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(ctx, "请在应用商店中更新游戏100", Toast.LENGTH_SHORT).show()
        }
    }
}
