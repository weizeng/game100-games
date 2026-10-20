# 自动上架流程（publish-stores.yml）

## 1. 流程概览

```
muse 打包并签名 → 在 GitHub 新建 Release，附上 AAB / APK → 点 Publish
        ↓（自动触发 .github/workflows/publish-stores.yml）
  validate：校验包名、versionCode 递增、签名证书、targetSdk ≥ 36、商店包没有 REQUEST_INSTALL_PACKAGES
        ↓ 通过后并行（互不影响）
  Google Play（internal 轨道） | TapTap（只传包） | 华为 / 小米 / OPPO / vivo（默认关闭）
```

- 某个商店没配凭证 → 这个 job 只在摘要里写“⏭️ 已跳过”，**不会失败**，也不影响别的商店。
- 校验不通过 → 所有上传 job 都不会运行。
- 也可以手动运行：Actions → “发布到应用商店” → Run workflow，填 Release tag，可选 Play 轨道和分阶段比例。
- Release 附件命名规则见 `docs/ANDROID-BUILD-FOR-MUSE.md` 第 5 节（文件名里要有 `play` / `taptap` / `cn` / `direct`，AAB 一律当作 Play 包）。
- 更新说明取自 Release 正文（去掉 Markdown，最多 500 字）；正文里 `<!-- en-US -->` 下面的内容作为 Play 的英文说明。

## 2. 需要配置的 Secrets 和 Variables

位置：仓库 **Settings → Secrets and variables → Actions**。Secret 放在 “Secrets” 页，Variable 放在 “Variables” 页。

### 通用（必填）

| 名称 | 类型 | 说明 |
|---|---|---|
| `SIGNING_CERT_SHA256` | Variable | 允许的签名证书 SHA-256（64 位十六进制，冒号可有可无）。多把密钥（例如 Play 上传密钥和国内商店密钥不同）用逗号分隔。**不填则校验失败**。 |
| `EXPECTED_PACKAGE` | Variable（可选） | 默认 `com.game100.center` |
| `MIN_TARGET_SDK` | Variable（可选） | 默认 `36` |

### Google Play

| 名称 | 类型 | 说明 |
|---|---|---|
| `PLAY_SERVICE_ACCOUNT_JSON` | Secret | 服务账号 JSON 密钥的**完整内容**（见第 3 节） |
| `PLAY_TRACK` | Variable（可选） | 默认 `internal`；可选 `alpha` / `beta` / `production` |
| `PLAY_RELEASE_STATUS` | Variable（可选） | 默认 `completed`。**应用还没在 Play 上发布过任何版本时，必须设为 `draft`**，否则 API 会报错；首次发布在后台手动完成后再删掉这个变量。 |

### TapTap

| 名称 | 类型 | 说明 |
|---|---|---|
| `TAPTAP_CLIENT_ID` | Secret | TapTap 开发者中心 → 你的游戏 → 游戏服务 → 应用配置 里的 Client ID |
| `TAPTAP_SERVER_SECRET` | Secret | 同一页面的 Server Secret（不是 Client Token） |
| `TAPTAP_APP_ID` | Variable | 游戏的 App ID（开发者中心地址栏 / 游戏详情页里的数字） |

> TapTap 官方 API 只能上传 APK，**不能提交审核**。上传完成 3–5 分钟后，需要到 开发者中心 → 商店 → 游戏资料 → 商店资料 里选中新 APK 并提交审核。
> 官方文档：<https://developer.taptap.cn/docs/sdk/apk-upload/guide/>

### 国内商店（默认关闭，资质齐全后再开）

国内商店通常要求企业主体、软著，游戏还要版号，2023 年起还要求 APP 备案。脚本已按官方文档写好但**没有用真实账号测试过**，第一次开启前请先用测试应用跑一遍。

| 商店 | 开关变量 | Secrets | Variables | 说明 |
|---|---|---|---|---|
| 华为 | `ENABLE_HUAWEI=true` | `HUAWEI_CLIENT_ID`、`HUAWEI_CLIENT_SECRET` | `HUAWEI_APP_ID`，可选 `HUAWEI_RELEASE_PHASE`（0 全网 / 3 分阶段） | AppGallery Connect → 用户与访问 → API 密钥 → 新建“团队级” Connect API 客户端（角色选“管理员”或“APP 管理员”）。上传后自动提交审核 |
| 小米 | `ENABLE_XIAOMI=true` | `XIAOMI_PRIVATE_KEY`（后台“获取私钥”得到的访问密码）、`XIAOMI_PUBLIC_CERT`（下载的公钥证书 PEM 全文） | `XIAOMI_USERNAME`（开发者站登录邮箱），可选 `XIAOMI_APP_NAME` | 小米接口要求每次同时上传 512×512 图标：请把图标放到 `docs/store-assets/icon-512.png`。小米联运游戏包名要求以 `.mi` 结尾，现在的包名不满足 |
| OPPO | `ENABLE_OPPO=true` | `OPPO_CLIENT_ID`、`OPPO_CLIENT_SECRET` | — | OPPO 开放平台 → 管理中心 → API 服务申请。个人开发者不能发布游戏；沿用线上资料只替换安装包和更新说明 |
| vivo | `ENABLE_VIVO=true` | — | — | vivo 官方 API 只支持普通应用，游戏会返回 A0308，所以这个 job 只在摘要里提醒手动上传 |

