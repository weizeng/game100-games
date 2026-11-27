package com.game100.center.net

import com.game100.center.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Supabase 全服评分、印象标签与短评客户端（仅 anon key + RPC）。
 * 任何网络异常均抛给调用方降级为本地评分，绝不影响离线游玩。
 */
object ReviewApi {

    val PRESET_TAGS = listOf("解压上头", "画面精致", "操作顺手", "烧脑耐玩", "节奏爽快", "难度偏高")

    data class TagCount(
        val tag: String,
        val count: Int
    )

    data class Summary(
        val avgRating: Double,
        val count: Int,
        val topTags: List<TagCount> = emptyList()
    )

    data class ReviewItem(
        val nickname: String,
        val rating: Int,
        val tags: List<String>,
        val comment: String,
        val updatedAt: String? = null
    )

    data class GameRatingBrief(
        val gameId: String,
        val avgRating: Double,
        val count: Int
    )

    val isConfigured: Boolean
        get() = BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_ANON_KEY.isNotBlank()

    @Throws(Exception::class)
    fun submitReview(
        gameId: String,
        deviceId: String,
        nickname: String,
        rating: Int,
        tags: List<String> = emptyList(),
        comment: String = ""
    ) {
        requireConfigured()
        val safeTags = JSONArray()
        tags.filter { it in PRESET_TAGS }.distinct().take(3).forEach { safeTags.put(it) }
        val body = JSONObject()
            .put("p_game_id", gameId)
            .put("p_device_id", deviceId)
            .put("p_nickname", nickname.ifBlank { "玩家" }.take(24))
            .put("p_rating", rating.coerceIn(1, 5))
            .put("p_tags", safeTags)
            .put("p_comment", comment.trim().take(200))
        postRpcRaw("submit_review", body)
    }

    @Throws(Exception::class)
    fun getSummary(gameId: String): Summary {
        requireConfigured()
        val raw = postRpcRaw("get_game_review_summary", JSONObject().put("p_game_id", gameId))
        val obj = JSONObject(raw)
        val tagsArr = obj.optJSONArray("tags") ?: JSONArray()
        val tags = ArrayList<TagCount>(tagsArr.length())
        for (i in 0 until tagsArr.length()) {
            val t = tagsArr.optJSONObject(i) ?: continue
            val name = t.optString("tag", "")
            val cnt = t.optInt("count", 0)
            if (name.isNotBlank() && cnt > 0) tags.add(TagCount(name, cnt))
        }
        return Summary(
            avgRating = obj.optDouble("avg_rating", 0.0),
            count = obj.optInt("count", 0),
            topTags = tags
        )
    }

    @Throws(Exception::class)
    fun getReviews(gameId: String, limit: Int = 15): List<ReviewItem> {
        requireConfigured()
        val body = JSONObject()
            .put("p_game_id", gameId)
            .put("p_limit", limit.coerceIn(1, 50))
        val raw = postRpcRaw("get_game_reviews", body)
        val arr = if (raw.trim().startsWith("[")) JSONArray(raw) else JSONArray()
        val out = ArrayList<ReviewItem>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val tagsArr = o.optJSONArray("tags") ?: JSONArray()
            val tags = ArrayList<String>(tagsArr.length())
            for (j in 0 until tagsArr.length()) {
                val t = tagsArr.optString(j, "")
                if (t.isNotBlank()) tags.add(t)
            }
            out.add(
                ReviewItem(
                    nickname = o.optString("nickname", "玩家").ifBlank { "玩家" },
                    rating = o.optInt("rating", 5).coerceIn(1, 5),
                    tags = tags,
                    comment = o.optString("comment", "").trim(),
                    updatedAt = o.optString("updated_at", null)
                )
            )
        }
        return out
    }

    @Throws(Exception::class)
    fun getAllRatingSummaries(): Map<String, GameRatingBrief> {
        requireConfigured()
        val raw = postRpcRaw("get_all_rating_summaries", JSONObject())
        val arr = if (raw.trim().startsWith("[")) JSONArray(raw) else JSONArray()
        val out = HashMap<String, GameRatingBrief>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val id = o.optString("game_id", "")
            val cnt = o.optInt("review_count", 0)
            val avg = o.optDouble("avg_rating", 0.0)
            if (id.isNotBlank() && cnt > 0 && avg > 0.0) {
                out[id] = GameRatingBrief(id, avg, cnt)
            }
        }
        return out
    }

    private fun requireConfigured() {
        if (!isConfigured) throw IOException("评价服务未配置")
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
            setRequestProperty("Prefer", "return=representation")
            setRequestProperty("User-Agent", "Game500/${BuildConfig.VERSION_NAME}")
        }
        try {
            conn.outputStream.use { os ->
                os.write(body.toString().toByteArray(StandardCharsets.UTF_8))
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.readText().orEmpty()
            if (code !in 200..299) {
                throw IOException("评价 HTTP $code: ${text.take(200)}")
            }
            return text.ifBlank { "{}" }
        } finally {
            conn.disconnect()
        }
    }
}
