package com.game100.center.net

import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

object GameDownloader {
    /**
     * 下载游戏包到 tmpFile；onProgress 回调 0~100。
     * 支持断点续传（服务器支持 Range 时）。
     */
    @Throws(Exception::class)
    fun download(url: String, tmpFile: File, onProgress: (Int) -> Unit) {
        tmpFile.parentFile?.mkdirs()
        val existing = if (tmpFile.exists()) tmpFile.length() else 0L
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 30000
            setRequestProperty("User-Agent", "Game100/1.0")
            instanceFollowRedirects = true
            if (existing > 0) setRequestProperty("Range", "bytes=$existing-")
        }
        try {
            conn.connect()
            val code = conn.responseCode
            if (code != HttpURLConnection.HTTP_OK && code != HttpURLConnection.HTTP_PARTIAL) {
                throw IOException("下载失败：HTTP $code")
            }
            val append = code == HttpURLConnection.HTTP_PARTIAL
            val total = if (append) {
                val range = conn.getHeaderField("Content-Range") // bytes 100-999/1234
                range?.substringAfterLast("/")?.toLongOrNull() ?: -1L
            } else {
                conn.contentLengthLong
            }
            conn.inputStream.use { ins ->
                java.io.FileOutputStream(tmpFile, append).use { out ->
                    val buf = ByteArray(32 * 1024)
                    var read: Int
                    var done = if (append) existing else 0L
                    var lastReport = -1
                    while (ins.read(buf).also { read = it } != -1) {
                        out.write(buf, 0, read)
                        done += read
                        if (total > 0) {
                            val p = (done * 100 / total).toInt().coerceIn(0, 100)
                            if (p != lastReport) {
                                lastReport = p
                                onProgress(p)
                            }
                        }
                    }
                }
            }
            onProgress(100)
        } finally {
            conn.disconnect()
        }
    }
}