## 3. 创建 Google Play 服务账号（一步一步）

> 后台菜单和权限名称会随 Google 改版变化，以页面实际显示为准。

> Google 已不再要求把 Play 管理中心和 Google Cloud 项目“关联”，直接在 Play 里邀请服务账号即可。

1. **准备 Google Cloud 项目**
   打开 <https://console.cloud.google.com/>，左上角选择或新建一个项目（例如 `game100-publish`）。
2. **启用 API**
   打开 <https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com>，确认顶部是刚才的项目，点“启用”（Google Play Android Developer API）。
3. **创建服务账号**
   IAM 和管理 → 服务账号 → “创建服务账号”。名称随便填（如 `play-publisher`），**角色留空直接完成**（不需要任何 Cloud 角色）。
4. **生成 JSON 密钥**
   点进这个服务账号 → “密钥” → 添加密钥 → 创建新密钥 → JSON → 下载。**这个文件就是密钥，不要发给别人，不要提交到仓库。**
   （如果组织策略禁止创建密钥，需要组织管理员放开 `iam.disableServiceAccountKeyCreation`。）
5. **在 Play 管理中心邀请它**
   打开 <https://play.google.com/console/> → 用户和权限 → 邀请新用户，邮箱填服务账号邮箱（形如 `play-publisher@项目ID.iam.gserviceaccount.com`）。
   - “应用权限”里添加“游戏100”；
   - 至少勾选：**发布到测试轨道**、**管理测试轨道并编辑测试人员名单**；要自动发 production 还要勾 **将应用发布到正式版、排除设备以及使用 Play 应用签名**；
   - 点“邀请用户”。权限有时要等几分钟到 24 小时才生效。
6. **首次上传必须手动**
   Play API 不能创建新应用：先在 Play 管理中心创建应用、填完商品详情、内容分级、数据安全、隐私政策网址（见第 4 节），并**手动上传第一个 AAB**（同时完成 Play 应用签名设置）。之后的版本才能由流水线上传。
7. **保存到 GitHub**
   用文本编辑器打开 JSON 文件，**全部内容**复制到仓库 Secret `PLAY_SERVICE_ACCOUNT_JSON`。
8. **测试**
   建一个测试 Release（附 `game100-play-x.y.aab`），看 Actions 里 “Google Play” job 是否把版本上传到内部测试轨道。

> 个人开发者账号（2023-11-13 之后注册）要先做满 “至少 12 名测试者、连续 14 天封闭测试” 才能申请正式发布。

## 4. 隐私政策网页（GitHub Pages）

隐私政策在 `docs/privacy/`（`index.html` 按浏览器语言跳到 `zh.html` / `en.html`）。

1. 先把页面里所有 `【待填写：…】` / `[TO FILL: …]` 换成真实内容（开发者名称、所在国家/地区、联系邮箱、生效日期）。
2. 仓库 Settings → Pages → Build and deployment：Source 选 **Deploy from a branch**，Branch 选 **main**，文件夹选 **/docs**，保存。
3. 一两分钟后访问 <https://weizeng.github.io/game100-games/privacy/>（中文直达：`…/privacy/zh.html`，英文：`…/privacy/en.html`），把这个网址填到 Play 管理中心和各商店的“隐私政策”栏。
4. 注意：选 `/docs` 后，`docs/` 下的其他文件也会公开在这个网址下（仓库本来就是公开的，所以没有额外泄露）。`docs/.nojekyll` 让 GitHub 原样发布文件、不走 Jekyll 渲染。

## 5. 常见失败原因

| 现象 | 处理 |
|---|---|
| 校验：未设置 SIGNING_CERT_SHA256 | 按第 2 节添加 Variable |
| 校验：versionCode 不大于上一个 Release | 打包时 `-Pgame100.versionCode` 要 +1 |
| 校验：商店包含禁止权限 REQUEST_INSTALL_PACKAGES | 把 direct 包错当成 play/cn 包了，检查附件名和打包命令 |
| Play：`Only releases with status draft may be created on draft app` | 应用还没正式发布过，设 `PLAY_RELEASE_STATUS=draft` |
| Play：`The caller does not have permission` | 服务账号在 Play 管理中心的权限没给够或还没生效 |
| Play：`APK specifies a version code that has already been used` | versionCode 用过了，重新打包 |
