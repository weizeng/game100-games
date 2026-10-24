package com.game100.center.net

import com.game100.center.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Supabase 排行榜客户端（仅 anon key + RPC）。
 * 网络失败时抛异常，由调用方降级到本地，不得让 App 崩溃。
 */
object LeaderboardApi {

    data class Entry(
        val rank: Long,
        val nickname: String,
        val score: Int,
        val updatedAt: String? = null
    )

    data class SubmitResult(
        val score: Int,
        val nickname: String
    )

    data class MyRank(
        val ranked: Boolean,
        val rank: Long = 0,
        val score: Int = 0,
        val nickname: String = ""
    )

    val isConfigured: Boolean
        get() = BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_ANON_KEY.isNotBlank()

    @Throws(Exception::class)
    fun submitScore(gameId: String, deviceId: String, nickname: String, score: Int): SubmitResult {
        requireConfigured()
        val body = JSONObject()
            .put("p_game_id", gameId)
            .put("p_device_id", deviceId)
            .put("p_nickname", nickname.ifBlank { "玩家" })
            .put("p_score", score)
        val json = postRpc("submit_score", body)
        return SubmitResult(
            score = json.optInt("score", score),
            nickname = json.optString("nickname", nickname)
        )
    }

    @Throws(Exception::class)
    fun getLeaderboard(gameId: String, limit: Int = 20): List<Entry> {
        requireConfigured()
        val body = JSONObject()
            .put("p_game_id", gameId)
            .put("p_limit", limit.coerceIn(1, 100))
        val raw = postRpcRaw("get_leaderboard", body)
        val arr = when {
            raw.trim().startsWith("[") -> JSONArray(raw)
            else -> JSONObject(raw).optJSONArray("data") ?: JSONArray()
        }
        val out = ArrayList<Entry>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            out.add(
                Entry(
                    rank = o.optLong("rank", (i + 1).toLong()),
                    nickname = o.optString("nickname", "玩家"),
                    score = o.optInt("score", 0),
                    updatedAt = o.optString("updated_at", null)
                )
            )
        }
        return out
    }

    @Throws(Exception::class)
    fun getMyRank(gameId: String, deviceId: String): MyRank {
        requireConfigured()
        val body = JSONObject()
            .put("p_game_id", gameId)
            .put("p_device_id", deviceId)
        val json = postRpc("get_my_rank", body)
        if (!json.optBoolean("ranked", false)) return MyRank(ranked = false)
        return MyRank(
            ranked = true,
            rank = json.optLong("rank", 0),
            score = json.optInt("score", 0),
            nickname = json.optString("nickname", "玩家")
        )
    }

    private fun requireConfigured() {
        if (!isConfigured) throw IOException("排行榜未配置")
    }

    private fun postRpc(fn: String, body: JSONObject): JSONObject {
        val raw = postRpcRaw(fn, body)
        return JSONObject(raw)
    }

    private fun postRpcRaw(fn: String, body: JSONObject): String {
        val base = BuildConfig.SUPABASE_URL.trimEnd('/')
        val url = URL("$base/rest/v1/rpc/$fn")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8_000
            readTimeout = 10_000
            doOutput = true
            useCaches = false
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
            setRequestProperty("Accept", "application/json")
            // Prefer return=representation for single-object RPCs; arrays still come back fine.
            setRequestProperty("Prefer", "return=representation")
            setRequestProperty("User-Agent", "Game100/${BuildConfig.VERSION_NAME}")
        }
        try {
            conn.outputStream.use { os ->
                os.write(body.toString().toByteArray(StandardCharsets.UTF_8))
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.readText().orEmpty()
            if (code !in 200..299) {
                throw IOException("排行榜 HTTP $code: ${text.take(200)}")
            }
            return text.ifBlank { "{}" }
        } finally {
            conn.disconnect()
        }
    }
}
