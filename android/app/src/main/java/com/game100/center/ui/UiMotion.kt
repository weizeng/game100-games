package com.game100.center.ui

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.animation.OvershootInterpolator
import android.view.animation.PathInterpolator

/** Small, interruptible responses. System animation scale zero always leaves a usable static UI. */
object UiMotion {
    private val settle = PathInterpolator(0.2f, 0.8f, 0.2f, 1f)

    @SuppressLint("ClickableViewAccessibility")
    fun press(view: View, depth: Float = 0.95f, tilt: Boolean = false) {
        if (tilt) view.cameraDistance = 8000f * view.resources.displayMetrics.density
        view.setOnTouchListener { v, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> if (v.isEnabled && ValueAnimator.areAnimatorsEnabled()) {
                    v.animate().cancel()
                    val animation = v.animate().scaleX(depth).scaleY(depth).setStartDelay(0)
                        .setDuration(90).setInterpolator(settle)
                    if (tilt) {
                        val x = (event.x / v.width.coerceAtLeast(1) - 0.5f).coerceIn(-0.5f, 0.5f)
                        val y = (event.y / v.height.coerceAtLeast(1) - 0.5f).coerceIn(-0.5f, 0.5f)
                        animation.rotationX(-y * 8f).rotationY(x * 8f)
                    }
                    animation.start()
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    v.animate().cancel()
                    if (ValueAnimator.areAnimatorsEnabled()) {
                        v.animate().scaleX(1f).scaleY(1f).rotationX(0f).rotationY(0f).setStartDelay(0)
                            .setDuration(320).setInterpolator(OvershootInterpolator(2f)).start()
                    } else {
                        v.scaleX = 1f
                        v.scaleY = 1f
                        v.rotationX = 0f
                        v.rotationY = 0f
                    }
                }
            }
            // Preserve click, long press, keyboard activation and parent scrolling.
            false
        }
    }

    fun reset(view: View) {
        view.animate().cancel()
        view.alpha = 1f
        view.translationY = 0f
        view.scaleX = 1f
        view.scaleY = 1f
        view.rotation = 0f
        view.rotationX = 0f
        view.rotationY = 0f
    }

    fun enter(view: View, delay: Long = 0) {
        reset(view)
        if (!ValueAnimator.areAnimatorsEnabled()) return
        view.alpha = 0f
        view.translationY = 14f * view.resources.displayMetrics.density
        view.animate().alpha(1f).translationY(0f).setStartDelay(delay)
            .setDuration(380).setInterpolator(settle).start()
    }

    fun pop(view: View, delay: Long = 0) {
        reset(view)
        if (!ValueAnimator.areAnimatorsEnabled()) return
        view.scaleX = 0.72f
        view.scaleY = 0.72f
        view.animate().scaleX(1f).scaleY(1f).setStartDelay(delay)
            .setDuration(440).setInterpolator(OvershootInterpolator(3f)).start()
    }

    fun bindButtons(root: View) {
        if (root.isClickable && root !is android.widget.EditText) press(root)
        if (root is ViewGroup) {
            for (i in 0 until root.childCount) bindButtons(root.getChildAt(i))
        }
    }

    fun enterPage(root: View) {
        root.post { if (root.isAttachedToWindow) enter(root) }
    }
}
