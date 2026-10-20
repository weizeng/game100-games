package com.game100.center.net

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InterruptedIOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.UnknownHostException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Semaphore
import java.util.zip.ZipFile
import java.util.zip.ZipInputStream

/**
 * 小游戏 zip 下载：
 * - 连接超时 15s、读取超时 30s（按"每次读取无数据"计时，不限制总时长，慢网也能下完）；
 * - 多线路（见 [Mirrors]）+ 最多 3 轮重试，轮间退避 1s / 3s；
 * - 同一线路断点续传（Range）；换线路时丢弃半截文件；
 * - 先写 .part 临时文件，校验通过后再改名为目标文件（原子替换）；
 * - 校验：manifest 里的 size（若有）+ zip 结构与 CRC + 游戏包必须含 index.html / meta.json（APK 只校验 zip 结构）；
 * - 全局最多同时 2 个下载，其余排队。
 */
object GameDownloader {
    @Volatile var connectTimeoutMs = 15_000
    @Volatile var readTimeoutMs = 30_000
    @Volatile var maxRounds = 3
    @Volatile var backoffMs = longArrayOf(1_000, 3_000)
    /** 超过这个总时长后不再发起新的尝试（正在进行的一次会继续） */
    @Volatile var totalBudgetMs = 180_000L
    const val MAX_PARALLEL = 2

    private val slots = Semaphore(MAX_PARALLEL, true)
    private val inFlight = ConcurrentHashMap.newKeySet<String>()

    class CancelledException : IOException("已取消")
    class CorruptZipException(msg: String) : IOException(msg)

    /** 带用户可读说明的失败 */
    class DownloadException(val userMessage: String, cause: Throwable?) : IOException(userMessage, cause)

    fun isDownloading(key: String) = key in inFlight

    /**
     * 下载 [url]（自动换线路）到 [dest]，成功返回实际使用的地址。
     * [expectedSize] 为 manifest 中的字节数，<=0 表示未知。
     */
    @Throws(IOException::class)
    fun download(
        url: String,
        dest: File,
        expectedSize: Long = 0,
        isGameZip: Boolean = true,
        cancelled: () -> Boolean = { false },
        onStatus: (String) -> Unit = {},
        onProgress: (Int) -> Unit = {},
    ): String {
        val key = dest.absolutePath
        if (!inFlight.add(key)) throw DownloadException("这个游戏正在下载中", null)
        try {
            if (!slots.tryAcquire()) {
                onStatus("排队中…（最多同时下载 $MAX_PARALLEL 个）")
                while (!slots.tryAcquire(200, java.util.concurrent.TimeUnit.MILLISECONDS)) {
                    if (cancelled()) throw CancelledException()
                }
            }
            try {
                return downloadWithRetry(url, dest, expectedSize, isGameZip, cancelled, onStatus, onProgress)
            } finally {
                slots.release()
            }
        } catch (e: InterruptedException) {
            Thread.currentThread().interrupt()
            throw CancelledException()
        } finally {
            inFlight.remove(key)
        }
    }

    private fun downloadWithRetry(
        url: String, dest: File, expectedSize: Long, isGameZip: Boolean,
        cancelled: () -> Boolean, onStatus: (String) -> Unit, onProgress: (Int) -> Unit,
    ): String {
        dest.parentFile?.mkdirs()
        val part = File(dest.path + ".part")
        val partSrc = File(dest.path + ".part.src")
        // 大小与 manifest 不符但内容完整的包（多半是 CDN 缓存了旧版）：其他线路都不行时才用它
        val alt = File(dest.path + ".alt")
        alt.delete()
        val mirrors = Mirrors.candidates(url)
        val start = System.currentTimeMillis()
        var lastError: Exception? = null
        var attempts = 0
        var altUrl: String? = null

        rounds@ for (round in 0 until maxRounds) {
            if (round > 0) {
                val wait = backoffMs.getOrElse(round - 1) { backoffMs.lastOrNull() ?: 0L }
                onStatus("网络不稳定，${wait / 1000.0}秒后重试…")
                sleepCancellable(wait, cancelled)
            }
            for (m in mirrors) {
                if (cancelled()) throw CancelledException()
                if (attempts > 0 && System.currentTimeMillis() - start > totalBudgetMs) break@rounds
                attempts++
                val retry = if (round > 0) "，第 ${round + 1} 轮" else ""
                onStatus("正在下载（${Mirrors.label(m)}$retry）")
                try {
                    fetchTo(m, part, partSrc, expectedSize, cancelled, onProgress)
                    verifyZip(part, requireGameFiles = isGameZip)
                    if (expectedSize > 0 && part.length() != expectedSize) {
                        lastError = IOException("文件大小不符（${part.length()} ≠ $expectedSize）")
                        alt.delete()
                        part.renameTo(alt)
                        partSrc.delete()
                        altUrl = m
                        continue
                    }
                    moveReplace(part, dest)
                    partSrc.delete()
                    alt.delete()
                    Mirrors.markGood(m)
                    onProgress(100)
                    return m
                } catch (e: CancelledException) {
                    throw e
                } catch (e: CorruptZipException) {
                    lastError = e
                    part.delete(); partSrc.delete()
                } catch (e: Exception) {
                    lastError = e // 半截文件保留，同一线路下次续传
                }
            }
        }
        if (alt.exists() && altUrl != null) {
            moveReplace(alt, dest)
            onProgress(100)
            return altUrl
        }
        throw DownloadException(friendlyMessage(lastError, attempts), lastError)
    }

