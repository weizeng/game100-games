# 游戏100 App 外壳 · 皮肤 B「霓虹糖果 Pop Arcade」改版方案（2026-10-20）

> 状态：**提案**，在本地分支 `design/app-skin-b` 上，未合并、未推送。已经 rebase 到 4.10（`3eaffe1c`），没有冲突；在 4.10 上编译通过，4.10 的 13 个单元测试也全部通过。

## 1. 设计目标

游戏里已经全量换上皮肤 B，App 外壳要和它统一：

- **底色**：深紫街机夜色，`#2B0F63 → #12052E` 竖向渐变，左上角粉色光晕，右上角青色光晕。
- **三色高光**：
  - 金币黄 `#FFCF33`：主操作，开始游戏、选中分类、保存；
  - 糖果粉 `#FF3D9A`：更新、重试、收藏、标题阴影；
  - 薄荷青 `#2EE6D6`：下载、进度、链接。
- **立体感**：所有按钮、卡片、图标底下都有一层实色「台阶」阴影（layer-list 的底层），按下时面下沉。和游戏内皮肤 B 是同一套手法。
- **游戏图标**：每款游戏用自己的主色。先把颜色推得更饱和，再做径向高光、3dp 白描边、顶部光泽和台阶阴影，像一颗糖。
- **文字对比度**：
  - 按钮文字都是深色墨水色（金币上是 `#5A2A00`，青色上是 `#03342F`，粉色上是 `#4A0623`），对比度 ≥ 4.5:1；
  - 正文 `#FFF5FC` 和次要文字 `#CDB9EA` 放在深紫底上，对比度都 > 7:1。

## 2. Logo 三选一

| 方案 | 说明 | 文件 |
|---|---|---|
| A 金币 100 | 街机投币的金币，正面压印“100”，背景是放射光。48px 下最好认 | `docs/app-design/logos/coin/` |
| B 糖果手柄 | 粉色果冻手柄配四颗糖豆按键，顶上一枚“100”金币牌。一看就是游戏 | `docs/app-design/logos/pad/` |
| C 霓虹「游」方块 | 粉色果冻方块上压白色“游”字，底部是“100”铭牌，背景是霓虹网格地平线。中文辨识度最高 | `docs/app-design/logos/block/`（分支里目前用的这个） |

- 全部是手写矢量，不是 AI 生成的图片。数字和汉字用开源字体（Titan One、Noto Sans CJK，均为 OFL 授权）转成路径，不依赖手机上装的字体。
- 每个方案都有：
  - `ic_launcher_background.xml`：背景层；
  - `ic_launcher_foreground.xml`：前景层，主体在 66dp 安全区内；
  - `ic_launcher_monochrome.xml`：单色层，给 Android 13 主题图标用；
  - 对应的 SVG，以及 512px 的 PNG（应用商店图标）。
- **换方案的步骤**：
  1. 把对应目录里的 3 个 xml 复制到 `android/app/src/main/res/drawable/`；
  2. 在 `docs/app-design/tools/` 下依次运行 `python3 wordmark.py`、`python3 android_extra.py ../../../android/app/src/main/res/drawable <coin|pad|block>`，重新生成标题栏小图标 `logo_tile.xml`。

## 3. 分支里改了哪些文件

只改界面资源和少量界面代码，**没有动下载、更新、存储和渠道的逻辑**。

| 文件 | 改动 |
|---|---|
| `res/values/colors.xml` | 旧颜色名保留，改指向新配色；新增 coin / pink / cyan / glass / ledge 等颜色 |
| `res/values/themes.xml` | 改成深色主题，状态栏用浅色图标；对话框主题；立体按钮样式 `Button3D`（Primary 金币 / Secondary 玻璃 / Danger 红） |
| `res/values-v31/themes.xml`（新） | Android 12+ 系统启动页：深紫底 + 前景图标 |
| `res/mipmap-anydpi-v26/ic_launcher*.xml`（新） | 自适应图标，含 monochrome 层；minSdk 26，不需要 PNG 兜底 |
| `res/drawable/ic_launcher_{background,foreground,monochrome}.xml`（新） | 方案 C 的三层 |
| `res/drawable/logo_tile.xml`、`wordmark.xml`（新） | 首页标题栏、设置页用的小图标，以及「游戏100」字标 |
| `res/drawable/btn_{coin,pink,cyan,glass,danger}.xml`（新） | 立体按钮，带按下和禁用状态 |
| `res/drawable/pill_*.xml`、`surface_panel.xml`、`search_bg.xml`、`science_*`、`game_icon_bg.xml` | 改成皮肤 B：玻璃面板 + 台阶阴影，搜索框做成内凹槽 |
| `res/drawable/bg_app.xml`、`dialog_bg.xml`、`progress_candy.xml`、`hero_rays.xml`、`feat_emblem.xml`（新） | 页面底色、对话框、糖果进度条、详情页放射光、精选卡徽章 |
| `res/layout/activity_main.xml` | 标题栏换成 logo + 字标；搜索提示改为「搜索游戏或出品方」；实验室入口按钮化；列表区内边距 |
| `res/layout/item_game_row.xml` | 横向列表行改成 3 列网格卡片，**id 不变**，适配器逻辑不变 |
| `res/layout/item_featured.xml` | 精选卡：糖果渐变 + 白描边 + 白色光泽徽章 |
| `res/layout/activity_game_detail.xml` | 游戏主色大头图 + 放射光 + 132dp 糖果图标；名称、分类、出品方居中；62dp 金币按钮。**id 全保留**，新增 `detail_hero` |
| `res/layout/activity_settings.xml`、`activity_science_lab.xml`、`dialog_download.xml` | 换底色；「关于」面板加 logo；进度条加粗为 22dp 糖果条 |
| `ui/GameAdapter.kt` | `tileBackground()` 做成糖果图标，可传尺寸；新增 `featuredBackground()`、`heroBackground()`；颜色饱和化 `candy()` |
| `ui/GameRowAdapter.kt` | 网格卡片只显示一个状态；操作按钮分三种：开玩（金币）/ 下载（青）/ 更新（粉） |
| `ui/ArcadeBackdropView.kt` | 精选卡动效从轨道光点改成缓慢旋转的糖果放射光，并保留原有省电逻辑：不可见时停止 |
| `MainActivity.kt`（3 处） | 列表改为 `GridLayoutManager`（3 列，宽度不足 340dp 时 2 列）；分类胶囊加 emoji、改金币/玻璃底；下拉刷新改三色 |
| `GameDetailActivity.kt` | 设置头图和大图标；开始游戏用金币按钮，下载游戏用青色按钮；出品方标签末尾加「›」 |
| `AndroidManifest.xml` | 图标改为 `@mipmap/ic_launcher`，并加 `roundIcon` |
| 删除 `res/drawable/ic_launcher.xml` | 旧图标已没有引用 |

