package com.game100.center.net

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.OutputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.nio.file.Files
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/** 用本地 HTTP 服务器模拟慢速 / 卡死 / 掉线 / 坏包 / 5xx 的网络 */
class GameDownloaderTest {
    private lateinit var server: MiniHttpServer
    private lateinit var dir: File
    private val zip: ByteArray = makeZip(200_000)
    private val hits = AtomicInteger()
    private val active = AtomicInteger()
    private val maxActive = AtomicInteger()

    @Before
    fun setUp() {
        dir = Files.createTempDirectory("dl").toFile()
        server = MiniHttpServer()
        // 正常（支持 Range）
        server.createContext("/ok") { ex -> track { serve(ex, zip) } }
        // 慢但不断流：每 50ms 发 20KB
        server.createContext("/slow") { ex -> track { serve(ex, zip, chunk = 20_000, delayMs = 50) } }
        // 发完响应头后卡死（触发读取超时）
        server.createContext("/stall") { ex ->
            track {
                ex.sendResponseHeaders(200, zip.size.toLong())
                ex.out.write(zip, 0, 1000); ex.out.flush()
                Thread.sleep(3_000)
                ex.close()
            }
        }
        // 发一半就断开
        server.createContext("/cut") { ex ->
            track {
                ex.sendResponseHeaders(200, zip.size.toLong())
                ex.out.write(zip, 0, zip.size / 2); ex.out.flush()
                ex.close()
            }
        }
        // 返回内容被截断但长度头也是截断的（看起来"完整"的坏 zip）
        server.createContext("/corrupt") { ex -> track { serve(ex, zip.copyOf(zip.size - 500)) } }
        // 前两次 503，之后正常
        val flaky = AtomicInteger()
        server.createContext("/flaky") { ex ->
            track {
                if (flaky.incrementAndGet() <= 2) { ex.sendResponseHeaders(503, -1); ex.close() } else serve(ex, zip)
            }
        }
        // 第一次只给前 60% 后断开，之后正常（测试断点续传）
        val resumeHits = AtomicInteger()
        server.createContext("/resume") { ex ->
            track {
                if (resumeHits.incrementAndGet() == 1) {
                    ex.sendResponseHeaders(200, zip.size.toLong())
                    ex.out.write(zip, 0, zip.size * 6 / 10); ex.out.flush(); ex.close()
                } else serve(ex, zip)
            }
        }
        server.start()
        GameDownloader.connectTimeoutMs = 1_000
        GameDownloader.readTimeoutMs = 800
        GameDownloader.backoffMs = longArrayOf(50, 100)
        GameDownloader.maxRounds = 3
        GameDownloader.totalBudgetMs = 60_000
        Mirrors.preferredHost = null
    }

    @After
    fun tearDown() {
        Mirrors.testOverride = null
        server.stop()
        dir.deleteRecursively()
    }

    private fun base() = "http://127.0.0.1:${server.port}"

    private fun mirrors(vararg paths: String) {
        Mirrors.testOverride = { _ -> paths.map { base() + it } }
    }

    private inline fun track(block: () -> Unit) {
        hits.incrementAndGet()
        val n = active.incrementAndGet()
        maxActive.accumulateAndGet(n) { a, b -> maxOf(a, b) }
        try { block() } catch (_: Exception) { } finally { active.decrementAndGet() }
    }

    private fun serve(ex: Exchange, body: ByteArray, chunk: Int = body.size, delayMs: Long = 0) {
        val range = ex.headers["range"]
        var from = 0
        if (range != null) {
            from = range.removePrefix("bytes=").substringBefore("-").toInt()
            ex.extraHeaders["Content-Range"] = "bytes $from-${body.size - 1}/${body.size}"
            ex.sendResponseHeaders(206, (body.size - from).toLong())
        } else {
            ex.sendResponseHeaders(200, body.size.toLong())
        }
        ex.out.use { out ->
            var i = from
            while (i < body.size) {
                val n = minOf(chunk, body.size - i)
                if (delayMs > 0 && i > from) Thread.sleep(delayMs)
                out.write(body, i, n); out.flush(); i += n
            }
        }
    }

    private fun dest() = File(dir, "game.zip")

