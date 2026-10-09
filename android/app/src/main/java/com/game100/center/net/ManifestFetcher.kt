package com.game100.center.net

import com.game100.center.model.RemoteGame
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

object ManifestFetcher {
    @Throws(Exception::class)
    fun fetch(url: String): List<RemoteGame> {
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
                        size = o.optLong("size", 0)
                    )
                )
            }
            return list
        } finally {
            conn.disconnect()
        }
    }
}
