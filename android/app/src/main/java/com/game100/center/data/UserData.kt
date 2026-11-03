package com.game100.center.data

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/**
 * 用户数据：评分、收藏、最高分、排行榜昵称与设备 ID（本地存储）。
 */
class UserData(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("game100_user", Context.MODE_PRIVATE)

    // ===== 评分 (1-5星) =====
    fun getRating(gameId: String): Int = prefs.getInt("rating_$gameId", 0)
    fun setRating(gameId: String, stars: Int) {
        prefs.edit().putInt("rating_$gameId", stars.coerceIn(1, 5)).apply()
    }

    // ===== 收藏 =====
    fun isFavorite(gameId: String): Boolean = prefs.getBoolean("fav_$gameId", false)
    fun toggleFavorite(gameId: String): Boolean {
        val new = !isFavorite(gameId)
        prefs.edit().putBoolean("fav_$gameId", new).apply()
        val set = getFavoriteIds().toMutableSet()
        if (new) set.add(gameId) else set.remove(gameId)
        prefs.edit().putStringSet("fav_ids", set).apply()
        return new
    }
    fun getFavoriteIds(): Set<String> = prefs.getStringSet("fav_ids", emptySet()) ?: emptySet()

    // ===== 最高分（本机） =====
    fun getBestScore(gameId: String): Int = prefs.getInt("score_$gameId", 0)
    fun reportScore(gameId: String, score: Int): Boolean {
        if (score > getBestScore(gameId)) {
            prefs.edit().putInt("score_$gameId", score).apply()
            return true
        }
        return false
    }


    // ===== 最近游玩（首页「继续玩」） =====
    fun recordRecentPlay(gameId: String) {
        if (gameId.isBlank()) return
        val list = getRecentPlayIds().toMutableList()
        list.remove(gameId)
        list.add(0, gameId)
        while (list.size > RECENT_CAP) list.removeAt(list.lastIndex)
        prefs.edit().putString(KEY_RECENT, list.joinToString(",")).apply()
    }

    fun getRecentPlayIds(): List<String> {
        val raw = prefs.getString(KEY_RECENT, null) ?: return emptyList()
        return raw.split(',').map { it.trim() }.filter { it.isNotEmpty() }
    }

    // ===== 排行榜身份 =====
    /** 稳定设备 ID，用于云端排行；卸载重装会变。 */
    fun getDeviceId(): String {
        val existing = prefs.getString(KEY_DEVICE_ID, null)
        if (!existing.isNullOrBlank()) return existing
        val id = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        return id
    }

    fun getNickname(): String {
        val n = prefs.getString(KEY_NICKNAME, null)?.trim().orEmpty()
        return if (n.isBlank()) DEFAULT_NICKNAME else n.take(24)
    }

    fun setNickname(name: String) {
        val cleaned = name.trim()
            .replace(Regex("[\\n\\r\\t]"), "")
            .take(24)
        prefs.edit().putString(KEY_NICKNAME, cleaned.ifBlank { DEFAULT_NICKNAME }).apply()
    }

    companion object {
        private const val KEY_DEVICE_ID = "leaderboard_device_id"
        private const val KEY_NICKNAME = "leaderboard_nickname"
        private const val KEY_RECENT = "recent_plays"
        private const val RECENT_CAP = 20
        const val DEFAULT_NICKNAME = "玩家"
    }
}
