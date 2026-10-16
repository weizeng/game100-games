package com.game100.center.ui

import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.game100.center.R
import com.game100.center.model.GameItem

/** Game library row with a clear, accessible action for each download state. */
class GameRowAdapter(
    private val onClick: (GameItem) -> Unit,
    private val onAction: (GameItem) -> Unit,
    private val onLongClick: (GameItem) -> Unit
) : ListAdapter<GameItem, GameRowAdapter.VH>(GameAdapter.DIFF) {
    private val revealed = mutableSetOf<String>()

    fun submit(items: List<GameItem>) = submitList(items)

    inner class VH(v: View) : RecyclerView.ViewHolder(v) {
        val iconBg: View = v.findViewById(R.id.row_icon_bg)
        val icon: TextView = v.findViewById(R.id.row_icon)
        val name: TextView = v.findViewById(R.id.row_name)
        val sub: TextView = v.findViewById(R.id.row_sub)
        val rating: TextView = v.findViewById(R.id.row_rating)
        val action: TextView = v.findViewById(R.id.row_action)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_game_row, parent, false)
        // 图标圆角
        return VH(v).also {
            UiMotion.press(v, 0.98f)
            UiMotion.press(it.action)
        }
    }

    override fun onBindViewHolder(h: VH, position: Int) {
        UiMotion.reset(h.icon)
        val item = getItem(position)
        val ctx = h.itemView.context
        h.icon.text = item.icon
        h.iconBg.background = GameAdapter.tileBackground(ctx, item.color)
        // 小图标用较小圆角
        (h.iconBg.background as? GradientDrawable)?.let {
            val r = 14 * ctx.resources.displayMetrics.density
            it.cornerRadii = floatArrayOf(r, r, r, r, r, r, r, r)
        }
        h.name.text = item.name
        val subText = buildString {
            append(item.category)
            when {
                item.hasUpdate -> append("  ·  可更新")
                item.isNew -> append("  ·  新上架")
                item.isPremium -> append("  ·  精选")
                item.installed -> append("  ·  离线可玩")
            }
        }
        h.sub.text = subText

        // 星级评分显示
        val userData = com.game100.center.data.UserData(ctx)
        val rating = userData.getRating(item.id)
        if (rating > 0) {
            h.rating.visibility = View.VISIBLE
            h.rating.text = "★".repeat(rating) + "☆".repeat(5 - rating)
            h.rating.contentDescription = "你的评分：$rating 星"
        } else {
            h.rating.visibility = View.GONE
        }

        val actionText = when {
            item.hasUpdate -> "更新"
            item.canDownload -> ctx.getString(R.string.download)
            else -> "开玩"
        }
        h.action.text = actionText
        h.action.setBackgroundResource(when {
            item.hasUpdate -> R.drawable.pill_update
            item.canDownload -> R.drawable.pill_secondary
            else -> R.drawable.pill_action
        })
        h.action.setTextColor(ctx.getColor(when {
            item.hasUpdate -> R.color.accent
            item.canDownload -> R.color.brand
            else -> android.R.color.white
        }))
        h.action.contentDescription = "${item.name}，$actionText"
        h.action.setOnClickListener { onAction(item) }

        h.itemView.setOnClickListener { onClick(item) }
        h.itemView.setOnLongClickListener { onLongClick(item); true }
    }

    override fun onViewAttachedToWindow(holder: VH) {
        super.onViewAttachedToWindow(holder)
        val position = holder.bindingAdapterPosition
        if (position in 0 until minOf(itemCount, 6) && revealed.add(getItem(position).id)) {
            UiMotion.enter(holder.icon, position * 35L)
        }
    }

    override fun onViewDetachedFromWindow(holder: VH) {
        UiMotion.reset(holder.icon)
        UiMotion.reset(holder.itemView)
        UiMotion.reset(holder.action)
        super.onViewDetachedFromWindow(holder)
    }
}