    @Test
    fun okDownloadIsVerifiedAndAtomic() {
        mirrors("/ok")
        val used = GameDownloader.download("x", dest(), zip.size.toLong())
        assertTrue(used.endsWith("/ok"))
        assertTrue(dest().readBytes().contentEquals(zip))
        assertFalse(File(dest().path + ".part").exists())
    }

    @Test
    fun slowButSteadyServerIsNotATimeout() {
        // 总耗时 ~0.5s，远大于"单次读取超时"的一半，验证不是按总时长计时
        GameDownloader.readTimeoutMs = 400
        mirrors("/slow")
        GameDownloader.download("x", dest(), zip.size.toLong())
        assertTrue(dest().readBytes().contentEquals(zip))
    }

    @Test
    fun stalledMirrorFallsBackToNextMirror() {
        mirrors("/stall", "/ok")
        val t0 = System.currentTimeMillis()
        val used = GameDownloader.download("x", dest(), zip.size.toLong())
        assertTrue(used.endsWith("/ok"))
        assertTrue(System.currentTimeMillis() - t0 < 5_000)
        assertTrue(dest().readBytes().contentEquals(zip))
    }

    @Test
    fun droppedConnectionThenNextMirror() {
        mirrors("/cut", "/ok")
        GameDownloader.download("x", dest(), zip.size.toLong())
        assertTrue(dest().readBytes().contentEquals(zip))
    }

    @Test
    fun corruptZipIsRejected() {
        mirrors("/corrupt", "/ok")
        val used = GameDownloader.download("x", dest(), 0)
        assertTrue(used.endsWith("/ok"))
        assertTrue(dest().readBytes().contentEquals(zip))
    }

    @Test
    fun retriesWithBackoffOn5xx() {
        mirrors("/flaky")
        GameDownloader.download("x", dest(), zip.size.toLong())
        assertTrue(dest().readBytes().contentEquals(zip))
        assertEquals(3, hits.get())
    }

    @Test
    fun resumesWithRangeOnSameMirror() {
        mirrors("/resume")
        GameDownloader.download("x", dest(), zip.size.toLong())
        assertTrue(dest().readBytes().contentEquals(zip))
    }

    @Test
    fun allMirrorsFailGivesFriendlyErrorAndCleanDest() {
        GameDownloader.maxRounds = 2
        mirrors("/stall", "/missing")
        try {
            GameDownloader.download("x", dest(), zip.size.toLong())
            fail("应当失败")
        } catch (e: GameDownloader.DownloadException) {
            assertTrue(e.userMessage, e.userMessage.contains("重试"))
            assertTrue(e.userMessage, e.userMessage.contains("4 次"))
        }
        assertFalse(dest().exists())
    }

    @Test
    fun sizeMismatchStillAcceptsValidZipWhenNoBetterMirror() {
        mirrors("/ok")
        GameDownloader.download("x", dest(), zip.size.toLong() + 123)
        assertTrue(dest().readBytes().contentEquals(zip))
    }

    @Test
    fun cancelStopsDownload() {
        mirrors("/slow")
        try {
            GameDownloader.download("x", dest(), zip.size.toLong(), cancelled = { true })
            fail("应当取消")
        } catch (_: GameDownloader.CancelledException) { }
        assertFalse(dest().exists())
    }

    @Test
    fun atMostTwoParallelDownloads() {
        mirrors("/slow")
        val pool = Executors.newFixedThreadPool(5)
        val done = CountDownLatch(5)
        val errors = AtomicInteger()
        repeat(5) { i ->
            pool.execute {
                try { GameDownloader.download("x", File(dir, "g$i.zip"), zip.size.toLong()) }
                catch (e: Exception) { errors.incrementAndGet() }
                finally { done.countDown() }
            }
        }
        assertTrue(done.await(30, TimeUnit.SECONDS))
        assertEquals(0, errors.get())
        assertTrue("maxActive=${maxActive.get()}", maxActive.get() <= GameDownloader.MAX_PARALLEL)
        pool.shutdown()
    }

