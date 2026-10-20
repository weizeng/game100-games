#!/usr/bin/env python3
"""发版前校验 GitHub Release 附件。规则见 docs/PUBLISHING.md。

产物命名约定（大小写不敏感）:
  *.aab                 -> Google Play（只能有 1 个）
  *cn*.apk              -> 国内商店（华为/小米/OPPO/vivo）
  *taptap*.apk          -> TapTap（没有时用 *play*.apk）
  *play*.apk            -> TapTap 备选
  *direct*.apk          -> 直装渠道，只校验不分发
"""
import argparse, glob, json, os, re, sys
from inspect_artifact import inspect, norm_sha

FORBIDDEN_STORE_PERMS = {"android.permission.REQUEST_INSTALL_PACKAGES"}


def classify(name):
    n = name.lower()
    if n.endswith(".aab"):
        return "play_aab"
    if not n.endswith(".apk"):
        return None
    if "taptap" in n:
        return "taptap_apk"
    if re.search(r"(^|[-_.])cn([-_.]|$)", n):
        return "cn_apk"
    if "play" in n:
        return "play_apk"
    if "direct" in n:
        return "direct_apk"
    return "unknown_apk"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dist", required=True, help="本次 Release 附件目录")
    ap.add_argument("--prev", help="上一个 Release 附件目录（可为空目录）")
    ap.add_argument("--bundletool", required=True)
    ap.add_argument("--package", default="com.game100.center")
    ap.add_argument("--certs", default="", help="允许的签名证书 SHA-256，逗号/空格分隔")
    ap.add_argument("--min-target-sdk", type=int, default=36)
    ap.add_argument("--summary", help="写入 Markdown 摘要的文件")
    a = ap.parse_args()

    errors, warns, rows = [], [], []
    allowed = {norm_sha(c) for c in re.split(r"[,\s]+", a.certs) if c.strip()}
    if not allowed:
        errors.append("仓库变量 SIGNING_CERT_SHA256 未设置：无法确认签名证书（见 docs/PUBLISHING.md）")

    files = sorted(glob.glob(os.path.join(a.dist, "*.aab")) + glob.glob(os.path.join(a.dist, "*.apk")))
    if not files:
        errors.append("Release 没有附带任何 .aab / .apk")
    by_role = {}
    infos = []
    for f in files:
        role = classify(os.path.basename(f))
        info = inspect(f, a.bundletool)
        info["role"] = role
        infos.append(info)
        by_role.setdefault(role, []).append(f)
        name = info["file"]
        if info["package"] != a.package:
            errors.append(f"{name}: 包名 {info['package']} ≠ 期望 {a.package}")
        if info["targetSdk"] < a.min_target_sdk:
            errors.append(f"{name}: targetSdk {info['targetSdk']} < {a.min_target_sdk}（Google Play 2026-08-31 起要求 36）")
        if not info["certSha256"]:
            errors.append(f"{name}: 未签名或读不到签名证书")
        elif allowed and not (set(info["certSha256"]) & allowed):
            errors.append(f"{name}: 签名证书 {info['certSha256']} 不在 SIGNING_CERT_SHA256 允许列表中")
        if role in ("play_aab", "play_apk", "taptap_apk", "cn_apk"):
            bad = FORBIDDEN_STORE_PERMS & set(info["permissions"])
            if bad:
                errors.append(f"{name}: 商店包含禁止权限 {sorted(bad)}（应用商店渠道不得自更新）")
        if role == "cn_apk" and "android.permission.INTERNET" in info["permissions"]:
            warns.append(f"{name}: cn 包仍声明 INTERNET 权限（cn 渠道应为完全离线单机版）")
        if role == "unknown_apk":
            warns.append(f"{name}: 文件名无法识别渠道（应含 cn / taptap / play / direct），不会被分发")
        rows.append(info)

    if len(by_role.get("play_aab", [])) > 1:
        errors.append("只能附带 1 个 .aab")
    for r in ("cn_apk", "taptap_apk", "play_apk"):
        if len(by_role.get(r, [])) > 1:
            errors.append(f"{r} 类 APK 只能有 1 个: {by_role[r]}")

    codes = {i["versionCode"] for i in infos}
    if len(codes) > 1:
        errors.append(f"各渠道 versionCode 不一致: {sorted(codes)}（规则：同一次发版所有渠道共用一个 versionCode）")
    version_code = max(codes) if codes else 0
    version_name = next((i["versionName"] for i in infos), "")

    prev_code = 0
    if a.prev and os.path.isdir(a.prev):
        for f in glob.glob(os.path.join(a.prev, "*.aab")) + glob.glob(os.path.join(a.prev, "*.apk")):
            try:
                prev_code = max(prev_code, inspect(f, a.bundletool)["versionCode"])
            except Exception as e:  # noqa
                warns.append(f"读取上一版附件 {os.path.basename(f)} 失败: {e}")
    if prev_code and version_code <= prev_code:
        errors.append(f"versionCode {version_code} 必须大于上一个 Release 的 {prev_code}")
    if not prev_code:
        warns.append("没有找到上一个 Release 的安装包，跳过 versionCode 递增检查")

    tap = (by_role.get("taptap_apk") or by_role.get("play_apk") or [""])[0]
    out = {
        "version_code": str(version_code),
        "version_name": version_name,
        "play_aab": os.path.basename((by_role.get("play_aab") or [""])[0]),
        "cn_apk": os.path.basename((by_role.get("cn_apk") or [""])[0]),
        "taptap_apk": os.path.basename(tap),
    }

    lines = ["## 发版校验", "", f"versionCode **{version_code}** / versionName **{version_name}**"
             + (f"（上一版 {prev_code}）" if prev_code else ""), "",
             "| 文件 | 渠道 | 包名 | versionCode | targetSdk | 证书 SHA-256 |", "|---|---|---|---|---|---|"]
    for i in rows:
        lines.append(f"| {i['file']} | {i['role']} | {i['package']} | {i['versionCode']} | {i['targetSdk']} | "
                     f"{(i['certSha256'] or ['-'])[0][:16]}… |")
    lines += [""] + [f"- ❌ {e}" for e in errors] + [f"- ⚠️ {w}" for w in warns]
    if not errors:
        lines.append("- ✅ 全部校验通过")
    text = "\n".join(lines) + "\n"
    print(text)
    if a.summary:
        with open(a.summary, "a", encoding="utf-8") as fh:
            fh.write(text)
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a", encoding="utf-8") as fh:
            for k, v in out.items():
                fh.write(f"{k}={v}\n")
    print(json.dumps(out, ensure_ascii=False))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
