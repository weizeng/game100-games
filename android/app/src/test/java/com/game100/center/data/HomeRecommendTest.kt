package com.game100.center.data

import com.game100.center.model.GameItem
import com.game100.center.model.RemoteGame
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HomeRecommendTest {

    private fun item(
        id: String,
        category: String,
        studio: String = "Muse",
        isNew: Boolean = false,
        isPremium: Boolean = false,
        featured: Int = 0,
        hasUpdate: Boolean = false,
        remoteVersion: Int = 3,
        installed: Int = 3,
    ): GameItem {
        val remote = RemoteGame(
            id = id,
            name = id,
            desc = "d",
            version = if (hasUpdate) remoteVersion + 1 else remoteVersion,
            icon = "🎮",
            color = "#FF3D9A",
            category = category,
            url = "https://example/$id.zip",
            size = 1L,
            premium = isPremium,
            featured = featured,
            studio = studio,
        )
        return GameItem(
            id = id,
            name = id,
            desc = "d",
            icon = "🎮",
            color = "#FF3D9A",
            category = category,
            installedVersion = installed,
            remote = remote,
            isNew = isNew,
            isPremium = isPremium,
            featuredRank = featured,
            studio = studio,
        )
    }

    @Test
    fun featuredCapsAndDiversifiesCategories() {
        val items = (1..20).map { i ->
            item(
                id = "g$i",
                category = "cat${(i % 5) + 1}",
                studio = if (i % 2 == 0) "Muse" else "Grok",
                isNew = i <= 6,
                featured = if (i <= 8) i else 0,
            )
        }
        val picked = HomeRecommend.pickFeatured(items, HomeRecommend.Signals(daySeed = 20261103), limit = 10)
        assertEquals(10, picked.size)
        assertTrue(picked.map { it.category }.distinct().size >= 4)
        assertTrue(picked.any { it.studio == "Muse" })
        assertTrue(picked.any { it.studio == "Grok" })
        // 同一分类最多 2（名额未耗尽时）
        val maxCat = picked.groupingBy { it.category }.eachCount().values.maxOrNull() ?: 0
        assertTrue(maxCat <= HomeRecommend.MAX_PER_CATEGORY)
    }

    @Test
    fun featuredRotatesWithDaySeed() {
        val items = (1..30).map { i ->
            item(id = "x$i", category = "c${i % 7}", studio = if (i % 3 == 0) "Grok" else "Muse", isNew = i % 4 == 0)
        }
        val a = HomeRecommend.pickFeatured(items, HomeRecommend.Signals(daySeed = 1), limit = 10).map { it.id }
        val b = HomeRecommend.pickFeatured(items, HomeRecommend.Signals(daySeed = 2), limit = 10).map { it.id }
        assertTrue(a != b)
    }

    @Test
    fun pickNewPrefersIsNewThenFallbackFeatured() {
        val mixed = listOf(
            item("n1", "益智解谜", isNew = true, featured = 2),
            item("n2", "射击", isNew = true, featured = 1),
            item("old", "跑酷跳跃", featured = 1),
        )
        val news = HomeRecommend.pickNew(mixed, HomeRecommend.Signals(seenAtOf = { if (it == "n2") 200 else 100 }))
        assertEquals(listOf("n2", "n1"), news.map { it.id })

        val fallback = HomeRecommend.pickNew(
            listOf(item("a", "射击", featured = 3), item("b", "射击", hasUpdate = true)),
            HomeRecommend.Signals(),
        )
        assertTrue(fallback.isNotEmpty())
        assertTrue(fallback.any { it.id == "a" || it.id == "b" })
    }

    @Test
    fun pickContinueKeepsRecentOrder() {
        val items = listOf(item("a", "射击"), item("b", "射击"), item("c", "射击"))
        val out = HomeRecommend.pickContinue(items, listOf("c", "missing", "a", "b"), limit = 2)
        assertEquals(listOf("c", "a"), out.map { it.id })
    }
}
