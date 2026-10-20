package com.game100.center.model

/** 出品方署名：老游戏 meta.json 缺 studio 字段时默认归属 */
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
    val studio: String = ""
) {
    /** 展示用出品方：缺字段的老游戏默认归属 DEFAULT_STUDIO */
    fun displayStudio(): String = studio.ifBlank { DEFAULT_STUDIO }
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
    val studio: String = ""
) {
    fun displayStudio(): String = studio.ifBlank { DEFAULT_STUDIO }
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
    val isPremium: Boolean = false
) {
    val installed: Boolean get() = installedVersion > 0
    val hasUpdate: Boolean get() = installed && remote != null && remote.version > installedVersion
    val canDownload: Boolean get() = !installed && remote != null && remote.url.isNotBlank()
    val displayVersion: Int get() = remote?.version ?: installedVersion
}
