# 游戏100 Android 打包说明（给 muse）

> 适用分支：`play-release-setup` 合并之后的 main。
> 环境：**JDK 17**、Android SDK **platforms;android-36 + build-tools;36.0.0**、AGP 8.9.1、Kotlin 2.0.21、Gradle 8.11.1（仓库自带 `android/gradlew`，不用另装 Gradle）。

## 1. 三个渠道（product flavor）

| 渠道 | 用途 | 自升级（下载安装新 APK） | 在线游戏库（CDN 下载新游戏） | 权限 | 内置游戏 |
|---|---|---|---|---|---|
| `play` | Google Play、TapTap | ❌ 去掉（“检查更新”改为跳转商店） | ✅ | INTERNET、ACCESS_NETWORK_STATE、VIBRATE | 构建时把仓库 `games/` 下**全部**游戏打进包里 |
| `cn` | 华为 / 小米 / OPPO / vivo 等国内商店 | ❌ | ❌ 完全离线 | 仅 VIBRATE（**没有联网权限**） | 构建时把仓库 `games/` 下**全部**游戏打进包里 |
| `direct` | 官网 / GitHub 直装（原来的行为） | ✅ | ✅ | 另加 REQUEST_INSTALL_PACKAGES + FileProvider | 同上，全部游戏 |

代码层面：
- `BuildConfig.SELF_UPDATE`、`BuildConfig.ONLINE_CATALOG`、`BuildConfig.STORE_CHANNEL` 区分渠道。
- 自升级代码只在 `src/direct/`（`net/AppUpdater.kt`、`res/xml/file_paths.xml`、Manifest 里的权限和 FileProvider）。
  - 更新包下载到内部缓存 `cacheDir/updates/update.apk`，由 `file_paths.xml` 的 `cache-path name="app_updates"` 覆盖。
    **file_paths.xml 里每个 name 必须唯一**：v4.11 及以前两条都叫 `update`，后一条覆盖前一条，导致
    “Failed to find configured root that contains /storage/…”，自升级从未成功过（v4.12 修复）。
    `./gradlew testDirectDebugUnitTest` 里的 `FileProviderPathsTest`（静态检查）和 `AppUpdaterFileProviderTest`（Robolectric 实测 getUriForFile）会拦住这类问题。
  - 下载或安装失败时弹框提供“重试”和“用浏览器下载”（打开 app.json 的 apkUrl）。
  - app.json 同时向 jsDelivr 4 个节点 + raw.githubusercontent 请求，取 versionCode 最大的（jsDelivr 的 @main 常缓存旧版本）。
  `play` 和 `cn` 编译 `src/noSelfUpdate/` 里的同名空实现，所以这两个包里**根本没有**下载安装 APK 的代码。
- `cn` 的 Manifest（`src/cn/AndroidManifest.xml`）用 `tools:node="remove"` 去掉 INTERNET / ACCESS_NETWORK_STATE。
- **内置游戏（所有渠道，自 v4.10 起）**：Gradle 任务 `zipBundledGames` 在构建时把仓库 `games/<id>/` 全部打成
  `assets/bundled/<id>.zip`（输出到 `app/build/generated/bundledGames/`，挂在 `main` 的 assets 上），不会改动仓库文件。
  - 以前 play/direct 用的是提交在仓库里的 `src/main/assets/bundled`（停在 10-17 的 206 款旧版），已删除，所以**内置游戏永远等于当前 `games/`**，不会再过期。
  - App 启动时 `GameRepository.ensureBundledGames()` 在 App 版本号变化后读每个 zip 里 `meta.json` 的 `version`，**只有比手机上已安装的版本新才覆盖**；
    CDN 的 `manifest.json` 版本和 `games/*/meta.json` 一致，所以升级后不会把全部游戏再下载一遍。
  - 因此**必须在完整仓库里构建**（需要 `../games` 目录），找不到任何游戏会直接报错。
  - `./gradlew testPlayReleaseUnitTest` 会按 App 的读取方式检查内置包：数量、版本号与 meta.json 一致、能解压出与仓库相同的 index.html。

## 2. 打包命令

都在 `android/` 目录下执行：

