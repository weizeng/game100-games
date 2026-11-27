package com.game100.center.net

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReviewSyncTest {

    @Test
    fun summarySerializationRoundTrip() {
        val input = mapOf(
            "snake" to ReviewApi.GameRatingBrief("snake", 4.8, 25),
            "tetris" to ReviewApi.GameRatingBrief("tetris", 4.5, 10)
        )
        val json = ReviewSync.serializeSummaryMap(input)
        val parsed = ReviewSync.parseSummaryMap(json)
        assertEquals(2, parsed.size)
        assertEquals(4.8, parsed["snake"]!!.avgRating, 0.001)
        assertEquals(25, parsed["snake"]!!.count)
        assertEquals(4.5, parsed["tetris"]!!.avgRating, 0.001)
        assertEquals(10, parsed["tetris"]!!.count)
    }

    @Test
    fun parseMalformedJsonReturnsEmpty() {
        assertTrue(ReviewSync.parseSummaryMap("not-json").isEmpty())
    }
}