**验证情况**：

- `assembleDirectDebug` 编译通过（JDK 21 + SDK 36），在 4.9 和 4.10 上都通过；`assemblePlayDebug` 在 4.9 上通过。
- 4.10 的 `testDirectDebugUnitTest` 13 项通过（GameDownloaderTest 12 项、BundledGamesTest 1 项）。
- `scripts/check-android-ui.cjs` 通过：49 个 XML 资源，310 处引用。
- 用 Paparazzi（layoutlib）把首页、详情、设置、下载进度真实渲染出来，前后对比见 `app-compare.png`。渲染工程是独立副本，没有加进仓库。
- 这台机器的模拟器起不来（虚拟机没有嵌套虚拟化），所以**还没有真机或模拟器验证**。

## 4. 第二期（需等 4.10 合并后再做，会改下载代码）

HTML 预览里已经画出来，但分支里还没实现：

1. **卡片内下载进度环**：首页卡片直接显示「下载中 42%」。需要 `GameRowAdapter` 拿到下载进度，会改 `MainActivity.downloadGame`。
2. **详情页按钮内进度**：按钮本身变成进度条，旁边有「✕ 取消」；失败时显示红色提示卡和「↻ 重试下载」。4.10 已经在下载弹窗里加了失败重试，第二期把它挪到详情页按钮内，需要把下载从「返回首页再触发」改成在详情页内下载。
3. **下载弹层**：改成底部弹层；游戏源离线时，顶部浮一条带「重试」按钮的提示。
4. **更多同出品方游戏**：详情页加一行横向列表，复用现有的出品方搜索。
5. **品牌启动页**：Android 12 以下，或想要字标和进度条的版本，可以加一个轻量的 `SplashActivity`。可选，会多 300–500ms。

## 5. 工作量

| 项 | 估计 |
|---|---|
| 第一期（分支里已完成）：配色、主题、图标、按钮、网格、详情头图、设置、启动页 | 已完成约 1 人日 |
| 第一期真机验证和调整：深色主题下的对话框和 Toast、各品牌 emoji、小屏 320dp、主题图标 | 0.5–1 人日 |
| 合并 4.10 时解决冲突 | 0.5 人日 |
| 第二期：进度环、按钮内进度、失败重试、底部弹层、同出品方 | 1.5–2 人日 |
| 应用商店素材：512 图标（已出），推荐图和截图需要重做 | 0.5 人日 |

## 6. 风险

1. **与 4.10 及以后版本冲突**：已经 rebase 到 4.10，没有冲突。本分支在 `MainActivity.kt` 只改了 3 处（网格、分类胶囊、下拉刷新颜色），在 `dialog_download.xml` 只改了样式，4.10 新加的 `dl_status` 也保留了。以后如果再有人改这几个文件，要注意合并。
2. **整体改成深色**：所有 AlertDialog 已经套用深紫对话框主题，Toast 和系统选择器跟随系统。游戏页 WebView 本来就是黑底，不受影响。
3. **MaterialButton 自定义背景**：必须 `backgroundTint=@null`，已写进样式。以后新加按钮要用 `Widget.Game100.*` 样式，否则会被染成主题色。
4. **图标里用 emoji**：不同厂商的 emoji 字形不同，个别符号（⬇ ⬆）在部分系统上会显示成彩色 emoji。真机看过后可以换成矢量小图标。
5. **网格替换列表**：卡片较窄，名称只显示一行，超长会截断。宽度不足 340dp 时自动改为 2 列。评分星星在网格里只用小字显示。
6. **性能**：每次绑定都新建 LayerDrawable，220 款也不多；需要的话可以按颜色缓存。放射光动画沿用原有规则：滚出屏幕、失去焦点、关闭动画时都会停。
7. **图标缓存**：桌面图标要重新安装或重启启动器才会更新。单色主题图标只在 Android 13+ 生效。
8. **商店图标**：Google Play 和国内商店后台要另外上传 512 PNG，在 `docs/app-design/logos/<方案>/icon-512.png`。

## 7. 预览

- 交互预览：`docs/app-design/preview.html`，顶部可以切换三个 logo。包含：
  - 启动页、首页、详情（已下载 / 下载中 / 失败 / 有更新）；
  - 下载弹层、设置；
  - 状态组件合集。
- 原生渲染对比：首页、详情、设置、下载进度，现在 vs 新设计，见交付目录的 `app-compare.png`。
