package com.game100.center.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.game100.center.R
import com.game100.center.model.GameItem

/** 顶部大横幅轮播（新上架游戏） */
class FeaturedAdapter(
    private val onClick: (GameItem) -> Unit
) : ListAdapter<GameItem, FeaturedAdapter.VH>(GameAdapter.DIFF) {

    fun submit(items: List<GameItem>) = submitList(items)

    inner class VH(v: View) : RecyclerView.ViewHolder(v) {
        val bg: View = v.findViewById(R.id.feat_bg)
        val kicker: TextView = v.findViewById(R.id.feat_kicker)
        val name: TextView = v.findViewById(R.id.feat_name)
        val desc: TextView = v.findViewById(R.id.feat_desc)
        val icon: TextView = v.findViewById(R.id.feat_icon)
        val effects: ArcadeBackdropView = v.findViewById(R.id.feat_effects)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_featured, parent, false)
        UiMotion.press(v, 0.97f, tilt = true)
        return VH(v).also { it.effects.bindIcon(it.icon) }
    }

    override fun onBindViewHolder(h: VH, position: Int) {
        val item = getItem(position)
        val ctx = h.itemView.context
        h.bg.background = GameAdapter.featuredBackground(ctx, item.color)
        h.kicker.text = when {
            item.isNew -> "新鲜上架"
            item.isPremium -> "精选推荐"
            else -> item.category
        }
        h.kicker.visibility = View.VISIBLE
        h.name.text = item.name
        h.desc.text = item.desc.ifBlank { item.category }
        h.icon.text = item.icon
        h.itemView.setOnClickListener { onClick(item) }
    }

    override fun onViewDetachedFromWindow(holder: VH) {
        UiMotion.reset(holder.itemView)
        super.onViewDetachedFromWindow(holder)
    }
}
