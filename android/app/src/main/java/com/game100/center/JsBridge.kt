package com.game100.center

import android.app.Activity
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface

/** 游戏网页可调用的原生能力：window.NativeBridge.vibrate(50) / .exit() */
class JsBridge(private val activity: Activity) {

    @JavascriptInterface
    fun vibrate(ms: Long) {
        try {
            val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                activity.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(ms.coerceIn(1, 500), VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(ms.coerceIn(1, 500))
            }
        } catch (e: Exception) {
            // 忽略震动失败
        }
    }

    @JavascriptInterface
    fun exit() {
        activity.runOnUiThread { activity.finish() }
    }
}