    private fun fetchTo(
        url: String, part: File, partSrc: File, expectedSize: Long,
        cancelled: () -> Boolean, onProgress: (Int) -> Unit,
    ) {
        // 断点续传只在同一地址上进行（不同线路的缓存版本可能不同）
        var existing = 0L
        if (part.exists()) {
            val src = try { partSrc.readText() } catch (_: Exception) { "" }
            if (src == url && (expectedSize <= 0 || part.length() < expectedSize)) existing = part.length()
            else part.delete()
        }
        partSrc.writeText(url)

        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = connectTimeoutMs
            readTimeout = readTimeoutMs
            instanceFollowRedirects = true
            useCaches = false
            setRequestProperty("User-Agent", "Game100/1.0")
            setRequestProperty("Accept-Encoding", "identity")
            if (existing > 0) setRequestProperty("Range", "bytes=$existing-")
        }
        try {
            val code = conn.responseCode
            if (code == 416) { part.delete(); throw IOException("续传位置无效，重新下载") }
            if (code != HttpURLConnection.HTTP_OK && code != HttpURLConnection.HTTP_PARTIAL) {
                throw IOException("服务器返回 HTTP $code")
            }
            var append = false
            var total = conn.contentLengthLong
            if (code == HttpURLConnection.HTTP_PARTIAL) {
                // Content-Range: bytes 100-999/1234
                val cr = conn.getHeaderField("Content-Range") ?: ""
                val from = cr.substringAfter("bytes ", "").substringBefore("-").toLongOrNull()
                if (from != existing) throw IOException("续传位置不符")
                append = true
                total = cr.substringAfterLast("/").toLongOrNull() ?: -1L
            }
            if (total <= 0 && expectedSize > 0) total = expectedSize
            var done = if (append) existing else 0L
            val bodyExpected = conn.contentLengthLong
            var bodyRead = 0L
            conn.inputStream.use { ins ->
                FileOutputStream(part, append).use { out ->
                    val buf = ByteArray(32 * 1024)
                    var last = -1
                    while (true) {
                        if (cancelled()) throw CancelledException()
                        val n = ins.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                        done += n; bodyRead += n
                        if (total > 0) {
                            val p = (done * 100 / total).toInt().coerceIn(0, 99)
                            if (p != last) { last = p; onProgress(p) }
                        }
                    }
                    out.fd.sync()
                }
            }
            if (bodyExpected > 0 && bodyRead < bodyExpected) throw IOException("连接中断（$bodyRead/$bodyExpected）")
        } finally {
            conn.disconnect()
        }
    }

    /** 完整读一遍 zip：中央目录、每个条目的 CRC，并要求有 index.html 和 meta.json */
    @Throws(CorruptZipException::class)
    fun verifyZip(file: File, requireGameFiles: Boolean = true) {
        try {
            ZipFile(file).use { zf ->
                if (requireGameFiles && (zf.getEntry("index.html") == null || zf.getEntry("meta.json") == null)) {
                    throw CorruptZipException("游戏包不完整：缺少 index.html 或 meta.json")
                }
            }
            ZipInputStream(file.inputStream().buffered()).use { zis ->
                val buf = ByteArray(16 * 1024)
                var e = zis.nextEntry
                while (e != null) {
                    while (zis.read(buf) >= 0) { /* 读到底，ZipInputStream 会校验 CRC */ }
                    e = zis.nextEntry
                }
            }
        } catch (e: CorruptZipException) {
            throw e
        } catch (e: Exception) {
            throw CorruptZipException("游戏包损坏（${e.message ?: e.javaClass.simpleName}）")
        }
    }

    private fun moveReplace(from: File, to: File) {
        if (to.exists()) to.delete()
        if (!from.renameTo(to)) {
            from.copyTo(to, overwrite = true)
            from.delete()
        }
    }

    private fun sleepCancellable(ms: Long, cancelled: () -> Boolean) {
        val end = System.currentTimeMillis() + ms
        while (System.currentTimeMillis() < end) {
            if (cancelled()) throw CancelledException()
            Thread.sleep(minOf(100L, end - System.currentTimeMillis()).coerceAtLeast(1L))
        }
    }

    fun friendlyMessage(e: Throwable?, attempts: Int): String {
        val reason = when (e) {
            is SocketTimeoutException -> "网络超时"
            is UnknownHostException -> "无法连接网络"
            is CorruptZipException -> "下载的游戏包损坏"
            is InterruptedIOException -> "网络超时"
            is IOException -> if (e.message?.startsWith("服务器返回") == true) "服务器暂时不可用" else "网络连接中断"
            null -> "未知错误"
            else -> "下载出错"
        }
        return "$reason（已尝试 $attempts 次、多条线路）。请检查网络后点“重试”，已下载的部分会继续。"
    }
}
