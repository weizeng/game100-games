package com.game100.center.ui

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable
import android.view.View
import com.game100.center.R
import kotlin.math.cos
import kotlin.math.sin

/** A short confirmation burst in the window overlay; never captures a touch. */
object FavoriteBurst {
    fun show(anchor: View) {
        UiMotion.pop(anchor)
        if (!ValueAnimator.areAnimatorsEnabled() || !anchor.isAttachedToWindow) return
        val host = anchor.rootView
        val location = IntArray(2)
        val hostLocation = IntArray(2)
        anchor.getLocationInWindow(location)
        host.getLocationInWindow(hostLocation)
        val cx = location[0] - hostLocation[0] + anchor.width / 2f
        val cy = location[1] - hostLocation[1] + anchor.height / 2f
        val density = anchor.resources.displayMetrics.density
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = anchor.context.getColor(R.color.badge_red) }
        var progress = 0f
        val burst = object : Drawable() {
            override fun draw(canvas: Canvas) {
                paint.alpha = ((1f - progress) * 255).toInt().coerceIn(0, 255)
                val distance = 40f * density * progress
                val size = (2.5f - progress * 2f) * density
                for (i in 0..7) {
                    val angle = i * Math.PI / 4
                    val x = cx + cos(angle).toFloat() * distance
                    val y = cy + sin(angle).toFloat() * distance
                    canvas.save()
                    canvas.rotate(progress * 90f, x, y)
                    canvas.drawRoundRect(x - size, y - size, x + size, y + size, density, density, paint)
                    canvas.restore()
                }
            }
            override fun setAlpha(alpha: Int) { paint.alpha = alpha }
            override fun setColorFilter(colorFilter: ColorFilter?) { paint.colorFilter = colorFilter }
            @Deprecated("Deprecated in Android")
            override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
        }
        burst.setBounds(0, 0, host.width, host.height)
        val animation = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 550
            addUpdateListener {
                progress = it.animatedValue as Float
                burst.invalidateSelf()
            }
        }
        val detach = object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(view: View) {}
            override fun onViewDetachedFromWindow(view: View) { animation.cancel() }
        }
        animation.addListener(object : AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: Animator) {
                host.overlay.remove(burst)
                anchor.removeOnAttachStateChangeListener(detach)
            }
        })
        anchor.addOnAttachStateChangeListener(detach)
        host.overlay.add(burst)
        animation.start()
    }
}
