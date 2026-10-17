package com.game100.center

import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.ColorUtils
import androidx.lifecycle.lifecycleScope
import com.game100.center.data.GameRepository
import com.game100.center.ui.UiMotion
import com.google.android.material.appbar.MaterialToolbar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.game100.center.model.RemoteGame

/**
 * 科学实验室：本机与远端理化生实验的独立板块
 */
class ScienceLabActivity : AppCompatActivity() {

    private val physicsIds = setOf(
        "projectile", "pendulum", "friction", "lever", "pulley", "collision",
        "freefall", "incline", "spring", "buoyancy", "reflection", "refraction",
        "lens", "prism", "circuit", "ohm", "seriesparallel", "magnet",
        "electromagnet", "resonance", "densitylab", "pressurelab",
        "heattransfer", "expansion", "wavelab", "staticlab", "rocketlab"
    )
    private val chemistryIds = setOf(
        "acidbase", "indicator", "chemreact", "electrolysis", "metalreact",
        "solubility", "crystal", "phtest", "combustion", "periodic", "fruitbattery"
    )
    private val biologyIds = setOf(
        "cellstruct", "mitosis", "heartpump", "lungcap", "digestion",
        "foodchain", "photosynthesis", "punnett", "skeleton", "eyevision",
        "microscopedab", "microscopelab", "ecobottle"
    )

    private val subjects = listOf("全部", "物理", "化学", "生物")
    private var selectedSubject = "全部"
    private val tabViews = mutableListOf<TextView>()
    private lateinit var adapter: ScienceCardAdapter
    private var allExperiments: List<RemoteGame> = emptyList()
    private var loading = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_science_lab)
        findViewById<MaterialToolbar>(R.id.science_toolbar).setNavigationOnClickListener { finish() }
        selectedSubject = savedInstanceState?.getString("subject") ?: "全部"

        // 学科标签
        val tabsContainer = findViewById<android.widget.LinearLayout>(R.id.subject_tabs)
        subjects.forEach { subject ->
            val tv = TextView(this).apply {
                text = subject
                textSize = 15f
                minHeight = dp(44)
                gravity = android.view.Gravity.CENTER
                isFocusable = true
                setPadding(dp(16), dp(10), dp(16), dp(10))
                setOnClickListener { selectSubject(subject) }
            }
            UiMotion.press(tv)
            tabViews.add(tv)
            tabsContainer.addView(tv)
            val params = tv.layoutParams as android.widget.LinearLayout.LayoutParams
            params.marginEnd = dp(8)
            tv.layoutParams = params
        }

        // 网格
        val recycler = findViewById<RecyclerView>(R.id.science_grid)
        recycler.layoutManager = GridLayoutManager(this, 2)
        adapter = ScienceCardAdapter { game ->
            val intent = Intent(this, GameDetailActivity::class.java)
            intent.putExtra("game_id", game.id)
            // 确保缓存有数据
            MainActivity.gameCache[game.id] = game
            startActivity(intent)
        }
        recycler.adapter = adapter

        selectSubject(selectedSubject)
        // Read installed experiments too: the homepage cache may still be loading or be lost on recreation.
        val cached = MainActivity.gameCache.values.toList()
        lifecycleScope.launch(Dispatchers.IO) {
            val repo = GameRepository(this@ScienceLabActivity)
            repo.ensureBundledGames(BuildConfig.VERSION_CODE)
            val experiments = repo.buildGameList(cached).filter { it.category == "科学实验" }.map {
                it.remote ?: RemoteGame(
                    id = it.id, name = it.name, desc = it.desc, version = it.installedVersion,
                    icon = it.icon, color = it.color, category = it.category,
                    url = "", size = 0, premium = it.isPremium
                )
            }
            withContext(Dispatchers.Main) {
                loading = false
                allExperiments = experiments
                refreshGrid()
            }
        }
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("subject", selectedSubject)
    }

    private fun selectSubject(subject: String) {
        selectedSubject = subject
        tabViews.forEachIndexed { i, tv ->
            val sel = subjects[i] == subject
            tv.background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(getColor(if (sel) R.color.stage else R.color.bg_card))
                if (!sel) setStroke(dp(1), getColor(R.color.divider))
            }
            tv.isSelected = sel
            tv.setTextColor(getColor(if (sel) android.R.color.white else R.color.text_secondary))
        }
        refreshGrid()
    }

    private fun refreshGrid() {
        val all = allExperiments
        val filtered = when (selectedSubject) {
            "物理" -> all.filter { it.id in physicsIds }
            "化学" -> all.filter { it.id in chemistryIds }
            "生物" -> all.filter { it.id in biologyIds || it.id !in physicsIds && it.id !in chemistryIds }
            else -> all
        }
        adapter.submit(filtered.sortedBy { it.name })
        findViewById<TextView>(R.id.science_count).text = if (loading) "正在加载实验…"
        else "${selectedSubject}实验 · ${filtered.size} 个"
        findViewById<View>(R.id.science_empty).visibility = if (!loading && filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    inner class ScienceCardAdapter(
        private val onClick: (RemoteGame) -> Unit
    ) : RecyclerView.Adapter<ScienceCardAdapter.VH>() {
        private var items: List<RemoteGame> = emptyList()
        fun submit(list: List<RemoteGame>) {
            items = list
            notifyDataSetChanged()
        }
        inner class VH(v: View) : RecyclerView.ViewHolder(v) {
            val icon: TextView = v.findViewById(R.id.card_icon)
            val name: TextView = v.findViewById(R.id.card_name)
            val desc: TextView = v.findViewById(R.id.card_desc)
        }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val v = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_science_card, parent, false)
            return VH(v)
        }
        override fun getItemCount() = items.size
        override fun onBindViewHolder(h: VH, position: Int) {
            val game = items[position]
            h.icon.text = game.icon
            val color = try { Color.parseColor(game.color) } catch (_: Exception) { getColor(R.color.brand) }
            h.icon.background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(ColorUtils.blendARGB(color, Color.WHITE, 0.86f))
            }
            h.name.text = game.name
            h.desc.text = game.desc
            UiMotion.press(h.itemView)
            h.itemView.setOnClickListener { onClick(game) }
        }
    }
}
