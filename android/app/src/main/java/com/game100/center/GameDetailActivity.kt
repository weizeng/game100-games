package com.game100.center

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.game100.center.data.UserData
import com.game100.center.model.RemoteGame

/**
 * 游戏详情页（App Store 风格）：大图标、星级评分、收藏、最高分、开始游戏
 */
class GameDetailActivity : AppCompatActivity() {

    private lateinit var userData: UserData
    private lateinit var game: RemoteGame

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_game_detail)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = ""

        userData = UserData(this)

        // 从 Intent 获取游戏信息
        val gameId = intent.getStringExtra("game_id") ?: run { finish(); return }
        // 简化：从 GameRepository 获取（实际应传完整对象或查缓存）
        // 这里通过 MainActivity 的静态缓存获取
        game = MainActivity.gameCache[gameId] ?: run { finish(); return }

        supportActionBar?.title = game.name

        findViewById<TextView>(R.id.detail_icon).apply {
            text = game.icon
            setBackgroundColor(parseGameColor(game.color))
        }
        findViewById<TextView>(R.id.detail_name).text = game.name
        findViewById<TextView>(R.id.detail_category).text = game.category
        findViewById<TextView>(R.id.detail_size).text = formatSize(game.size)
        findViewById<TextView>(R.id.detail_desc).text =
            game.desc.ifBlank { "暂无简介" }

        // 最高分
        val best = userData.getBestScore(gameId)
        if (best > 0) {
            findViewById<TextView>(R.id.detail_best_score).apply {
                visibility = android.view.View.VISIBLE
                text = "🏆 历史最高分：$best"
            }
        }

        // 收藏按钮
        val btnFav = findViewById<TextView>(R.id.btn_favorite)
        fun refreshFav() {
            btnFav.text = if (userData.isFavorite(gameId)) "❤️" else "🤍"
        }
        refreshFav()
        btnFav.setOnClickListener {
            val now = userData.toggleFavorite(gameId)
            refreshFav()
            Toast.makeText(this, if (now) "已收藏" else "已取消收藏", Toast.LENGTH_SHORT).show()
        }

        // 星级评分
        val starsRow = findViewById<LinearLayout>(R.id.stars_row)
        val starViews = mutableListOf<TextView>()
        fun refreshStars() {
            val rating = userData.getRating(gameId)
            starViews.forEachIndexed { i, tv ->
                tv.text = if (i < rating) "⭐" else "☆"
            }
            findViewById<TextView>(R.id.detail_rating_text).text =
                if (rating > 0) "你的评分：$rating 星" else "点击星星评分"
        }
        repeat(5) { i ->
            val tv = TextView(this).apply {
                text = "☆"
                textSize = 32f
                setPadding(4, 0, 4, 0)
                setOnClickListener {
                    userData.setRating(gameId, i + 1)
                    refreshStars()
                    Toast.makeText(this@GameDetailActivity, "已评分 ${i + 1} 星", Toast.LENGTH_SHORT).show()
                }
            }
            starViews.add(tv)
            starsRow.addView(tv)
        }
        refreshStars()

        // 开始游戏
        findViewById<Button>(R.id.btn_play).setOnClickListener {
            val intent = Intent(this, GameActivity::class.java).apply {
                putExtra("game_id", game.id)
            }
            startActivity(intent)
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    private fun parseGameColor(color: String): Int = try {
        android.graphics.Color.parseColor(color)
    } catch (e: Exception) {
        android.graphics.Color.parseColor("#607D8B")
    }

    private fun formatSize(bytes: Long): String = when {
        bytes <= 0 -> "未知大小"
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "%.1f KB".format(bytes / 1024.0)
        else -> "%.1f MB".format(bytes / 1024.0 / 1024.0)
    }
}
