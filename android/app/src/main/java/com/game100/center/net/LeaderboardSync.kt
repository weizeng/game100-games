package com.game100.center.net

import android.content.Context
import android.util.Log
import com.game100.center.BuildConfig
import com.game100.center.data.UserData

/**
 * 把本机最高分同步到 Supabase；任何异常都吞掉，只打日志。
 * ONLINE_CATALOG=false 或未配置时直接跳过。
 */
object LeaderboardSync {
    private const val TAG = "LeaderboardSync"

    fun submitBest(context: Context, gameId: String, score: Int) {
        if (score <= 0) return
        if (!LeaderboardApi.isConfigured) return
        if (!BuildConfig.ONLINE_CATALOG) return // 无在线目录渠道不联网
        try {
            val user = UserData(context)
            // 先保证本机纪录
            user.reportScore(gameId, score)
            LeaderboardApi.submitScore(
                gameId = gameId,
                deviceId = user.getDeviceId(),
                nickname = user.getNickname(),
                score = score
            )
        } catch (e: Exception) {
            Log.w(TAG, "submit failed for $gameId: ${e.message}")
        }
    }

    fun fetchTop(context: Context, gameId: String, limit: Int = 10): List<LeaderboardApi.Entry> {
        if (!LeaderboardApi.isConfigured) return emptyList()
        if (!BuildConfig.ONLINE_CATALOG) return emptyList()
        return try {
            LeaderboardApi.getLeaderboard(gameId, limit)
        } catch (e: Exception) {
            Log.w(TAG, "fetch failed for $gameId: ${e.message}")
            emptyList()
        }
    }

    fun fetchMyRank(context: Context, gameId: String): LeaderboardApi.MyRank? {
        if (!LeaderboardApi.isConfigured || !BuildConfig.ONLINE_CATALOG) return null
        return try {
            val user = UserData(context)
            LeaderboardApi.getMyRank(gameId, user.getDeviceId())
        } catch (e: Exception) {
            Log.w(TAG, "rank failed for $gameId: ${e.message}")
            null
        }
    }
}
