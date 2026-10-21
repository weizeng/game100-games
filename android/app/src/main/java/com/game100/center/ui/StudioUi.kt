package com.game100.center.ui

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.StyleSpan
import android.view.Gravity
import android.widget.TextView
import com.game100.center.R
import com.game100.center.model.Studio

/** 出品方徽章 / 筛选胶囊（皮肤 B 立体糖果风）。颜色与记号来自 [Studio.look]。 */
object StudioUi {
    private fun dp(ctx: Context, v: Float): Int = (v * ctx.resources.displayMetrics.density + 0.5f).toInt()

    /** 带立体底边的糖果面：radii 为 8 个角半径（px），ledge 为底边厚度（px） */
    fun candyFace(top: Int, bottom: Int, edge: Int, line: Int, radii: FloatArray, ledge: Int, stroke: Int): Drawable {
        val base = GradientDrawable().apply { setColor(edge); cornerRadii = radii }
        val face = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(top, bottom)).apply {
            cornerRadii = radii; setStroke(stroke, line)
        }
        return LayerDrawable(arrayOf(base, face)).apply { setLayerInset(1, 0, 0, 0, ledge) }
    }

    /**
     * 游戏卡片左上角的小角标（像贴在卡片角上的标签）：外侧角跟卡片圆角一致，内侧角小圆角。
     */
    fun bindCardBadge(tv: TextView, studio: String) {
        val ctx = tv.context
        val look = Studio.look(studio)
        val card = dp(ctx, 24f).toFloat()
        val inner = dp(ctx, 10f).toFloat()
        val small = dp(ctx, 3f).toFloat()
        // 左上 = 卡片圆角，右上/左下 = 小圆角，右下 = 内侧圆角
        val radii = floatArrayOf(card, card, small, small, inner, inner, small, small)
        tv.background = candyFace(look.top, look.bottom, look.edge, look.line, radii, dp(ctx, 2f), dp(ctx, 1f))
        tv.text = Studio.badgeText(studio)
        tv.setTextColor(look.ink)
        tv.contentDescription = "${Studio.canonical(studio)} 出品"
    }

    /** 详情页大头图下方的出品方胶囊 */
    fun bindDetailChip(tv: TextView, studio: String) {
        val ctx = tv.context
        val look = Studio.look(studio)
        val r = dp(ctx, 16f).toFloat()
        tv.background = candyFace(look.top, look.bottom, look.edge, look.line, FloatArray(8) { r }, dp(ctx, 3f), dp(ctx, 1f))
        tv.text = "${Studio.badgeText(studio)} 出品 ›"
        tv.setTextColor(look.ink)
        tv.setPadding(dp(ctx, 12f), 0, dp(ctx, 12f), dp(ctx, 3f))
        tv.contentDescription = "${Studio.canonical(studio)} 出品，点按查看同出品方的游戏"
    }

    /**
     * 首页“出品方”筛选胶囊。studio 为 null 表示“全部”。
     * 选中：出品方颜色的立体糖果；未选中：玻璃胶囊，记号用出品方颜色点亮。
     */
    fun styleFilterChip(tv: TextView, studio: String?, count: Int, selected: Boolean) {
        val ctx = tv.context
        val r = dp(ctx, 18f).toFloat()
        val radii = FloatArray(8) { r }
        tv.gravity = Gravity.CENTER
        tv.textSize = 12.5f
        tv.minHeight = dp(ctx, 38f)
        tv.setPadding(dp(ctx, 12f), dp(ctx, 6f), dp(ctx, 12f), dp(ctx, 9f))
        if (studio == null) {
            tv.text = "全部 · $count"
            tv.background = if (selected) candyFace(
                ctx.getColor(R.color.coin_hi), ctx.getColor(R.color.coin_lo), ctx.getColor(R.color.coin_edge),
                ctx.getColor(R.color.coin_line), radii, dp(ctx, 3f), dp(ctx, 1f)
            ) else glass(ctx, radii)
            tv.setTextColor(ctx.getColor(if (selected) R.color.coin_ink else R.color.text_secondary))
        } else {
            val look = Studio.look(studio)
            val name = Studio.canonical(studio)
            val sb = SpannableStringBuilder()
            sb.append(look.mark, ForegroundColorSpan(if (selected) look.ink else look.top), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            sb.append(" ")
            sb.append(name, StyleSpan(Typeface.BOLD), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            sb.append(" 出品 · $count")
            tv.text = sb
            tv.background = if (selected)
                candyFace(look.top, look.bottom, look.edge, look.line, radii, dp(ctx, 3f), dp(ctx, 1f))
            else glass(ctx, radii)
            tv.setTextColor(if (selected) look.ink else ctx.getColor(R.color.text_primary))
            tv.contentDescription = "只看 $name 出品的游戏，共 $count 款"
        }
        tv.isSelected = selected
        tv.setTypeface(null, if (selected) Typeface.BOLD else Typeface.NORMAL)
    }

    private fun glass(ctx: Context, radii: FloatArray): Drawable = candyFace(
        ctx.getColor(R.color.glass_top), ctx.getColor(R.color.glass_bottom), ctx.getColor(R.color.ledge),
        ctx.getColor(R.color.glass_line), radii, dp(ctx, 3f), dp(ctx, 1f)
    )
}