    @Test
    fun jsdelivrUrlExpandsToAllMirrors() {
        Mirrors.testOverride = null
        val c = Mirrors.candidates("https://cdn.jsdelivr.net/gh/weizeng/game100-games@main/acidbase.zip")
        assertEquals(
            listOf(
                "https://cdn.jsdelivr.net/gh/weizeng/game100-games@main/acidbase.zip",
                "https://fastly.jsdelivr.net/gh/weizeng/game100-games@main/acidbase.zip",
                "https://gcore.jsdelivr.net/gh/weizeng/game100-games@main/acidbase.zip",
                "https://testingcf.jsdelivr.net/gh/weizeng/game100-games@main/acidbase.zip",
                "https://raw.githubusercontent.com/weizeng/game100-games/main/acidbase.zip",
            ), c
        )
        Mirrors.markGood("https://gcore.jsdelivr.net/gh/weizeng/game100-games@main/manifest.json")
        assertEquals("gcore.jsdelivr.net", Mirrors.hostOf(Mirrors.candidates(c[0])[0]))
        Mirrors.preferredHost = null
        assertEquals(listOf("https://example.com/a.zip"), Mirrors.candidates("https://example.com/a.zip"))
    }

    /** 极简 HTTP/1.1 服务器（单元测试编译时没有 com.sun.net.httpserver） */
    class Exchange(private val socket: Socket, val path: String, val headers: Map<String, String>) {
        val out: OutputStream = socket.getOutputStream()
        val extraHeaders = LinkedHashMap<String, String>()
        private val reasons = mapOf(200 to "OK", 206 to "Partial Content", 404 to "Not Found", 503 to "Service Unavailable")
        fun sendResponseHeaders(code: Int, length: Long) {
            val sb = StringBuilder("HTTP/1.1 $code ${reasons[code] ?: "X"}\r\nConnection: close\r\n")
            sb.append("Content-Length: ${if (length < 0) 0 else length}\r\n")
            extraHeaders.forEach { (k, v) -> sb.append("$k: $v\r\n") }
            sb.append("\r\n")
            out.write(sb.toString().toByteArray()); out.flush()
        }
        fun close() = try { socket.close() } catch (_: Exception) {}
    }

    class MiniHttpServer {
        private val ss = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
        private val handlers = HashMap<String, (Exchange) -> Unit>()
        private val pool = Executors.newCachedThreadPool()
        val port: Int get() = ss.localPort
        fun createContext(path: String, h: (Exchange) -> Unit) { handlers[path] = h }
        fun start() {
            pool.execute {
                while (!ss.isClosed) {
                    val sock = try { ss.accept() } catch (_: Exception) { break }
                    pool.execute { handle(sock) }
                }
            }
        }
        private fun handle(sock: Socket) {
            try {
                val ins = sock.getInputStream().bufferedReader(Charsets.ISO_8859_1)
                val requestLine = ins.readLine() ?: return
                val path = requestLine.split(" ")[1]
                val headers = HashMap<String, String>()
                while (true) {
                    val line = ins.readLine() ?: break
                    if (line.isEmpty()) break
                    headers[line.substringBefore(":").trim().lowercase()] = line.substringAfter(":").trim()
                }
                val ex = Exchange(sock, path, headers)
                val h = handlers[path]
                if (h == null) { ex.sendResponseHeaders(404, 0) } else h(ex)
            } catch (_: Exception) {
            } finally {
                try { sock.close() } catch (_: Exception) {}
            }
        }
        fun stop() { try { ss.close() } catch (_: Exception) {}; pool.shutdownNow() }
    }

    companion object {
        fun makeZip(padding: Int): ByteArray {
            val bos = ByteArrayOutputStream()
            ZipOutputStream(bos).use { z ->
                z.putNextEntry(ZipEntry("index.html")); z.write("<html>ok</html>".toByteArray()); z.closeEntry()
                z.putNextEntry(ZipEntry("meta.json")); z.write("""{"id":"t","version":3}""".toByteArray()); z.closeEntry()
                // 不可压缩的随机数据，让文件足够大
                z.setLevel(0)
                z.putNextEntry(ZipEntry("data.bin")); z.write(java.util.Random(1).let { r -> ByteArray(padding).also { r.nextBytes(it) } }); z.closeEntry()
            }
            return bos.toByteArray()
        }
    }
}
