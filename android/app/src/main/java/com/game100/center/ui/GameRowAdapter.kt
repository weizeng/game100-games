package com.game100.center.ui

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
        val studio: TextView = v.findViewById(R.id.row_studio)
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
        h.iconBg.background = GameAdapter.tileBackground(ctx, item.color, sizeDp = 68f, radiusDp = 20f)
        h.name.text = item.name
        StudioUi.bindCardBadge(h.studio, item.studio)
        // 网格卡片较窄：只显示一个最重要的状态
        val subText = when {
            item.hasUpdate -> "v${item.installedVersion} → v${item.remote?.version ?: item.installedVersion}"
            item.isNew -> "✨ 新上架"
            item.isPremium -> "🔥 精选"
            item.installed -> "已下载 · 离线可玩"
            else -> item.category
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
        h.action.text = when {
            item.hasUpdate -> "⬆ $actionText"
            item.canDownload -> "⬇ $actionText"
            else -> "▶ $actionText"
        }
        h.action.setBackgroundResource(when {
            item.hasUpdate -> R.drawable.pill_update
            item.canDownload -> R.drawable.pill_download
            else -> R.drawable.pill_action
        })
        h.action.setTextColor(ctx.getColor(when {
            item.hasUpdate -> R.color.pink_ink
            item.canDownload -> R.color.cyan_ink
            else -> R.color.coin_ink
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
