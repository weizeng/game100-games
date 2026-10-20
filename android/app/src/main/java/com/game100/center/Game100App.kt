package com.game100.center

import android.app.Activity
import android.app.Application
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class Game100App : Application() {
    override fun onCreate() {
        super.onCreate()
        // 游戏大厅固定使用深色主题
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
        registerEdgeToEdgeInsets()
    }

    /**
     * targetSdk 36 后，Android 15+ 设备强制 edge-to-edge（内容会画到状态栏/导航栏下面，
     * Android 16 起不能再用 windowOptOutEdgeToEdgeEnforcement 退出）。
     * 这里统一给非全屏页面的内容区加上系统栏 + 刘海的内边距，避免标题栏被状态栏盖住。
     * 游戏页（GameActivity）本身是沉浸式全屏，不处理。
     */
    private fun registerEdgeToEdgeInsets() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityPostCreated(activity: Activity, savedInstanceState: Bundle?) {
                if (activity is GameActivity) return
                val content = activity.findViewById<View>(android.R.id.content) ?: return
                ViewCompat.setOnApplyWindowInsetsListener(content) { v, insets ->
                    val b = insets.getInsets(
                        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
                    )
                    v.setPadding(b.left, b.top, b.right, b.bottom)
                    insets
                }
                ViewCompat.requestApplyInsets(content)
            }
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityResumed(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })
    }
}
