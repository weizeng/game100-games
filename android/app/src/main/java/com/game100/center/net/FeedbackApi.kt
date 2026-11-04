package com.game100.center.net

import com.game100.center.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Supabase 反馈表客户端（仅 anon key）。
 * 写入走 REST INSERT；读/改 status 供巡检脚本与日常修复任务使用。
 */
object FeedbackApi {

    /** 与 SQL check + App 芯片一致 */
    val CATEGORIES = listOf(
        Category("crash_black", "闪退/黑屏"),
        Category("stuck", "玩法卡死"),
        Category("visual", "画面异常"),
        Category("hard_to_find", "找不到游戏"),
        Category("other", "其他")
    )

    data class Category(val id: String, val label: String)

    data class Feedback(
        val id: String,
        val createdAt: String,
        val category: String,
        val message: String,
        val gameId: String?,
        val appVersion: String?,
        val deviceInfo: String?,
        val deviceId: String?,
        val status: String
    )

    val isConfigured: Boolean
        get() = BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_ANON_KEY.isNotBlank()

    @Throws(Exception::class)
    fun submit(
        category: String,
        message: String,
        gameId: String?,
        appVersion: String,
        deviceInfo: String,
        deviceId: String
    ): String {
        requireConfigured()
        val cat = category.trim()
        if (CATEGORIES.none { it.id == cat }) throw IOException("无效反馈类型")
        val body = JSONObject()
            .put("category", cat)
            .put("message", message.trim().take(2000))
            .put("app_version", appVersion.take(32))
            .put("device_info", deviceInfo.take(240))
            .put("device_id", deviceId.take(80))
            .put("status", "open")
        if (!gameId.isNullOrBlank()) {
            body.put("game_id", gameId.trim().take(64))
        } else {
            body.put("game_id", JSONObject.NULL)
        }
        val raw = request(
            method = "POST",
            path = "/rest/v1/feedbacks",
            body = body.toString(),
            extraHeaders = mapOf(
                "Prefer" to "return=representation",
                "Accept" to "application/json"
            )
        )
        val arr = JSONArray(raw.ifBlank { "[]" })
        if (arr.length() == 0) throw IOException("提交无返回")
        return arr.getJSONObject(0).optString("id", "")
    }

    @Throws(Exception::class)
    fun listOpen(limit: Int = 50): List<Feedback> {
        requireConfigured()
        val lim = limit.coerceIn(1, 100)
        val raw = request(
            method = "GET",
            path = "/rest/v1/feedbacks?status=eq.open&order=created_at.asc&limit=$lim&select=*",
            body = null,
            extraHeaders = mapOf("Accept" to "application/json")
        )
        val arr = JSONArray(raw.ifBlank { "[]" })
        val out = ArrayList<Feedback>(arr.length())
        for (i in 0 until arr.length()) {
            out.add(parse(arr.getJSONObject(i)))
        }
        return out
    }

    @Throws(Exception::class)
    fun setStatus(id: String, status: String) {
        requireConfigured()
        val st = status.trim()
        if (st !in setOf("open", "triaged", "fixed", "wontfix", "duplicate")) {
            throw IOException("无效 status")
        }
        val body = JSONObject().put("status", st)
        request(
            method = "PATCH",
            path = "/rest/v1/feedbacks?id=eq.${id.trim()}",
            body = body.toString(),
            extraHeaders = mapOf(
                "Prefer" to "return=minimal",
                "Content-Type" to "application/json"
            )
        )
    }

    private fun parse(o: JSONObject): Feedback = Feedback(
        id = o.optString("id"),
        createdAt = o.optString("created_at"),
        category = o.optString("category"),
        message = o.optString("message"),
        gameId = o.optString("game_id").takeIf { it.isNotBlank() && it != "null" },
        appVersion = o.optString("app_version").takeIf { it.isNotBlank() && it != "null" },
        deviceInfo = o.optString("device_info").takeIf { it.isNotBlank() && it != "null" },
        deviceId = o.optString("device_id").takeIf { it.isNotBlank() && it != "null" },
        status = o.optString("status", "open")
    )

    private fun requireConfigured() {
        if (!isConfigured) throw IOException("反馈未配置")
    }

    private fun request(
        method: String,
        path: String,
        body: String?,
        extraHeaders: Map<String, String>
    ): String {
        val base = BuildConfig.SUPABASE_URL.trimEnd('/')
        val url = URL("$base$path")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 8_000
            readTimeout = 10_000
            useCaches = false
            doInput = true
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
            setRequestProperty("User-Agent", "Game100/${BuildConfig.VERSION_NAME}")
            for ((k, v) in extraHeaders) setRequestProperty(k, v)
            if (body != null) {
                doOutput = true
                if (getRequestProperty("Content-Type") == null) {
                    setRequestProperty("Content-Type", "application/json")
                }
            }
        }
        try {
            if (body != null) {
                conn.outputStream.use { os ->
                    os.write(body.toByteArray(StandardCharsets.UTF_8))
                }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.readText().orEmpty()
            if (code !in 200..299) {
                throw IOException("反馈 HTTP $code: ${text.take(200)}")
            }
            return text
        } finally {
            conn.disconnect()
        }
    }
}