```bash
cd android

# Google Play（上传用 AAB）
./gradlew bundlePlayRelease  -Pgame100.versionCode=23 -Pgame100.versionName=4.6
# 产物：app/build/outputs/bundle/playRelease/app-play-release.aab

# TapTap 用的 APK（同 play 渠道，无自升级）
./gradlew assemblePlayRelease -Pgame100.versionCode=23 -Pgame100.versionName=4.6
# 产物：app/build/outputs/apk/play/release/app-play-release.apk

# 国内商店（完全离线）
./gradlew assembleCnRelease   -Pgame100.versionCode=23 -Pgame100.versionName=4.6
# 产物：app/build/outputs/apk/cn/release/app-cn-release.apk

# 官网直装（带自升级，原行为）
./gradlew assembleDirectRelease -Pgame100.versionCode=23 -Pgame100.versionName=4.6
# 产物：app/build/outputs/apk/direct/release/app-direct-release.apk

# 一次全打
./gradlew bundlePlayRelease assemblePlayRelease assembleCnRelease assembleDirectRelease -Pgame100.versionCode=23 -Pgame100.versionName=4.6
```

没配签名时文件名会带 `-unsigned`，需要自己签名（见第 4 节）。调试包：`./gradlew assemblePlayDebug`（包名带 `.debug` 后缀，可与正式版共存）。

### 小游戏下载（自 v4.10 起）

`net/GameDownloader.kt` + `net/Mirrors.kt`：
- 连接超时 15 秒、读取超时 30 秒（按“多久没收到数据”计时，慢网只要还在传就不会超时）。
- 线路：`cdn.jsdelivr.net` → `fastly.jsdelivr.net` → `gcore.jsdelivr.net` → `testingcf.jsdelivr.net` → `raw.githubusercontent.com`，上次成功的线路下次优先；最多 3 轮，轮间等 1 秒 / 3 秒，总时长约 3 分钟封顶。manifest.json 也走同样的线路。
- 同一线路断点续传；先写 `.part` 临时文件，校验（manifest 的 size + zip 结构与 CRC + 含 index.html/meta.json）通过后再改名；解压到临时目录成功后才替换旧游戏。
- 最多同时下载 2 个，其余排队；下载框可取消；失败时弹出原因 + “重试”按钮。
- 单元测试 `GameDownloaderTest` 用本地服务器模拟：慢速、卡死、断流、坏包、503、续传、全部失败、取消、并发上限。

## 3. versionCode 规则

- **所有渠道共用同一个 versionCode / versionName**，一次发版只 +1 一次。
- versionName 只是显示用的字符串（如 4.10），App 自升级和各商店都只比较 versionCode，所以 4.10 排在 4.9 之后没有问题。
- 每次发版 versionCode 必须**严格大于**上一次（Google Play 和各商店都会拒绝相同或更小的值；`publish-stores.yml` 会自动校验）。
- 当前默认值：versionCode **30**、versionName **4.13**（写在 `android/app/build.gradle` 里）。23/4.6、24/4.7 已被 Muse 本地出包占用（见附录 A.6、A.9），下一次发版用 31。
- 传入方式（优先级从高到低）：`-Pgame100.versionCode=23` / 环境变量 `GAME100_VERSIONCODE=23`；versionName 同理（`game100.versionName` / `GAME100_VERSIONNAME`）。
- 也可以直接改 `build.gradle` 里的默认值并提交，这样仓库记录的就是最新版本。

## 4. 签名

签名信息**只**从下面三处读取，仓库里不写任何密码：

1. `android/release.properties`（已加入 `.gitignore`，不会提交）：
   ```properties
   game100.release.storeFile=/绝对路径/upload.jks
   game100.release.storePassword=******
   game100.release.keyAlias=upload
   game100.release.keyPassword=******
   ```
2. 命令行 `-Pgame100.release.storeFile=...` 等。
3. 环境变量 `GAME100_RELEASE_STOREFILE`、`GAME100_RELEASE_STOREPASSWORD`、`GAME100_RELEASE_KEYALIAS`、`GAME100_RELEASE_KEYPASSWORD`。

