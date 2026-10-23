package com.game100.center.net

import com.game100.center.model.RemoteGame
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

object ManifestFetcher {
    @Throws(Exception::class)
    fun fetch(url: String): List<RemoteGame> {
        // 多线路容灾（见 Mirrors），最多 2 轮，轮间等 1 秒
        val urls = Mirrors.candidates(url).map { withCacheBust(it) }
        var lastError: Exception? = null
        for (round in 0 until 2) {
            if (round > 0) Thread.sleep(1_000)
            for (u in urls) {
                try {
                    val list = fetchSingle(u)
                    Mirrors.markGood(u.substringBefore("?"))
                    return list
                } catch (e: Exception) {
                    lastError = e
                }
            }
        }
        throw lastError ?: IOException("游戏源连接失败")
    }

    /** 10 分钟一档的查询参数，避开 jsDelivr / 运营商对 @main 的长时间缓存。 */
    private fun withCacheBust(url: String): String {
        val bucket = System.currentTimeMillis() / 600_000L
        val sep = if (url.contains("?")) "&" else "?"
        return "$url${sep}cb=$bucket"
    }

    @Throws(Exception::class)
    private fun fetchSingle(url: String): List<RemoteGame> {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = GameDownloader.connectTimeoutMs
            readTimeout = GameDownloader.readTimeoutMs
            useCaches = false
            setRequestProperty("User-Agent", "Game100/1.0")
            setRequestProperty("Cache-Control", "no-cache")
            setRequestProperty("Pragma", "no-cache")
            instanceFollowRedirects = true
        }
        try {
            conn.connect()
            if (conn.responseCode != HttpURLConnection.HTTP_OK) {
                throw IOException("游戏源返回 HTTP ${conn.responseCode}")
            }
            val text = conn.inputStream.bufferedReader(Charsets.UTF_8).readText()
            val arr = JSONObject(text).optJSONArray("games")
                ?: throw IOException("manifest.json 格式错误：缺少 games 数组")
            val list = mutableListOf<RemoteGame>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                list.add(
                    RemoteGame(
                        id = o.getString("id"),
                        name = o.optString("name", o.getString("id")),
                        desc = o.optString("desc", ""),
                        version = o.optInt("version", 1),
                        icon = o.optString("icon", "🎮"),
                        color = o.optString("color", "#607D8B"),
                        category = o.optString("category", "休闲趣味"),
                        url = o.optString("url", ""),
                        size = o.optLong("size", 0),
                        premium = o.optBoolean("premium", false),
                        featured = o.optInt("featured", 0),
                        studio = o.optString("studio", "")
                    )
                )
            }
            return list
        } finally {
            conn.disconnect()
        }
    }
}
