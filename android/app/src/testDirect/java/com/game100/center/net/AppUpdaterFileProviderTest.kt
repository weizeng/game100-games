package com.game100.center.net

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

/**
 * 用 Robolectric 加载真实的合并 Manifest 和 res/xml/file_paths.xml，
 * 对更新包实际下载位置调用 FileProvider.getUriForFile（就是线上报错的那一步）。
 */
@RunWith(RobolectricTestRunner::class)
class AppUpdaterFileProviderTest {
    private val ctx: Context = ApplicationProvider.getApplicationContext()

    @Test
    fun downloadedApkResolvesToContentUri() {
        val apk = File(AppUpdater.updateDir(ctx).apply { mkdirs() }, AppUpdater.APK_NAME)
        apk.writeBytes(byteArrayOf(1, 2, 3))
        val uri = AppUpdater.contentUriFor(ctx, apk)
        assertEquals("content", uri.scheme)
        assertEquals(AppUpdater.authority(ctx), uri.authority)
        assertEquals("/app_updates/update.apk", uri.path)
        // 安装器能通过这个地址读到文件
        val bytes = ctx.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
        assertEquals(3, bytes.size)

        // 旧版本放更新包的外部缓存目录（线上报错的 /storage/... 路径）也能解析
        // 注：FileProvider 按 authority 静态缓存根目录，而 Robolectric 每个用例换一个临时数据目录，
        // 所以两种路径放在同一个用例里检查。
        val ext = ctx.externalCacheDir
        assertTrue("Robolectric 应提供 externalCacheDir", ext != null)
        val f = File(ext!!.apply { mkdirs() }, AppUpdater.APK_NAME).apply { writeBytes(byteArrayOf(1)) }
        assertEquals("/external_cache/update.apk", AppUpdater.contentUriFor(ctx, f).path)
    }
}
