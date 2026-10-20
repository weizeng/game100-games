package com.game100.center.ui

import android.content.Context
import android.graphics.Color
import androidx.core.graphics.ColorUtils
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.game100.center.R
import com.game100.center.model.GameItem

class GameAdapter(
    private val onClick: (GameItem) -> Unit,
    private val onLongClick: (GameItem) -> Unit
) : ListAdapter<GameItem, GameAdapter.VH>(DIFF) {

    companion object {
        val DIFF = object : DiffUtil.ItemCallback<GameItem>() {
            override fun areItemsTheSame(a: GameItem, b: GameItem) = a.id == b.id
            override fun areContentsTheSame(a: GameItem, b: GameItem) = a == b
        }

        private fun parse(ctx: Context, colorStr: String): Int = try {
            Color.parseColor(colorStr)
        } catch (_: Exception) {
            ctx.getColor(R.color.pink)
        }

        /** 皮肤 B：把游戏主色推得更饱和，避免灰扑扑的糖果色。 */
        fun candy(base: Int): Int {
            val r = Color.red(base); val g = Color.green(base); val b = Color.blue(base)
            val m = (r + g + b) / 3f
            fun p(v: Int) = (m + (v - m) * 1.35f).toInt().coerceIn(0, 255)
            return Color.rgb(p(r), p(g), p(b))
        }

        private fun dp(ctx: Context, v: Float) = v * ctx.resources.displayMetrics.density

        /**
         * 糖果图标底：台阶阴影 + 径向高光渐变面 + 3dp 白描边 + 顶部光泽。
         * sizeDp / radiusDp 要和放置它的 View 一致，光泽和台阶才准确。
         */
        fun tileBackground(ctx: Context, colorStr: String, sizeDp: Float = 68f, radiusDp: Float = 20f): Drawable {
            val c = candy(parse(ctx, colorStr))
            val r = dp(ctx, radiusDp)
            val ledgeH = dp(ctx, if (sizeDp >= 100f) 6f else 4f).toInt()
            val ledge = GradientDrawable().apply {
                setColor(ColorUtils.blendARGB(c, Color.BLACK, 0.5f)); cornerRadius = r
            }
            val face = GradientDrawable().apply {
                gradientType = GradientDrawable.RADIAL_GRADIENT
                colors = intArrayOf(ColorUtils.blendARGB(c, Color.WHITE, 0.45f), c, ColorUtils.blendARGB(c, Color.BLACK, 0.22f))
                setGradientCenter(0.3f, 0.22f)
                gradientRadius = dp(ctx, sizeDp) * 0.95f
                cornerRadius = r
                setStroke(dp(ctx, if (sizeDp >= 100f) 5f else 3f).toInt(), Color.WHITE)
            }
            val gloss = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(0x8CFFFFFF.toInt(), 0x00FFFFFF)).apply { cornerRadius = r * 0.75f }
            return LayerDrawable(arrayOf(ledge, face, gloss)).apply {
                setLayerInset(0, 0, ledgeH, 0, 0)
                setLayerInset(1, 0, 0, 0, ledgeH)
                val side = dp(ctx, sizeDp * 0.09f).toInt()
                setLayerInset(2, side, dp(ctx, 4f).toInt(), side, (dp(ctx, sizeDp) * 0.55f).toInt())
            }
        }

        /** 精选卡：游戏主色斜向糖果渐变 + 3dp 白描边 + 7dp 台阶阴影。 */
        fun featuredBackground(ctx: Context, colorStr: String): Drawable {
            val c = candy(parse(ctx, colorStr))
            val r = dp(ctx, 28f)
            val ledge = GradientDrawable().apply { setColor(ColorUtils.blendARGB(c, Color.BLACK, 0.5f)); cornerRadius = r }
            val face = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(
                ColorUtils.blendARGB(c, Color.WHITE, 0.45f), c, ColorUtils.blendARGB(c, Color.BLACK, 0.22f))).apply {
                cornerRadius = r
                setStroke(dp(ctx, 3f).toInt(), 0xE6FFFFFF.toInt())
            }
            return LayerDrawable(arrayOf(ledge, face)).apply {
                setLayerInset(0, 0, dp(ctx, 7f).toInt(), 0, 0)
                setLayerInset(1, 0, 0, 0, dp(ctx, 7f).toInt())
            }
        }

        /** 详情页头图：游戏主色竖向渐变，底部融进页面深紫。 */
        fun heroBackground(ctx: Context, colorStr: String): Drawable {
            val c = candy(parse(ctx, colorStr))
            val top = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(
                ColorUtils.blendARGB(c, Color.WHITE, 0.4f), c, ColorUtils.blendARGB(c, Color.BLACK, 0.25f)))
            val fade = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(
                Color.TRANSPARENT, Color.TRANSPARENT, ctx.getColor(R.color.bg_top)))
            return LayerDrawable(arrayOf(top, fade))
        }
    }

    fun submit(items: List<GameItem>) = submitList(items)

    inner class VH(v: View) : RecyclerView.ViewHolder(v) {
        val iconBg: View = v.findViewById(R.id.icon_bg)
        val icon: TextView = v.findViewById(R.id.icon)
        val badge: TextView = v.findViewById(R.id.badge)
        val dlBadge: TextView = v.findViewById(R.id.dl_badge)
        val catChip: TextView = v.findViewById(R.id.cat_chip)
        val newBadge: TextView = v.findViewById(R.id.new_badge)
        val name: TextView = v.findViewById(R.id.name)
        val desc: TextView = v.findViewById(R.id.desc)
        val status: TextView = v.findViewById(R.id.status)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_game, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(h: VH, position: Int) {
        val item = getItem(position)
        val ctx = h.itemView.context
        h.icon.text = item.icon
        h.name.text = item.name
        h.desc.text = item.desc
        h.desc.visibility = if (item.desc.isBlank()) View.GONE else View.VISIBLE
        h.catChip.text = item.category
        h.iconBg.background = tileBackground(ctx, item.color)

        h.badge.visibility = if (item.hasUpdate) View.VISIBLE else View.GONE
        h.dlBadge.visibility = if (item.canDownload) View.VISIBLE else View.GONE
        h.newBadge.visibility = if (item.isNew) View.VISIBLE else View.GONE

        val statusText = when {
            item.hasUpdate -> "v${item.installedVersion} → v${item.remote!!.version}"
            item.installed -> ctx.getString(R.string.version_format, item.installedVersion)
            item.canDownload -> {
                val kb = item.remote!!.size / 1024
                if (kb > 0) "${ctx.getString(R.string.not_installed)} · ${kb}KB"
                else ctx.getString(R.string.not_installed)
            }
            else -> ""
        }
        h.status.text = statusText
        h.status.visibility = if (statusText.isBlank()) View.GONE else View.VISIBLE

        h.itemView.setOnClickListener { onClick(item) }
        h.itemView.setOnLongClickListener { onLongClick(item); true }
    }
}