四项缺任何一项，release 包就**不签名**（构建日志会提示），可以之后用 `apksigner`（APK）或 `jarsigner`（AAB）签。

建议：
- **Google Play**：开启 Play App Signing（新应用默认开启）。Google 保管真正的应用签名密钥，你只用一把单独的**上传密钥**签 AAB。上传密钥丢了可以在 Play 后台申请重置。
- **国内商店 / TapTap / 官网**：用户手机上同一个包名只能装同一签名的包。如果希望官网版用户能直接覆盖安装商店版，这几个渠道要用**同一把密钥**（目前官网版用的是仓库里的 `android-release.keystore.b64`）。
- 不要把新的密钥文件提交进仓库。`android/.gitignore` 已忽略 `*.jks` 和 `release.properties`。
- 查看证书 SHA-256（填到 GitHub 仓库变量 `SIGNING_CERT_SHA256`）：
  ```bash
  keytool -list -v -keystore upload.jks -alias upload | grep SHA256
  # 或对已签名的包：apksigner verify --print-certs app-cn-release.apk
  ```

## 5. 交付到 GitHub Release（触发自动上架）

在 GitHub 新建 Release（tag 例如 `v4.6`），把签好名的文件作为附件上传，**文件名必须包含渠道关键字**，流水线靠文件名识别：

| 附件名示例 | 识别为 | 去向 |
|---|---|---|
| `game100-play-4.6.aab` | play AAB | Google Play |
| `game100-taptap-4.6.apk`（play 渠道 APK 改名） | TapTap APK | TapTap |
| `game100-cn-4.6.apk` | cn APK | 华为 / 小米 / OPPO / vivo |
| `game100-direct-4.6.apk`（可选） | direct APK | 只做校验，不上传商店 |

Release 正文就是更新说明（会被转成纯文本，最多 500 字）。想给 Play 单独写英文说明，在正文里加一行 `<!-- en-US -->`，下面写英文。
点 Publish 之后，`.github/workflows/publish-stores.yml` 会自动校验并上传，详见 `docs/PUBLISHING.md`。

## 6. 为什么 play 渠道要这样改（Google Play 政策）

- **设备和网络滥用政策**：通过 Google Play 分发的应用，不得通过 Google Play 以外的方式修改、替换或更新自身（例如下载并安装新 APK）。原来的“App 内检查更新 → 下载 APK → 安装”会被直接拒审或下架。
  政策原文：<https://support.google.com/googleplay/android-developer/answer/9888379>
- **REQUEST_INSTALL_PACKAGES 权限**：只有核心功能是安装其他应用的才能申请，自更新**明确不属于**允许的用途，所以 play 包必须没有这个权限（流水线会检查）。
  <https://support.google.com/googleplay/android-developer/answer/12085295>
- **HTML 游戏从 CDN 下载是允许的**：同一条政策允许下载在 WebView / 浏览器中运行的解释型代码（JavaScript），只要不违反其他政策。所以 play 渠道保留在线游戏库。
- **targetSdk**：从 2026-08-31 起，新应用和更新必须 targetSdk 36（可申请延期到 2026-11-01）。<https://developer.android.com/google/play/requirements/target-sdk>
- **新应用必须用 AAB**，所以 Play 上传的是 `bundlePlayRelease` 的产物。
- **个人开发者账号**：2023-11-13 之后注册的个人账号，正式发布前需要至少 12 名测试者连续封闭测试 14 天。

## 7. 升到 targetSdk 36 后需要注意

- Android 15（API 35）起，target 35+ 的应用**强制全面屏（edge-to-edge）**，内容会画到状态栏和导航栏下面。
  已在 `Game100App.kt` 里统一处理：API 35+ 上给除游戏页以外的每个页面根布局加上系统栏/刘海的 padding；游戏页（`GameActivity`）保持全屏。
  **⚠️ 这一点只在编译层面验证过，没有在真机/模拟器上看过效果**，请在 Android 15/16 真机上检查首页、设置页、科学实验室页的顶部和底部有没有被遮挡。
- 其他 API 36 行为变化（大屏设备上忽略屏幕方向锁定等）对本应用影响不大，但建议在平板上也打开看一眼。

