#!/usr/bin/env python3
"""把 GitHub Release 正文转成各商店的更新说明。

- 去掉 Markdown 标记、HTML 注释；
- 写出 Google Play 用的 whatsnew/whatsnew-<locale>（每种语言最多 500 字符）；
- 写出 notes.txt（国内商店/TapTap 用，最多 500 字符）。
正文里可以用 "<!-- en-US -->" 单独一行分隔出英文说明，分隔线之前视为中文。
"""
import os, re, sys

LIMIT = 500


def clean(t):
    t = re.sub(r"<!--(?!\s*en-US\s*-->).*?-->", "", t, flags=re.S)
    t = re.sub(r"^#+\s*", "", t, flags=re.M)
    t = re.sub(r"\*\*|__|`", "", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    t = re.sub(r"^\s*[-*]\s+", "• ", t, flags=re.M)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def cut(t):
    return t if len(t) <= LIMIT else t[: LIMIT - 1] + "…"


def main():
    body = os.environ.get("RELEASE_BODY", "")
    outdir = sys.argv[1] if len(sys.argv) > 1 else "release-notes"
    parts = re.split(r"^\s*<!--\s*en-US\s*-->\s*$", body, maxsplit=1, flags=re.M)
    zh = cut(clean(parts[0])) or "问题修复与体验优化。"
    en = cut(clean(parts[1])) if len(parts) > 1 else ""
    os.makedirs(os.path.join(outdir, "whatsnew"), exist_ok=True)
    open(os.path.join(outdir, "whatsnew", "whatsnew-zh-CN"), "w", encoding="utf-8").write(zh)
    if en:
        open(os.path.join(outdir, "whatsnew", "whatsnew-en-US"), "w", encoding="utf-8").write(en)
    open(os.path.join(outdir, "notes.txt"), "w", encoding="utf-8").write(zh)
    print(zh)


if __name__ == "__main__":
    main()
