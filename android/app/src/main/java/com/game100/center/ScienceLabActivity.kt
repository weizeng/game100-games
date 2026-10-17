package com.game100.center

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.game100.center.model.RemoteGame

/**
 * 🔬 科学实验室：50款理化生实验游戏的独立板块
 */
class ScienceLabActivity : AppCompatActivity() {

    private val physicsIds = setOf(
        "projectile", "pendulum", "friction", "lever", "pulley", "collision",
        "freefall", "incline", "spring", "buoyancy", "reflection", "refraction",
        "lens", "prism", "circuit", "ohm", "seriesparallel", "magnet",
        "electromagnet", "resonance", "densitylab", "pressurelab",
        "heattransfer", "expansion", "wavelab", "staticlab"
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_science_lab)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "科学实验室"

        // 学科标签
        val tabsContainer = findViewById<android.widget.LinearLayout>(R.id.subject_tabs)
        subjects.forEach { subject ->
            val tv = TextView(this).apply {
                text = subject
                textSize = 15f
                setPadding(32, 16, 32, 16)
                setOnClickListener { selectSubject(subject) }
            }
            tabViews.add(tv)
            tabsContainer.addView(tv)
            val params = tv.layoutParams as android.widget.LinearLayout.LayoutParams
            params.marginEnd = 16
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

        selectSubject("全部")
    }

    private fun selectSubject(subject: String) {
        selectedSubject = subject
        tabViews.forEachIndexed { i, tv ->
            val sel = subjects[i] == subject
            tv.setBackgroundResource(if (sel) R.drawable.pill_action else R.drawable.search_bg)
            tv.setTextColor(getColor(if (sel) android.R.color.white else R.color.text_secondary))
        }
        refreshGrid()
    }

    private fun refreshGrid() {
        val all = MainActivity.gameCache.values.filter { it.category == "科学实验" }
        val filtered = when (selectedSubject) {
            "物理" -> all.filter { it.id in physicsIds }
            "化学" -> all.filter { it.id in chemistryIds }
            "生物" -> all.filter { it.id in biologyIds || it.id !in physicsIds && it.id !in chemistryIds }
            else -> all
        }
        adapter.submit(filtered.sortedBy { it.name })
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
            try {
                h.icon.setBackgroundColor(android.graphics.Color.parseColor(game.color))
            } catch (e: Exception) { }
            h.name.text = game.name
            h.desc.text = game.desc.take(30)
            h.itemView.setOnClickListener { onClick(game) }
        }
    }
}
