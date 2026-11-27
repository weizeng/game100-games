package com.game100.center.net

import android.content.Context
import android.util.Log
import com.game100.center.BuildConfig
import com.game100.center.data.UserData
import org.json.JSONObject

/**
 * 全服评价离线容错与缓存同步层。
 * - 先落盘本地 UserData，再异步提交 Supabase
 * - 首页评分摘要缓存 30 分钟，离线或后端尚未建表时静默降级
 */
object ReviewSync {
    private const val TAG = "ReviewSync"
    private const val PREF_NAME = "game100_review_cache"
    private const val KEY_JSON = "summaries_json"
    private const val KEY_AT = "summaries_at"
    private const val CACHE_TTL_MS = 30L * 60L * 1000L

    @Volatile
    private var memCache: Map<String, ReviewApi.GameRatingBrief> = emptyMap()

    data class DetailPayload(
        val summary: ReviewApi.Summary?,
        val reviews: List<ReviewApi.ReviewItem>,
        val online: Boolean
    )

    fun cachedSummaryOf(gameId: String): ReviewApi.GameRatingBrief? = memCache[gameId]

    fun getAllCached(): Map<String, ReviewApi.GameRatingBrief> = memCache

    fun loadCachedFromDisk(context: Context): Map<String, ReviewApi.GameRatingBrief> {
        if (memCache.isNotEmpty()) return memCache
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_JSON, null) ?: return emptyMap()
        val parsed = parseSummaryMap(raw)
        if (parsed.isNotEmpty()) memCache = parsed
        return parsed
    }

    fun refreshAllSummariesIfStale(context: Context, force: Boolean = false): Map<String, ReviewApi.GameRatingBrief> {
        val local = loadCachedFromDisk(context)
        if (!ReviewApi.isConfigured || !BuildConfig.ONLINE_CATALOG) return local
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val lastAt = prefs.getLong(KEY_AT, 0L)
        if (!force && local.isNotEmpty() && (System.currentTimeMillis() - lastAt) < CACHE_TTL_MS) {
            return local
        }
        return try {
            val fresh = ReviewApi.getAllRatingSummaries()
            memCache = fresh
            prefs.edit()
                .putString(KEY_JSON, serializeSummaryMap(fresh))
                .putLong(KEY_AT, System.currentTimeMillis())
                .apply()
            fresh
        } catch (e: Exception) {
            Log.w(TAG, "summary sync skipped: ${e.message}")
            local
        }
    }

    fun fetchDetail(gameId: String): DetailPayload {
        if (!ReviewApi.isConfigured || !BuildConfig.ONLINE_CATALOG) {
            return DetailPayload(null, emptyList(), online = false)
        }
        return try {
            val summary = ReviewApi.getSummary(gameId)
            val reviews = ReviewApi.getReviews(gameId, 15)
            if (summary.count > 0) {
                val updated = HashMap(memCache)
                updated[gameId] = ReviewApi.GameRatingBrief(gameId, summary.avgRating, summary.count)
                memCache = updated
            }
            DetailPayload(summary, reviews, online = true)
        } catch (e: Exception) {
            Log.w(TAG, "detail fetch failed for $gameId: ${e.message}")
            DetailPayload(null, emptyList(), online = false)
        }
    }

    /** 先存本机评分/标签/短评，再尝试同步云端。返回是否同步上云成功。 */
    fun submit(
        context: Context,
        gameId: String,
        rating: Int,
        tags: List<String>,
        comment: String
    ): Boolean {
        val user = UserData(context)
        val safeRating = rating.coerceIn(1, 5)
        user.setRating(gameId, safeRating)
        user.setReviewDraft(gameId, tags, comment)
        if (!ReviewApi.isConfigured || !BuildConfig.ONLINE_CATALOG) return false
        return try {
            ReviewApi.submitReview(
                gameId = gameId,
                deviceId = user.getDeviceId(),
                nickname = user.getNickname(),
                rating = safeRating,
                tags = tags,
                comment = comment
            )
            true
        } catch (e: Exception) {
            Log.w(TAG, "submit failed for $gameId: ${e.message}")
            false
        }
    }

    internal fun serializeSummaryMap(map: Map<String, ReviewApi.GameRatingBrief>): String {
        val root = JSONObject()
        for ((id, item) in map) {
            root.put(id, JSONObject().put("a", item.avgRating).put("c", item.count))
        }
        return root.toString()
    }

    internal fun parseSummaryMap(raw: String): Map<String, ReviewApi.GameRatingBrief> {
        return try {
            val root = JSONObject(raw)
            val out = HashMap<String, ReviewApi.GameRatingBrief>()
            val keys = root.keys()
            while (keys.hasNext()) {
                val id = keys.next()
                val o = root.optJSONObject(id) ?: continue
                val avg = o.optDouble("a", 0.0)
                val cnt = o.optInt("c", 0)
                if (cnt > 0 && avg > 0.0) out[id] = ReviewApi.GameRatingBrief(id, avg, cnt)
            }
            out
        } catch (e: Exception) {
            emptyMap()
        }
    }
}
