package com.game100.center.data

import com.game100.center.model.Studio

import android.content.Context
import com.game100.center.model.GameItem
import com.game100.center.model.InstalledGame
import com.game100.center.model.RemoteGame
import com.game100.center.net.ManifestFetcher
import com.game100.center.util.ZipUtils
import org.json.JSONObject
import java.io.File

class GameRepository(private val context: Context) {

    companion object {
        const val DEFAULT_MANIFEST_URL = "https://raw.githubusercontent.com/weizeng/game100-games/main/manifest.json"
        private const val PREFS = "game100"
        private const val KEY_URL = "manifest_url"
        private const val KEY_SEEN = "seen_games"
        private const val NEW_DAYS = 7L
    }

    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val gamesDir: File get() = File(context.filesDir, "games")
    val downloadDir: File get() = File(context.filesDir, "downloads")

    fun getManifestUrl(): String =
        prefs.getString(KEY_URL, DEFAULT_MANIFEST_URL) ?: DEFAULT_MANIFEST_URL

    fun setManifestUrl(url: String) {
        prefs.edit().putString(KEY_URL, url.trim()).apply()
    }

    fun ensureBundledGames(appVersionCode: Int) {
        // marker 记录上次解压时的 App versionCode；App 升级后重新比对版本
        val marker = File(gamesDir, ".bundled_v2")
        val marked = try {
            if (marker.exists()) marker.readText().trim().toInt() else 0
        } catch (e: Exception) { 0 }
        if (marked == appVersionCode) return

        gamesDir.mkdirs()
        val assets = try {
            context.assets.list("bundled") ?: emptyArray()
        } catch (e: Exception) {
            emptyArray()
        }
        for (name in assets) {
            if (!name.endsWith(".zip")) continue
            val id = name.removeSuffix(".zip")
            // 只有内置版比已安装版新时才覆盖（不降级用户从远端更新的游戏）
            val bundledMeta = getBundledMeta(name)
            val bundledVersion = bundledMeta?.optInt("version", 0) ?: 0
            val installedVersion = getInstalledVersion(id)
            if (bundledMeta != null && bundledVersion == installedVersion) {
                // 版本相同：只同步出品方等署名信息，不重新解压（v4.13 起给老游戏补了 studio）
                syncInstalledMeta(id, bundledMeta)
            }
            if (bundledVersion > installedVersion) {
                val dest = File(gamesDir, id)
                try {
                    if (dest.exists()) dest.deleteRecursively()
                    context.assets.open("bundled/$name").use { ins ->
                        ZipUtils.unzip(ins, dest)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
        try {
            marker.writeText(appVersionCode.toString())
        } catch (_: Exception) {
        }
    }

    /** 公开：检查游戏是否已安装 */
    fun isInstalled(id: String): Boolean = getInstalledVersion(id) > 0

    private fun getInstalledVersion(id: String): Int {
        return try {
            val meta = File(File(gamesDir, id), "meta.json")
            if (!meta.exists()) 0 else JSONObject(meta.readText()).optInt("version", 0)
        } catch (e: Exception) { 0 }
    }

    private fun getBundledMeta(zipName: String): JSONObject? {
        return try {
            context.assets.open("bundled/$zipName").use { ins -> ZipUtils.readMeta(ins) }
        } catch (e: Exception) { null }
    }

    private fun syncInstalledMeta(id: String, bundledMeta: JSONObject) {
        try {
            val f = File(File(gamesDir, id), "meta.json")
            if (!f.exists()) return
            val local = JSONObject(f.readText())
            if (Studio.syncStudio(local, bundledMeta)) f.writeText(local.toString(1))
        } catch (_: Exception) {
        }
    }

    fun loadInstalled(): List<InstalledGame> {
        val dir = gamesDir
        if (!dir.exists()) return emptyList()
        val result = mutableListOf<InstalledGame>()
        val files = dir.listFiles { f -> f.isDirectory } ?: return emptyList()
        for (d in files) {
            try {
                val metaFile = File(d, "meta.json")
                val indexFile = File(d, "index.html")
                if (!metaFile.exists() || !indexFile.exists()) continue
                val meta = JSONObject(metaFile.readText())
                result.add(
                    InstalledGame(
                        id = meta.optString("id", d.name),
                        name = meta.optString("name", d.name),
                        desc = meta.optString("desc", ""),
                        version = meta.optInt("version", 1),
                        icon = meta.optString("icon", "🎮"),
                        color = meta.optString("color", "#607D8B"),
                        category = meta.optString("category", "经典重温"),
                        premium = meta.optBoolean("premium", false),
                        featured = meta.optInt("featured", 0),
                        studio = meta.optString("studio", "")
                    )
                )
            } catch (e: Exception) {
                // skip broken game dir
            }
        }
        return result.sortedBy { it.name }
    }

    @Throws(Exception::class)
    fun fetchRemote(): List<RemoteGame> {
        // cn 渠道为完全离线单机版：不访问在线游戏库（游戏已在构建时全部内置）
        if (!com.game100.center.BuildConfig.ONLINE_CATALOG) return emptyList()
        val url = getManifestUrl()
        if (url.isBlank()) return emptyList()
        return ManifestFetcher.fetch(url)
    }

    /**
     * 记录远端游戏的"首次出现时间"，用于 NEW 徽章。
     * 首次调用时把当前所有 id 记为已见（不算新）；之后新出现的 id 记为新游戏。
     */
    fun updateSeenGames(remote: List<RemoteGame>) {
        if (remote.isEmpty()) return
        val seen = getSeenMap().toMutableMap()
        val now = System.currentTimeMillis()
        if (seen.isEmpty()) {
            for (r in remote) seen[r.id] = 0L
        } else {
            for (r in remote) {
                if (!seen.containsKey(r.id)) seen[r.id] = now
            }
        }
        prefs.edit().putString(KEY_SEEN, JSONObject(seen as Map<*, *>).toString()).apply()
    }

    fun isNewGame(id: String): Boolean {
        val ts = getSeenMap()[id] ?: return false
        if (ts == 0L) return false
        return System.currentTimeMillis() - ts < NEW_DAYS * 24 * 3600 * 1000L
    }

    private fun getSeenMap(): Map<String, Long> {
        return try {
            val s = prefs.getString(KEY_SEEN, null) ?: return emptyMap()
            val o = JSONObject(s)
            val map = mutableMapOf<String, Long>()
            val keys = o.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                map[k] = o.optLong(k, 0L)
            }
            map
        } catch (e: Exception) { emptyMap() }
    }

    fun buildGameList(remote: List<RemoteGame>): List<GameItem> {
        val installed = loadInstalled().associateBy { it.id }
        val remoteById = remote.associateBy { it.id }
        val items = mutableListOf<GameItem>()
        for ((id, ins) in installed) {
            val rem = remoteById[id]
            items.add(
                GameItem(
                    id = id,
                    name = ins.name,
                    desc = ins.desc,
                    icon = ins.icon,
                    color = ins.color,
                    category = ins.category.ifBlank { "经典重温" },
                    installedVersion = ins.version,
                    remote = rem,
                    isNew = isNewGame(id),
                    isPremium = ins.premium || (rem?.premium == true),
                    featuredRank = when {
                        rem != null && rem.featured > 0 -> rem.featured
                        ins.featured > 0 -> ins.featured
                        else -> 0
                    },
                    studio = Studio.resolve(rem?.studio, ins.studio)
                )
            )
        }
        for (r in remote) {
            if (!installed.containsKey(r.id)) {
                items.add(
                    GameItem(
                        id = r.id,
                        name = r.name,
                        desc = r.desc,
                        icon = r.icon,
                        color = r.color,
                        category = r.category.ifBlank { "休闲趣味" },
                        installedVersion = 0,
                        remote = r,
                        isNew = isNewGame(r.id),
                        isPremium = r.premium,
                        featuredRank = r.featured,
                        studio = Studio.resolve(r.studio, null)
                    )
                )
            }
        }
        return items.sortedBy { it.name }
    }

    fun deleteGame(id: String): Boolean {
        return try {
            File(gamesDir, id).deleteRecursively()
        } catch (e: Exception) {
            false
        }
    }

    fun clearAllDownloads() {
        try {
            gamesDir.deleteRecursively()
            downloadDir.deleteRecursively()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
