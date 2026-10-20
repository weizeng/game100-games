package com.game100.center.net

/**
 * 游戏资源下载线路。仓库文件通过 jsDelivr 分发，国内访问 cdn.jsdelivr.net 时常很慢或被阻断，
 * 所以同一文件依次尝试多个 jsDelivr 节点，最后才用 raw.githubusercontent.com。
 * 2026-10-20 已用 curl 确认以下节点都能返回同样的文件并支持 Range 断点续传。
 */
object Mirrors {
    val JSDELIVR_HOSTS = listOf(
        "cdn.jsdelivr.net",
        "fastly.jsdelivr.net",
        "gcore.jsdelivr.net",
        "testingcf.jsdelivr.net",
    )

    /** 仅供单元测试替换线路列表 */
    @Volatile
    internal var testOverride: ((String) -> List<String>)? = null

    /** 上一次成功的线路（host），下次优先使用 */
    @Volatile
    var preferredHost: String? = null

    private val JSDELIVR_GH = Regex("^https?://[A-Za-z0-9.-]*jsdelivr\\.net/gh/([^/@]+/[^/@]+)@([^/]+)/(.+)$")

    /** 返回同一文件的候选地址（按优先级）；非 jsDelivr 地址原样返回 */
    fun candidates(url: String): List<String> {
        testOverride?.let { return it(url) }
        val m = JSDELIVR_GH.matchEntire(url.trim()) ?: return listOf(url)
        val (repo, ref, path) = m.destructured
        var hosts = JSDELIVR_HOSTS
        preferredHost?.let { p -> if (p in hosts) hosts = listOf(p) + (hosts - p) }
        val list = hosts.map { "https://$it/gh/$repo@$ref/$path" }.toMutableList()
        list += "https://raw.githubusercontent.com/$repo/$ref/$path"
        preferredHost?.let { p ->
            if (p == "raw.githubusercontent.com") list.add(0, list.removeAt(list.size - 1))
        }
        return list.distinct()
    }

    fun hostOf(url: String): String = url.substringAfter("://").substringBefore("/")

    fun markGood(url: String) {
        preferredHost = hostOf(url)
    }

    /** 给用户看的线路名称 */
    fun label(url: String): String = when (hostOf(url)) {
        "cdn.jsdelivr.net" -> "线路 1"
        "fastly.jsdelivr.net" -> "线路 2"
        "gcore.jsdelivr.net" -> "线路 3"
        "testingcf.jsdelivr.net" -> "线路 4"
        "raw.githubusercontent.com" -> "线路 5"
        else -> hostOf(url)
    }
}
