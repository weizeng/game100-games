package com.game100.center

import android.annotation.SuppressLint
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import com.google.android.material.appbar.MaterialToolbar
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.game100.center.data.GameRepository
import com.game100.center.net.AppUpdater
import com.game100.center.ui.UiMotion
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SettingsActivity : AppCompatActivity() {

    private lateinit var repo: GameRepository

    @SuppressLint("SetTextI18n")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        repo = GameRepository(this)
        findViewById<MaterialToolbar>(R.id.settings_toolbar).setNavigationOnClickListener { finish() }

        val etUrl = findViewById<EditText>(R.id.et_url)
        etUrl.setText(repo.getManifestUrl())

        findViewById<TextView>(R.id.tv_version).text =
            getString(R.string.version_full, BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE)

        val btnCheck = findViewById<Button>(R.id.btn_check_update)
        // 应用商店渠道（play / cn）不自更新，按钮改为"去商店更新"
        if (!BuildConfig.SELF_UPDATE) btnCheck.text = "去商店更新"
        // cn 离线版没有在线游戏库，隐藏"游戏内容来源"设置
        if (!BuildConfig.ONLINE_CATALOG) {
            (etUrl.parent as? android.view.View)?.visibility = android.view.View.GONE
        }
        btnCheck.setOnClickListener {
            btnCheck.isEnabled = false
            Toast.makeText(this, getString(R.string.checking_update), Toast.LENGTH_SHORT).show()
            AppUpdater.checkNow(
                this,
                onResult = { info ->
                    btnCheck.isEnabled = true
                    if (info != null && AppUpdater.hasUpdate(info)) {
                        AppUpdater.showUpdateFlow(this, info)
                    } else {
                        Toast.makeText(this, getString(R.string.already_latest), Toast.LENGTH_SHORT).show()
                    }
                },
                onError = { err ->
                    btnCheck.isEnabled = true
                    Toast.makeText(this, getString(R.string.check_failed, err), Toast.LENGTH_LONG).show()
                }
            )
        }

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
        val content = findViewById<android.view.ViewGroup>(android.R.id.content)
        UiMotion.bindButtons(content)
        UiMotion.enterPage(content)
    }
}
