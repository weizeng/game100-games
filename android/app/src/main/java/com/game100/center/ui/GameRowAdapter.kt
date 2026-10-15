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

/** App Store 风格的紧凑列表行：图标 | 名称+分类 | 获取/更新按钮 */
class GameRowAdapter(
    private val onClick: (GameItem) -> Unit,
    private val onAction: (GameItem) -> Unit,
    private val onLongClick: (GameItem) -> Unit
) : ListAdapter<GameItem, GameRowAdapter.VH>(GameAdapter.DIFF) {

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
        return VH(v)
    }

    override fun onBindViewHolder(h: VH, position: Int) {
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
            if (item.isPremium) append("⭐精品 · ")
            if (item.isNew) append("NEW · ")
            append(item.category)
            if (item.installed) append(" · v${item.installedVersion}")
            if (item.hasUpdate) append(" → v${item.remote!!.version}")
        }
        h.sub.text = subText

        // 星级评分显示
        val userData = com.game100.center.data.UserData(ctx)
        val rating = userData.getRating(item.id)
        if (rating > 0) {
            h.rating.visibility = View.VISIBLE
            h.rating.text = "⭐".repeat(rating) + "☆".repeat(5 - rating)
        } else {
            h.rating.visibility = View.GONE
        }

        val actionText = when {
            item.hasUpdate -> ctx.getString(R.string.update_now)
            item.canDownload -> ctx.getString(R.string.download)
            else -> ctx.getString(R.string.play)
        }
        h.action.text = actionText
        h.action.setOnClickListener { onAction(item) }

        h.itemView.setOnClickListener { onClick(item) }
        h.itemView.setOnLongClickListener { onLongClick(item); true }
    }
}
