package com.game100.center.model

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class StudioTest {
    private fun item(id: String, studio: String) =
        GameItem(id, id, "", "🎮", "#000000", "休闲模拟", 1, null, studio = studio)

    @Test
    fun canonicalNormalizesKnownStudios() {
        assertEquals("Grok", Studio.canonical(" grok "))
        assertEquals("Muse", Studio.canonical("MUSE"))
        assertEquals("Acme Lab", Studio.canonical(" Acme Lab "))
        assertEquals("", Studio.canonical(null))
        assertEquals("", Studio.canonical("  "))
    }

    @Test
    fun resolvePrefersRemoteThenInstalledThenDefault() {
        assertEquals("Grok", Studio.resolve("grok", "Muse"))
        assertEquals("Grok", Studio.resolve("", "Grok"))
        assertEquals(DEFAULT_STUDIO, Studio.resolve(null, ""))
        assertEquals("Muse", DEFAULT_STUDIO)
    }

    @Test
    fun museAndGrokLookClearlyDifferentAndUnknownIsNeutral() {
        val muse = Studio.look("Muse")
        val grok = Studio.look("grok")
        val other = Studio.look("Acme")
        assertNotEquals(muse.mark, grok.mark)
        assertNotEquals(muse.top, grok.top)
        assertNotEquals(muse.bottom, grok.bottom)
        assertTrue(muse.known && grok.known)
        assertFalse(other.known)
        assertEquals(other, Studio.look("另一家"))
        assertEquals("✦ Muse", Studio.badgeText("muse"))
        assertEquals("◆ Grok", Studio.badgeText("Grok"))
        assertEquals("● Acme", Studio.badgeText("Acme"))
    }

    @Test
    fun countsPutKnownStudiosFirstAndFilterWorks() {
        val items = listOf(
            item("a", "Muse"), item("b", "Grok"), item("c", "muse"),
            item("d", "Zeta"), item("e", "Acme"), item("f", "Acme"),
        )
        assertEquals(
            listOf("Muse" to 2, "Grok" to 1, "Acme" to 2, "Zeta" to 1),
            Studio.counts(items)
        )
        assertEquals(listOf("b"), Studio.filter(items, "grok").map { it.id })
        assertEquals(listOf("a", "c"), Studio.filter(items, "Muse").map { it.id })
        assertEquals(items, Studio.filter(items, null))
        // 只有 Muse 时不出现 Grok（0 款不显示）
        assertEquals(listOf("Muse" to 1), Studio.counts(listOf(item("x", "Muse"))))
    }

    @Test
    fun syncStudioOnlyWhenVersionsMatch() {
        val bundled = JSONObject("""{"id":"x","version":3,"studio":"Grok"}""")
        val same = JSONObject("""{"id":"x","version":3}""")
        assertTrue(Studio.syncStudio(same, bundled))
        assertEquals("Grok", same.getString("studio"))
        assertFalse("已同步过不再写", Studio.syncStudio(same, bundled))
        val older = JSONObject("""{"id":"x","version":2}""")
        assertFalse(Studio.syncStudio(older, bundled))
        assertFalse(older.has("studio"))
        val wrong = JSONObject("""{"id":"x","version":3,"studio":"Muse"}""")
        assertTrue(Studio.syncStudio(wrong, bundled))
        assertEquals("Grok", wrong.getString("studio"))
        assertFalse(Studio.syncStudio(JSONObject("""{"version":3}"""), JSONObject("""{"version":3}""")))
    }

    /** 仓库数据：每款游戏的 meta.json 都显式写了出品方，且是已知出品方 */
    @Test
    fun everyRepoGameDeclaresStudio() {
        val games = File(System.getProperty("game100.gamesDir") ?: "../../games")
        val metas = games.listFiles()!!.filter { File(it, "meta.json").isFile }
        assertTrue(metas.size > 200)
        val bad = metas.filter {
            val s = JSONObject(File(it, "meta.json").readText()).optString("studio", "")
            s !in Studio.KNOWN
        }.map { it.name }
        assertEquals("缺少或写错 studio 的游戏：$bad", emptyList<String>(), bad)
        val counts = metas.groupingBy { JSONObject(File(it, "meta.json").readText()).getString("studio") }.eachCount()
        assertTrue(counts.getValue("Muse") > 0 && counts.getValue("Grok") > 0)
    }
}
