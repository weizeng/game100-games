package com.game100.center

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.game100.center.data.GameRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SettingsActivity : AppCompatActivity() {

    private lateinit var repo: GameRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        repo = GameRepository(this)

        val etUrl = findViewById<EditText>(R.id.et_url)
        etUrl.setText(repo.getManifestUrl())

        findViewById<Button>(R.id.btn_save).setOnClickListener {
            repo.setManifestUrl(etUrl.text.toString())
            Toast.makeText(this, getString(R.string.saved), Toast.LENGTH_SHORT).show()
            finish()
        }

        findViewById<Button>(R.id.btn_default).setOnClickListener {
            etUrl.setText(GameRepository.DEFAULT_MANIFEST_URL)
        }

        findViewById<Button>(R.id.btn_clear).setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle(R.string.clear_cache)
                .setMessage("将删除全部已下载游戏（含内置游戏），确定吗？")
                .setPositiveButton(R.string.delete) { _, _ ->
                    lifecycleScope.launch(Dispatchers.IO) {
                        repo.clearAllDownloads()
                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@SettingsActivity, "已清除", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
        }
    }
}
