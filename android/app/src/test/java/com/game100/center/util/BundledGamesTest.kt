package com.game100.center.util

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files

/**
 * 按 App 读取内置游戏的方式（GameRepository.ensureBundledGames：ZipUtils.readMetaVersion + ZipUtils.unzip）
 * 检查构建时生成的 assets/bundled：数量 = games/ 下的游戏数，版本 = meta.json，能解压出 index.html。
 */
class BundledGamesTest {
    @Test
    fun bundledGamesMatchRepoGames() {
        val bundled = File(System.getProperty("game100.bundledDir")!!)
        val games = File(System.getProperty("game100.gamesDir")!!)
        val expected = games.listFiles()!!.filter {
            it.isDirectory && File(it, "index.html").exists() && File(it, "meta.json").exists()
        }.associate { it.name to JSONObject(File(it, "meta.json").readText()).optInt("version", 0) }
        val zips = bundled.listFiles { f -> f.name.endsWith(".zip") }!!
        assertEquals(expected.keys, zips.map { it.name.removeSuffix(".zip") }.toSet())
        val tmp = Files.createTempDirectory("bundled").toFile()
        try {
            for (z in zips) {
                val id = z.name.removeSuffix(".zip")
                val v = z.inputStream().use { ZipUtils.readMetaVersion(it) }
                assertEquals("版本不符：$id", expected[id], v)
                assertTrue("版本必须 > 0：$id", v > 0)
                val dest = File(tmp, id)
                z.inputStream().use { ZipUtils.unzip(it, dest) }
                assertTrue("缺 index.html：$id", File(dest, "index.html").isFile)
                assertEquals(
                    "index.html 与仓库不一致：$id",
                    File(games, "$id/index.html").readText(), File(dest, "index.html").readText()
                )
            }
        } finally {
            tmp.deleteRecursively()
        }
    }
}