## 8. 已验证 / 未验证

已在 Linux（JDK 17、SDK 36）上实际构建并检查：
- `bundlePlayRelease`、`assemblePlayRelease`、`assembleCnRelease`、`assembleDirectRelease` 和对应 Debug 包都能编译通过。
- 用 aapt2 检查：三个渠道 targetSdk 都是 36；play 无 REQUEST_INSTALL_PACKAGES、无 FileProvider；cn 只有 VIBRATE 权限、内置游戏数等于 `games/` 下的游戏数；direct 保留自升级权限。
- 通过环境变量签名生成的 AAB / APK 可以通过 `jarsigner` / `apksigner` 校验。

未验证：没有在真机或模拟器上运行过（全面屏 padding、cn 离线启动、play 渠道“去商店更新”跳转，都需要真机确认）。

## 附录 A：Muse 当前 VM 的实际打包环境（合并前 main 的打法，另一个 AI 照此可复现）

> 上面 1–8 节是 PR 合并后的目标方案。本附录是 Muse 这台 VM 上**现在实际**打出 v4.3–v4.6 的环境与命令，路径均为本机绝对路径。两个方案的差异：本机用 Gradle 8.7 + SDK 34 + `--offline`；合并后改用仓库 `./gradlew`（8.11.1）+ SDK 36 + 三渠道。

### A.1 工具链（缺一不可）

- **JDK 17.0.11**：`~/jdk17`，构建时 `JAVA_HOME=$HOME/jdk17`
- **Gradle 8.7**：`~/gradle/gradle-8.7/bin/gradle`（合并 PR 后改用仓库自带 `./gradlew`）
- **Android SDK**：`~/android-sdk`（`android/local.properties` 里 `sdk.dir=/home/hatch/android-sdk`）
  - platforms：`android-34`（目录里另有 android-35，是历史伪装包，不要用）
  - build-tools：`34.0.0`（验包用 `~/android-sdk/build-tools/34.0.0/aapt`）
- **⚠️ 本机没有 SDK 36**：PR 合并后（compileSdk/targetSdk 升 36）必须先装 `platforms;android-36` + `build-tools;36.0.0` 才能构建。本机 sdkmanager 走代理隧道会失败，历史做法是手动 curl 下载 SDK 组件压缩包解压到 `~/android-sdk` 对应目录。

### A.2 依赖：离线本地 Maven 仓库

- `~/localrepo`（约 258MB 的 file:// Maven 仓库）；`settings.gradle` 已按该路径是否存在自动挂载。
- 构建**必须带 `--offline`**。不要尝试在线拉 Maven Central / Google 仓库，本机出口对这些源不稳定。

### A.3 本机网络怪癖（不照做必挂，都是踩过的坑）

- 启动 Gradle 前必须：`export JAVA_TOOL_OPTIONS="-Djava.net.preferIPv4Stack=true"`
  - `gradle.properties` 里 `org.gradle.jvmargs` 的同名参数传不到 fork 出的 daemon JVM；本机 IPv6 回环被劫持，不加这个 daemon 通信会报 `Unexpected type tag 109` / `Could not receive a message from the daemon`。
- `gradle.properties` 已设 `kotlin.compiler.execution.strategy=in-process`（Kotlin daemon 走 localhost socket，同样受 IPv6 问题影响），不要删。
- `org.gradle.jvmargs=-Xmx3g`。

### A.4 签名（官网直装版的历史签名，必须续用同一把）

- 密钥库文件：`~/workspace/game100/keystores/release.keystore`
  - 证书 SHA-256：`8445da1196c504b382178192500d39a84093a0a1b35e01f0a67b30021264cfb8`
- 密码以 `android/release.properties` 和 `~/.gradle/gradle.properties` 里的为准（两处一致，实测可开钥匙）。`~/.game100_release_pass` 里是旧值、打不开钥匙，**不要用**。**禁止把密码打印到对话/日志，禁止写进仓库任何文件。**
- `android/release.properties`（已被 .gitignore，必须保留、不要删）四键，`app/build.gradle` 的 `signingConfigs.release` 读它：
  `game100.release.storeFile` / `game100.release.storePassword` / `game100.release.keyAlias` / `game100.release.keyPassword`
