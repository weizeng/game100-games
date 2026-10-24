package com.game100.center.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class UserDataTest {
    @Test
    fun deviceIdStableAndNicknameClamped() {
        val ctx = RuntimeEnvironment.getApplication()
        val a = UserData(ctx)
        val id1 = a.getDeviceId()
        val id2 = UserData(ctx).getDeviceId()
        assertEquals(id1, id2)
        assertTrue(id1.length >= 8)

        a.setNickname("  霓虹玩家\n123  ")
        assertEquals("霓虹玩家123", a.getNickname())

        a.setNickname("x".repeat(100))
        assertEquals(24, a.getNickname().length)

        a.setNickname("   ")
        assertEquals(UserData.DEFAULT_NICKNAME, a.getNickname())

        assertTrue(a.reportScore("flappy", 10))
        assertEquals(10, a.getBestScore("flappy"))
        assertTrue(!a.reportScore("flappy", 5))
        assertNotEquals("", id1)
    }
}
