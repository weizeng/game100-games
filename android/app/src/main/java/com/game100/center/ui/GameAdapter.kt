package com.game100.center.ui

import android.content.Context
import android.graphics.Color
import androidx.core.graphics.ColorUtils
import android.graphics.drawable.GradientDrawable
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

        /** Quiet pastel icon tiles retain each game's own color. */
        fun tileBackground(ctx: Context, colorStr: String): GradientDrawable {
            val base = try {
                Color.parseColor(colorStr)
            } catch (e: Exception) {
                Color.parseColor("#607D8B")
            }
            return GradientDrawable().apply {
                setColor(ColorUtils.blendARGB(base, Color.WHITE, 0.86f))
                setStroke((ctx.resources.displayMetrics.density + 0.5f).toInt(), ColorUtils.blendARGB(base, Color.WHITE, 0.65f))
                cornerRadius = 18 * ctx.resources.displayMetrics.density
            }
        }

        fun featuredBackground(ctx: Context, colorStr: String): GradientDrawable {
            val base = try { Color.parseColor(colorStr) } catch (_: Exception) { ctx.getColor(R.color.brand) }
            val navy = ctx.getColor(R.color.stage)
            return GradientDrawable(GradientDrawable.Orientation.TL_BR,
                intArrayOf(ColorUtils.blendARGB(base, navy, 0.86f), navy)).apply {
                cornerRadius = 24 * ctx.resources.displayMetrics.density
            }
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