- 换签名 = 已装用户无法覆盖升级。任何情况下不要新生成密钥替换它。

### A.5 打包命令（当前 main 单渠道）

```bash
cd ~/workspace/game100/android
export JAVA_TOOL_OPTIONS="-Djava.net.preferIPv4Stack=true"
JAVA_HOME=$HOME/jdk17 ~/gradle/gradle-8.7/bin/gradle assembleRelease --offline
# 产物：app/build/outputs/apk/release/app-release.apk（约 5.4MB，耗时 2–6 分钟）
```

### A.6 版本号

- 当前 main 的打法：直接改 `app/build.gradle` 的 `versionCode` / `versionName` 再构建（合并 PR 后按第 3 节用 `-P` 参数，两套不要混用）。
- 已发布到用户的最新版：**versionCode 23 / versionName 4.6**（出品方 studio 功能；该版源码尚在本地待推 main，仓库 `build.gradle` 默认值仍是 22 / 4.5）。下一次发版 versionCode 从 **24** 起，必须严格递增。

### A.7 声称打包成功前必做的校验

- `aapt dump badging app-release.apk` 确认 versionCode/versionName 是目标值（本机 VM 偶尔重启，会在 outputs 里留下上一次的旧产物，只看 BUILD SUCCESSFUL 会被骗）。
- 确认签名：`apksigner verify --print-certs` 或比对 A.4 的 SHA-256。

### A.8 交付

- 产物拷贝为 `~/workspace/game100/game100-v<版本>-release.apk`，作为聊天附件发给用户。
- 远程下载链接（可选）：`/opt/hatch/bin/remote-storage upload-file --path <apk>`，链接 2 天有效；本机网络不稳时此步可能失败，以附件交付为准。
- 源码改动推回仓库：用 GitHub `push_files`，一批最多 5 个游戏（10 个文件），**推完必须查提交记录核验真的落地**，不能只看工具返回成功。

### A.9 合并 PR #18 后（SDK 36 / 三渠道）在本机打包的增补（2026-10-20 实测打通）

- 构建入口：克隆 main 到持久目录（如 `~/workspace/game100/main-clone/repo`，别用 /tmp，VM 重启会清），`android/local.properties` 写 `sdk.dir=/home/hatch/android-sdk`，`android/release.properties` 从老工程复制。
- Gradle 必须带 `GRADLE_USER_HOME=$HOME/.gradle`：JVM 的 user.home 是 /root，默认读不到 `$HOME/.gradle/gradle.properties` 里的代理配置，在线拉依赖会直接失败。用 `~/gradle/gradle-8.11.1/bin/gradle`（或仓库 `./gradlew`）。
- 出口代理会做 TLS 拦截，CA 是 "Hatch Sandbox Egress CA"；JVM 默认不认。已把 CA 包做成信任库 `~/.gradle/egress-trust.p12`（密码 changeit），并在 `~/.gradle/gradle.properties` 里配了 `systemProp.javax.net.ssl.trustStore*` 三项。注意：代理根证书会轮换（同名不同钥匙），报 `PKIX ... signature check failed` 就是钥匙又换了——从实时证书链抓当前根证书（指纹核对）替换信任库里同名旧证即可，当前根证书备份在 `~/workspace/game100/sdk-dl/hatch-egress-ca.cer`。
- SDK 组件：platforms 要有 android-36；build-tools 要同时有 35.0.0（AGP 8.9.1 默认）和 36.0.0。装法：从 dl.google.com 下 `platform-36_r02.zip`、`build-tools_r35_linux.zip`、`build-tools_r36_linux.zip` 手工解压（sdkmanager 走代理隧道不通）。
- 命令：`gradle assembleDirectRelease -Pgame100.versionCode=<新版> -Pgame100.versionName=<x.y> --max-workers=2`，产物 `app/build/outputs/apk/direct/release/app-direct-release.apk`。2026-10-20 已按此打出 versionCode 24 / 4.7，aapt 验版 + apksigner 验签（指纹与 A.4 一致）通过。
