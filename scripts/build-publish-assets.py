#!/usr/bin/env python3
"""打包 games/*/ → <id>.zip，并生成 manifest.json。

首页「精选推荐」靠每条游戏的 premium / featured 字段：
  - 按 git 最后改动时间，把最近动过的 N 款标成 premium（最新 featured=1）
  - 写入 manifest.json，同时写入对应 zip 内的 meta.json（不改仓库 games/*/meta.json）
  - 在线渠道：App 下拉刷新读 manifest 的 premium
  - 离线/cn：打 APK 时 zipBundledGames 用同一套规则写入内置 zip
  - App 4.15+ 按 featured「最新在前」；4.14 只认 premium，轮播按中文名排

环境变量：
  FEATURED_LIMIT  推荐位数量，默认 12（轮播 take(8)，「更多推荐」看全部精品）
"""
from __future__ import annotations

import datetime
import json
import os
import subprocess
import zipfile

BASE = "https://raw.githubusercontent.com/weizeng/game100-games/main"
FEATURED_LIMIT = int(os.environ.get("FEATURED_LIMIT", "12"))


def last_touch_unix(gid: str) -> int:
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%ct", "--", f"games/{gid}"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        return int(out) if out else 0
    except (subprocess.CalledProcessError, ValueError):
        return 0


def pack_zip(meta: dict, idx_p: str, zp: str) -> None:
    meta_bytes = (json.dumps(meta, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(idx_p, "index.html")
        z.writestr("meta.json", meta_bytes)


def main() -> None:
    for f in os.listdir("."):
        if f.endswith(".zip") and os.path.isfile(f):
            os.remove(f)

    games: list[tuple[str, dict, str]] = []
    for gid in sorted(os.listdir("games")):
        gdir = os.path.join("games", gid)
        meta_p = os.path.join(gdir, "meta.json")
        idx_p = os.path.join(gdir, "index.html")
        if not (os.path.isdir(gdir) and os.path.isfile(meta_p) and os.path.isfile(idx_p)):
            continue
        games.append((gid, json.load(open(meta_p, encoding="utf-8")), idx_p))

    ranked = sorted(
        ((last_touch_unix(gid), gid) for gid, _, _ in games),
        key=lambda t: (-t[0], t[1]),
    )
    featured_rank = {
        gid: i + 1
        for i, (_ts, gid) in enumerate(ranked[: max(0, FEATURED_LIMIT)])
    }
    featured_ids = [gid for (_ts, gid) in ranked[: max(0, FEATURED_LIMIT)]]

    entries = []
    for gid, meta, idx_p in games:
        entry = dict(meta)
        entry["id"] = gid
        entry.pop("premium", None)
        entry.pop("featured", None)
        if gid in featured_rank:
            entry["premium"] = True
            entry["featured"] = featured_rank[gid]

        zp = f"{gid}.zip"
        pack_zip(entry, idx_p, zp)
        entry["url"] = f"{BASE}/{zp}"
        entry["size"] = os.path.getsize(zp)
        entries.append(entry)

    manifest = {
        "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "featured": featured_ids,
        "games": entries,
    }
    json.dump(manifest, open("manifest.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"packed {len(entries)} games; featured={FEATURED_LIMIT} → {featured_ids}")


if __name__ == "__main__":
    main()
