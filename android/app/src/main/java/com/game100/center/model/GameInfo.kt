package com.game100.center.model

/** 出品方署名：meta.json 缺 studio 字段时的兜底（缺字段的老游戏都是 Muse 做的）。新游戏必须写 studio。 */
const val DEFAULT_STUDIO = "Muse"

/** 游戏源（manifest.json）里的一条记录 */
data class RemoteGame(
    val id: String,
    val name: String,
    val desc: String,
    val version: Int,
    val icon: String,
    val color: String,
    val category: String,
    val url: String,
    val size: Long,
    val premium: Boolean = false,
    /** 首页推荐位序：1=最前，0=未上推荐；由 publish 写入 manifest */
    val featured: Int = 0,
    val studio: String = ""
) {
    /** 展示用出品方：缺字段的老游戏默认归属 DEFAULT_STUDIO */
    fun displayStudio(): String = Studio.resolve(studio, null)
}

/** 已安装到本地的游戏 */
data class InstalledGame(
    val id: String,
    val name: String,
    val desc: String,
    val version: Int,
    val icon: String,
    val color: String,
    val category: String,
    val premium: Boolean = false,
    /** 首页推荐位序（来自本地 meta；离线/cn 内置包会写入） */
    val featured: Int = 0,
    val studio: String = ""
) {
    fun displayStudio(): String = Studio.resolve(studio, null)
}

/** 大厅列表展示用（本地 + 远端合并） */
data class GameItem(
    val id: String,
    val name: String,
    val desc: String,
    val icon: String,
    val color: String,
    val category: String,
    val installedVersion: Int,
    val remote: RemoteGame?,
    val isNew: Boolean = false,
    val isPremium: Boolean = false,
    /** 首页推荐位序：1=最前，0=未上推荐（来自远端 manifest） */
    val featuredRank: Int = 0,
    /** 出品方（已规范化，见 [Studio.resolve]） */
    val studio: String = DEFAULT_STUDIO
) {
    val installed: Boolean get() = installedVersion > 0
    val hasUpdate: Boolean get() = installed && remote != null && remote.version > installedVersion
    val canDownload: Boolean get() = !installed && remote != null && remote.url.isNotBlank()
    val displayVersion: Int get() = remote?.version ?: installedVersion
}
