package com.game100.center.net

import com.game100.center.model.RemoteGame
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

object ManifestFetcher {
    @Throws(Exception::class)
    fun fetch(url: String): List<RemoteGame> {
        // 多地址容灾：cdn.jsdelivr.net → fastly.jsdelivr.net → raw.githubusercontent.com
        val urls = buildFallbackUrls(url)
        var lastError: Exception? = null
        for (u in urls) {
            try {
                return fetchSingle(u)
            } catch (e: Exception) {
                lastError = e
            }
        }
        throw lastError ?: IOException("游戏源连接失败")
    }

    private fun buildFallbackUrls(url: String): List<String> {
        val list = mutableListOf(url)
        val marker = "cdn.jsdelivr.net/gh/"
        if (url.contains(marker)) {
            val after = url.substringAfter(marker)
            list.add("https://fastly.jsdelivr.net/gh/$after")
            val atIdx = after.indexOf("@")
            if (atIdx > 0) {
                val repo = after.substring(0, atIdx)
                val branchPath = after.substring(atIdx + 1)
                list.add("https://raw.githubusercontent.com/$repo/$branchPath")
            }
        }
        return list.distinct()
    }

    @Throws(Exception::class)
    private fun fetchSingle(url: String): List<RemoteGame> {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 15000
            setRequestProperty("User-Agent", "Game100/1.0")
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
