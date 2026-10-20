package com.game100.center.ui

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import android.view.ViewTreeObserver
import android.view.animation.LinearInterpolator
import kotlin.math.cos
import kotlin.math.sin

/** A living arcade stage (skin B): slow candy sunburst + glints behind the emblem. Only visible cards keep a frame clock. */
class ArcadeBackdropView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val visibleBounds = Rect()
    private val mint = Color.WHITE
    private val rays = android.graphics.Path()
    private var phase = 0f
    private var glow: Shader? = null
    private var sheen: Shader? = null
    private val sheenMatrix = Matrix()
    private var clock: ValueAnimator? = null
    private var floatingIcon: View? = null
    private val scrollListener = ViewTreeObserver.OnScrollChangedListener { updateClock() }

    init {
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        isClickable = false
        isFocusable = false
    }

    fun bindIcon(icon: View) {
        floatingIcon = icon
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        glow = if (w > 0 && h > 0) RadialGradient(w * .79f, h * .27f, w * .48f,
            intArrayOf(0x40FFFFFF, Color.TRANSPARENT), null, Shader.TileMode.CLAMP) else null
        sheen = if (w > 0) LinearGradient(-w * .18f, 0f, w * .18f, h * .12f,
            intArrayOf(Color.TRANSPARENT, 0x30FFFFFF, Color.TRANSPARENT), null, Shader.TileMode.CLAMP) else null
        updateClock()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        paint.style = Paint.Style.FILL
        paint.shader = glow
        paint.alpha = 255
        canvas.drawRect(0f, 0f, w, h, paint)
        if (phase < .18f && ValueAnimator.areAnimatorsEnabled()) {
            sheenMatrix.setTranslate((-0.5f + phase / .18f * 2f) * w, 0f)
            sheen?.setLocalMatrix(sheenMatrix)
            paint.shader = sheen
            canvas.drawRect(0f, 0f, w, h, paint)
        }
        paint.shader = null
        val cx = w * .79f
        val cy = h * .27f
        val radius = w * .245f
        // 糖果放射光：14 道白色光束绕徽章缓慢旋转（与游戏内皮肤 B 的开场光一致）
        val far = w * 1.2f
        rays.reset()
        for (i in 0 until 14) {
            val a0 = Math.toRadians((i * 360.0 / 14) + phase * 25.0)
            val a1 = a0 + Math.toRadians(9.0)
            rays.moveTo(cx, cy)
            rays.lineTo(cx + cos(a0).toFloat() * far, cy + sin(a0).toFloat() * far)
            rays.lineTo(cx + cos(a1).toFloat() * far, cy + sin(a1).toFloat() * far)
            rays.close()
        }
        paint.color = mint
        paint.style = Paint.Style.FILL
        paint.alpha = 30
        canvas.drawPath(rays, paint)
        // Four small glints share the same clock; the lower text area stays quiet.
        for (i in 0..3) {
            val angle = (phase * 2.0 * Math.PI + i * Math.PI / 2)
            val x = cx + cos(angle).toFloat() * radius * 1.3f
            val y = cy + sin(angle).toFloat() * radius * 1.3f
            paint.alpha = 90
            canvas.drawCircle(x, y, (if (i == 0) 2f else 1.2f) * resources.displayMetrics.density, paint)
        }
        paint.alpha = 255
    }

    private fun updateClock() {
        val run = isAttachedToWindow && windowVisibility == VISIBLE && isShown &&
            hasWindowFocus() && getGlobalVisibleRect(visibleBounds) && ValueAnimator.areAnimatorsEnabled()
        if (run && clock == null) {
            clock = ValueAnimator.ofFloat(phase, phase + 1f).apply {
                duration = 9000
                repeatCount = ValueAnimator.INFINITE
                interpolator = LinearInterpolator()
                addUpdateListener {
                    if (!ValueAnimator.areAnimatorsEnabled()) {
                        stopClock()
                        return@addUpdateListener
                    }
                    phase = (it.animatedValue as Float) % 1f
                    floatingIcon?.translationY = sin(phase * Math.PI * 2).toFloat() *
                        4f * resources.displayMetrics.density
                    invalidate()
                }
                start()
            }
        } else if (!run) stopClock()
    }

    private fun stopClock() {
        clock?.cancel()
        clock = null
        floatingIcon?.translationY = 0f
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        viewTreeObserver.addOnScrollChangedListener(scrollListener)
        post { updateClock() }
    }

    override fun onDetachedFromWindow() {
        stopClock()
        if (viewTreeObserver.isAlive) viewTreeObserver.removeOnScrollChangedListener(scrollListener)
        super.onDetachedFromWindow()
    }

    override fun onWindowVisibilityChanged(visibility: Int) {
        super.onWindowVisibilityChanged(visibility)
        updateClock()
    }

    override fun onVisibilityAggregated(isVisible: Boolean) {
        super.onVisibilityAggregated(isVisible)
        updateClock()
    }

    override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
        super.onWindowFocusChanged(hasWindowFocus)
        updateClock()
    }
}
