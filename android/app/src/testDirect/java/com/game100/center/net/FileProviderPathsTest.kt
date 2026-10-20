package com.game100.center.net

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.w3c.dom.Element
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/**
 * 静态检查 res/xml/file_paths.xml（不依赖 Android）：
 * 1. 每个 name 唯一 —— FileProvider 用 name 做 HashMap 键，重名会互相覆盖（v4.11 及以前的 bug）；
 * 2. 更新包目录 cacheDir/[AppUpdater.UPDATE_DIR] 被某条 cache-path 覆盖。
 */
class FileProviderPathsTest {
    private fun roots(): List<Element> {
        val f = File("src/direct/res/xml/file_paths.xml")
        assertTrue("找不到 ${f.absolutePath}", f.exists())
        val doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(f)
        val nodes = doc.documentElement.childNodes
        return (0 until nodes.length).map { nodes.item(it) }.filterIsInstance<Element>()
    }

    @Test
    fun namesAreUnique() {
        val names = roots().map { it.getAttribute("name") }
        assertEquals("file_paths.xml 里有重名的 root：$names", names.size, names.toSet().size)
    }

    @Test
    fun updateDirIsCovered() {
        val norm = { p: String -> p.trim('/', '.', ' ').ifEmpty { "" } }
        val covered = roots().any {
            it.tagName == "cache-path" &&
                (norm(it.getAttribute("path")) == AppUpdater.UPDATE_DIR || norm(it.getAttribute("path")) == "")
        }
        assertTrue("cacheDir/${AppUpdater.UPDATE_DIR} 没有被 file_paths.xml 的 cache-path 覆盖", covered)
    }

    @Test
    fun pickNewerKeepsHighestVersion() {
        val a = AppUpdater.AppInfo(27, "4.10", "u", "")
        val b = AppUpdater.AppInfo(29, "4.12", "u", "")
        assertEquals(29, AppUpdater.pickNewer(AppUpdater.pickNewer(null, a), b).versionCode)
        assertEquals(29, AppUpdater.pickNewer(b, a).versionCode)
    }
}
