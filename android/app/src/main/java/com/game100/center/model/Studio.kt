package com.game100.center.model

import org.json.JSONObject

/**
 * 出品方（meta.json 的 studio 字段）。
 * 目前有两家：Muse 与 Grok，各自一种颜色 + 记号；以后新增的出品方自动用中性样式。
 * 纯 Kotlin（不依赖 Android 视图），便于单元测试。
 */
object Studio {
    const val MUSE = "Muse"
    const val GROK = "Grok"

    /** 已知出品方，按这个顺序排在筛选栏最前面 */
    val KNOWN = listOf(MUSE, GROK)

    /** 样式：mark 记号，top/bottom 渐变，edge 立体底边，line 描边，ink 文字色；颜色均为 ARGB */
    data class Look(
        val mark: String,
        val top: Int,
        val bottom: Int,
        val edge: Int,
        val line: Int,
        val ink: Int,
        val known: Boolean,
    )

    // Muse：葡萄紫 + ✦ 星芒；Grok：橘子橙 + ◆ 方钻。互为补色，一眼能分开，且不与“下载(青)/更新(粉)/开玩(金)”按钮撞色。
    private val MUSE_LOOK = Look("✦", 0xFFC084FC.toInt(), 0xFF8B3FE8.toInt(), 0xFF4C1D95.toInt(), 0xFFEBD9FF.toInt(), 0xFFFFFFFF.toInt(), true)
    private val GROK_LOOK = Look("◆", 0xFFFFB547.toInt(), 0xFFF0700F.toInt(), 0xFF8A3A00.toInt(), 0xFFFFE2B8.toInt(), 0xFFFFFFFF.toInt(), true)
    private val OTHER_LOOK = Look("●", 0xFF8A95B8.toInt(), 0xFF566086.toInt(), 0xFF262C46.toInt(), 0xFFC6CEE6.toInt(), 0xFFFFFFFF.toInt(), false)

    /** 规范化写法：去空格，已知出品方大小写统一（"grok" → "Grok"）；空返回 "" */
    fun canonical(raw: String?): String {
        val t = raw?.trim().orEmpty()
        if (t.isEmpty()) return ""
        return KNOWN.firstOrNull { it.equals(t, ignoreCase = true) } ?: t
    }

    /** 列表/详情用的出品方：在线清单优先，其次本机 meta.json，都缺时用 [DEFAULT_STUDIO]（缺字段的老游戏都是 Muse 做的） */
    fun resolve(remote: String?, installed: String?): String =
        canonical(remote).ifEmpty { canonical(installed) }.ifEmpty { DEFAULT_STUDIO }

    fun look(studio: String): Look = when (canonical(studio)) {
        MUSE -> MUSE_LOOK
        GROK -> GROK_LOOK
        else -> OTHER_LOOK
    }

    /** 徽章文字，如 “✦ Muse” */
    fun badgeText(studio: String): String = "${look(studio).mark} ${canonical(studio).ifEmpty { DEFAULT_STUDIO }}"

    /** 筛选栏：各出品方及游戏数；已知出品方在前（即使 0 款也不显示），其余按数量降序 */
    fun counts(items: List<GameItem>): List<Pair<String, Int>> {
        val c = items.groupingBy { canonical(it.studio).ifEmpty { DEFAULT_STUDIO } }.eachCount()
        val known = KNOWN.filter { (c[it] ?: 0) > 0 }.map { it to c.getValue(it) }
        val others = c.filterKeys { it !in KNOWN }.toList().sortedWith(compareByDescending<Pair<String, Int>> { it.second }.thenBy { it.first })
        return known + others
    }

    /** studio 为 null 表示“全部” */
    fun filter(items: List<GameItem>, studio: String?): List<GameItem> {
        if (studio.isNullOrBlank()) return items
        val s = canonical(studio)
        return items.filter { canonical(it.studio).ifEmpty { DEFAULT_STUDIO } == s }
    }

    /**
     * 内置游戏与已安装游戏版本相同时，把内置 meta.json 里的出品方同步到本机（不重新解压、不改版本号）。
     * 返回 true 表示 [local] 被修改了，需要写回。
     */
    fun syncStudio(local: JSONObject, bundled: JSONObject): Boolean {
        if (local.optInt("version", 0) != bundled.optInt("version", -1)) return false
        val want = canonical(bundled.optString("studio", ""))
        if (want.isEmpty() || local.optString("studio", "") == want) return false
        local.put("studio", want)
        return true
    }
}
