package com.game100.center.data

import com.game100.center.model.GameItem
import java.util.Calendar
import java.util.TimeZone

/**
 * 首页发现区选片：新鲜度 + 分类/出品方多样性 + 轻量个性化 + 按日微旋转。
 * 纯函数，便于单测；不碰 SharedPreferences。
 */
object HomeRecommend {
    const val FEATURED_CAP = 10
    const val NEW_CAP = 16
    const val CONTINUE_CAP = 8
    const val MAX_PER_CATEGORY = 2

    data class Signals(
        val favoriteIds: Set<String> = emptySet(),
        /** 最近玩过，越靠前越新 */
        val recentIds: List<String> = emptyList(),
        val ratingOf: (String) -> Int = { 0 },
        val scoreOf: (String) -> Int = { 0 },
        /** 首次出现时间戳（毫秒）；0 = 老游戏 / 未知 */
        val seenAtOf: (String) -> Long = { 0L },
        /** 用于每日微旋转；默认用新加坡日历日 */
        val daySeed: Int = defaultDaySeed(),
    )

    fun defaultDaySeed(
        nowMs: Long = System.currentTimeMillis(),
        zone: TimeZone = TimeZone.getTimeZone("Asia/Singapore"),
    ): Int {
        val cal = Calendar.getInstance(zone)
        cal.timeInMillis = nowMs
        return cal.get(Calendar.YEAR) * 1000 + cal.get(Calendar.DAY_OF_YEAR)
    }

    /** 「为你推荐」：混合新鲜度、更新、精选位、收藏/最近玩、分类与 Muse/Grok 多样性。 */
    fun pickFeatured(items: List<GameItem>, signals: Signals, limit: Int = FEATURED_CAP): List<GameItem> {
        if (items.isEmpty() || limit <= 0) return emptyList()
        val seed = signals.daySeed
        fun rotateNoise(id: String): Long {
            val h = id.hashCode() xor (seed * 31)
            return (h and 0x7fff).toLong() // 0..32767，轻量日更
        }
        fun freshness(g: GameItem): Long {
            var s = 0L
            if (g.isNew) s += 1_000_000L
            if (g.hasUpdate) s += 420_000L
            if (g.isPremium) s += 180_000L
            if (g.featuredRank > 0) {
                s += (120_000L - g.featuredRank * 2_000L).coerceAtLeast(1_000L)
            }
            s += g.displayVersion * 80L
            return s
        }
        fun personal(g: GameItem): Long {
            var s = 0L
            if (g.id in signals.favoriteIds) s += 480_000L
            val ri = signals.recentIds.indexOf(g.id)
            if (ri >= 0) s += (280_000L - ri * 18_000L).coerceAtLeast(20_000L)
            s += signals.ratingOf(g.id).coerceIn(0, 5) * 36_000L
            if (signals.scoreOf(g.id) > 0) s += 55_000L
            return s
        }
        fun score(g: GameItem): Long = freshness(g) + personal(g) + rotateNoise(g.id)

        val remaining = items.sortedByDescending { score(it) }.toMutableList()
        val picked = ArrayList<GameItem>(limit)
        val catCount = HashMap<String, Int>()
        var muse = 0
        var grok = 0

        fun accept(g: GameItem, respectCatCap: Boolean): Boolean {
            if (respectCatCap && (catCount[g.category] ?: 0) >= MAX_PER_CATEGORY) return false
            picked += g
            catCount[g.category] = (catCount[g.category] ?: 0) + 1
            when (g.studio) {
                "Muse" -> muse++
                "Grok" -> grok++
            }
            return true
        }

        fun pull(respectCatCap: Boolean, pred: (GameItem) -> Boolean): Boolean {
            val idx = remaining.indexOfFirst { pred(it) && (!respectCatCap || (catCount[it.category] ?: 0) < MAX_PER_CATEGORY) }
            if (idx < 0) return false
            val g = remaining.removeAt(idx)
            return accept(g, respectCatCap)
        }

        // 1) 新鲜度优先（新上架 / 可更新 / 发布脚本标的 featured）
        repeat(4) {
            if (picked.size >= limit) return@repeat
            pull(true) { it.isNew || it.hasUpdate || (it.featuredRank in 1..12) }
        }
        // 2) 轻量个性化
        repeat(3) {
            if (picked.size >= limit) return@repeat
            pull(true) {
                it.id in signals.favoriteIds ||
                    it.id in signals.recentIds ||
                    signals.ratingOf(it.id) >= 4
            }
        }
        // 3) 填满：兼顾出品方平衡
        while (picked.size < limit && remaining.isNotEmpty()) {
            val prefer = when {
                muse > grok + 1 -> "Grok"
                grok > muse + 1 -> "Muse"
                else -> null
            }
            val took = if (prefer != null) pull(true) { it.studio == prefer } else false
            if (took) continue
            if (pull(true) { true }) continue
            // 分类名额用尽时放宽
            if (!pull(false) { true }) break
        }
        return picked
    }

    /**
     * 「新游戏」：真正新出现的优先；同批按首次看见时间、featured、版本倒序。
     * 若本地尚无 isNew（例如刚装完把库标成已见），回退到 featured 1..12，避免专区空白。
     */
    fun pickNew(items: List<GameItem>, signals: Signals, limit: Int = NEW_CAP): List<GameItem> {
        if (items.isEmpty() || limit <= 0) return emptyList()
        val fresh = items.filter { it.isNew }
        val pool = if (fresh.isNotEmpty()) {
            fresh
        } else {
            items.filter { it.featuredRank in 1..12 || it.hasUpdate }
        }
        return pool.sortedWith(
            compareByDescending<GameItem> { it.isNew }
                .thenByDescending { signals.seenAtOf(it.id) }
                .thenBy { if (it.featuredRank > 0) it.featuredRank else Int.MAX_VALUE }
                .thenByDescending { it.displayVersion }
                .thenByDescending { if (it.hasUpdate) 1 else 0 }
                .thenBy { it.name }
        ).distinctBy { it.id }.take(limit)
    }

    /** 「继续玩」：按最近游玩顺序，只保留仍在目录里的。 */
    fun pickContinue(items: List<GameItem>, recentIds: List<String>, limit: Int = CONTINUE_CAP): List<GameItem> {
        if (items.isEmpty() || recentIds.isEmpty() || limit <= 0) return emptyList()
        val byId = items.associateBy { it.id }
        return recentIds.mapNotNull { byId[it] }.take(limit)
    }
}
