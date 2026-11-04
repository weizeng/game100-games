package com.game100.center.ui

import android.os.Build
import android.util.TypedValue
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.game100.center.BuildConfig
import com.game100.center.data.UserData
import com.game100.center.net.FeedbackApi
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * 应用内反馈：点选问题类型 + 可选补充说明，提交到 Supabase feedbacks。
 */
object FeedbackDialog {

    @Volatile
    private var lastSubmitAt = 0L

    fun show(activity: AppCompatActivity, gameId: String?) {
        if (activity.isFinishing) return
        val density = activity.resources.displayMetrics.density
        val pad = (16 * density).toInt()

        val root = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad / 2, pad, pad / 2)
        }

        root.addView(TextView(activity).apply {
            text = if (gameId.isNullOrBlank()) {
                "选一个问题类型，可再补充几句。我们会尽快看。"
            } else {
                "游戏：$gameId\n选一个问题类型，可再补充几句。"
            }
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        })

        val chips = ChipGroup(activity).apply {
            isSingleSelection = true
            isSelectionRequired = true
            setPadding(0, pad / 2, 0, pad / 2)
        }
        FeedbackApi.CATEGORIES.forEachIndexed { index, cat ->
            val chip = Chip(activity).apply {
                text = cat.label
                tag = cat.id
                isCheckable = true
                isClickable = true
                if (index == FeedbackApi.CATEGORIES.lastIndex) isChecked = true
            }
            chips.addView(chip)
        }
        root.addView(chips)

        val input = EditText(activity).apply {
            hint = "补充说明（可选）：比如点哪里没反应、第几关"
            minLines = 3
            maxLines = 6
            setPadding(pad / 2, pad / 2, pad / 2, pad / 2)
        }
        root.addView(input)

        val scroll = ScrollView(activity).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            addView(root)
        }

        val dialog = AlertDialog.Builder(activity)
            .setTitle("反馈问题")
            .setView(scroll)
            .setPositiveButton("提交", null)
            .setNegativeButton("取消", null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val checkedId = chips.checkedChipId
                val chip = if (checkedId != ViewGroup.NO_ID) {
                    chips.findViewById<Chip>(checkedId)
                } else {
                    null
                }
                val category = chip?.tag as? String
                if (category.isNullOrBlank()) {
                    Toast.makeText(activity, "请先选一个问题类型", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                val message = input.text?.toString()?.trim().orEmpty()
                if (category == "other" && message.isEmpty()) {
                    Toast.makeText(activity, "选「其他」时请写一句说明", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                val now = System.currentTimeMillis()
                if (now - lastSubmitAt < 8_000L) {
                    Toast.makeText(activity, "刚提交过，稍等几秒再试", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (!FeedbackApi.isConfigured || !BuildConfig.ONLINE_CATALOG) {
                    Toast.makeText(activity, "当前版本无法在线提交反馈", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                val btn = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                btn.isEnabled = false
                activity.lifecycleScope.launch {
                    val result = withContext(Dispatchers.IO) {
                        try {
                            val user = UserData(activity)
                            val info = buildString {
                                append(Build.MANUFACTURER).append(' ').append(Build.MODEL)
                                append(" SDK").append(Build.VERSION.SDK_INT)
                                append(' ').append(BuildConfig.FLAVOR)
                            }
                            FeedbackApi.submit(
                                category = category,
                                message = message,
                                gameId = gameId,
                                appVersion = BuildConfig.VERSION_NAME,
                                deviceInfo = info,
                                deviceId = user.getDeviceId()
                            )
                            true to null
                        } catch (e: Exception) {
                            false to (e.message ?: "unknown")
                        }
                    }
                    if (activity.isFinishing) return@launch
                    btn.isEnabled = true
                    val (ok, err) = result
                    if (ok) {
                        lastSubmitAt = System.currentTimeMillis()
                        Toast.makeText(activity, "已收到，谢谢反馈", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                    } else {
                        Toast.makeText(
                            activity,
                            "提交失败：${err ?: "请检查网络后重试"}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        }
        dialog.show()
    }
}
