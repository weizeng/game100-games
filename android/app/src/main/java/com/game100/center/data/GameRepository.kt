package com.game100.center.data

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
        const val DEFAULT_MANIFEST_URL = "https://cdn.jsdelivr.net/gh/weizeng/game100-games@main/manifest.json"
        private const val PREFS = "game100"
        private const val KEY_URL = "manifest_url"
    }

    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val gamesDir: File get() = File(context.filesDir, "games")
    val downloadDir: File get() = File(context.filesDir, "downloads")

    fun getManifestUrl(): String =
        prefs.getString(KEY_URL, DEFAULT_MANIFEST_URL) ?: DEFAULT_MANIFEST_URL

    fun setManifestUrl(url: String) {
        prefs.edit().putString(KEY_URL, url.trim()).apply()
    }

    fun ensureBundledGames() {
        val marker = File(gamesDir, ".bundled_done")
        if (marker.exists()) return
        gamesDir.mkdirs()
        val assets = try {
            context.assets.list("bundled") ?: emptyArray()
        } catch (e: Exception) {
            emptyArray()
        }
        for (name in assets) {
            if (!name.endsWith(".zip")) continue
            val id = name.removeSuffix(".zip")
            val dest = File(gamesDir, id)
            if (File(dest, "index.html").exists()) continue
            try {
                context.assets.open("bundled/$name").use { ins ->
                    ZipUtils.unzip(ins, dest)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        try {
            marker.createNewFile()
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
                        category = meta.optString("category", "经典重温")
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
        val url = getManifestUrl()
        if (url.isBlank()) return emptyList()
        return ManifestFetcher.fetch(url)
    }

    fun buildGameList(remote: List<RemoteGame>): List<GameItem> {
        val installed = loadInstalled().associateBy { it.id }
        val remoteById = remote.associateBy { it.id }
        val items = mutableListOf<GameItem>()
        for ((id, ins) in installed) {
            items.add(
                GameItem(
                    id = id,
                    name = ins.name,
                    desc = ins.desc,
                    icon = ins.icon,
                    color = ins.color,
                    category = ins.category.ifBlank { "经典重温" },
                    installedVersion = ins.version,
                    remote = remoteById[id]
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
                        remote = r
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
