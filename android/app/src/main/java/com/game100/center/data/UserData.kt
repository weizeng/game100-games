package com.game100.center.data

import android.content.Context
import android.content.SharedPreferences

/**
 * 用户数据：评分、收藏、最高分（本地存储）
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
        // 维护收藏 ID 集合，方便列表查询
        val set = getFavoriteIds().toMutableSet()
        if (new) set.add(gameId) else set.remove(gameId)
        prefs.edit().putStringSet("fav_ids", set).apply()
        return new
    }
    fun getFavoriteIds(): Set<String> = prefs.getStringSet("fav_ids", emptySet()) ?: emptySet()

    // ===== 最高分 =====
    fun getBestScore(gameId: String): Int = prefs.getInt("score_$gameId", 0)
    fun reportScore(gameId: String, score: Int): Boolean {
        if (score > getBestScore(gameId)) {
            prefs.edit().putInt("score_$gameId", score).apply()
            return true // 破纪录
        }
        return false
    }
}
