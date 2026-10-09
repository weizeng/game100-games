package com.game100.center

import android.app.Application
import androidx.appcompat.app.AppCompatDelegate

class Game100App : Application() {
    override fun onCreate() {
        super.onCreate()
        // 游戏大厅固定使用深色主题
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
    }
}
