#!/usr/bin/env python3
"""打包 games/*/ → <id>.zip，并生成 manifest.json。

首页「精选推荐」靠每条游戏的 premium / featured 字段：
  - 按 git 最后改动时间，把最近动过的 N 款标成 premium（最新 featured=1）
  - 只写进 manifest，不改 games/*/meta.json（避免无意义的 meta 噪音）
  - 现有 App（读 premium）下拉刷新即可看到新推荐；带 featured 排序的新版 App 会按最新在前排列

环境变量：
  FEATURED_LIMIT  推荐位数量，默认 12（轮播 take(8)，「更多推荐」看全部精品）
"""
from __future__ import annotations

import datetime
import json
import os
import subprocess
import zipfile

BASE = "https://cdn.jsdelivr.net/gh/weizeng/game100-games@main"
FEATURED_LIMIT = int(os.environ.get("FEATURED_LIMIT", "12"))


def last_touch_unix(gid: str) -> int:
    """该游戏目录最近一次提交的 unix 时间；无历史则 0。"""
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%ct", "--", f"games/{gid}"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        return int(out) if out else 0
    except (subprocess.CalledProcessError, ValueError):
        return 0


def main() -> None:
    for f in os.listdir("."):
        if f.endswith(".zip") and os.path.isfile(f):
            os.remove(f)

    games_meta: list[tuple[str, dict, str]] = []  # gid, meta, zip path
    for gid in sorted(os.listdir("games")):
        gdir = os.path.join("games", gid)
        meta_p = os.path.join(gdir, "meta.json")
        idx_p = os.path.join(gdir, "index.html")
        if not (os.path.isdir(gdir) and os.path.isfile(meta_p) and os.path.isfile(idx_p)):
            continue
        meta = json.load(open(meta_p, encoding="utf-8"))
        zp = f"{gid}.zip"
        with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
            z.write(idx_p, "index.html")
            z.write(meta_p, "meta.json")
        games_meta.append((gid, meta, zp))

    # 最近改动优先；同秒时用 id 稳定排序
    ranked = sorted(
        ((last_touch_unix(gid), gid) for gid, _, _ in games_meta),
        key=lambda t: (-t[0], t[1]),
    )
    featured_rank = {
        gid: i + 1
        for i, (_ts, gid) in enumerate(ranked[: max(0, FEATURED_LIMIT)])
    }

    entries = []
    for gid, meta, zp in games_meta:
        entry = dict(meta)
        entry["id"] = gid
        entry["url"] = f"{BASE}/{zp}"
        entry["size"] = os.path.getsize(zp)
        # 推荐位由本脚本动态决定，忽略 meta 里手写的 premium/featured
        entry.pop("premium", None)
        entry.pop("featured", None)
        if gid in featured_rank:
            entry["premium"] = True
            entry["featured"] = featured_rank[gid]
        entries.append(entry)

    manifest = {
        "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "games": entries,
    }
    json.dump(manifest, open("manifest.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"packed {len(entries)} games; featured={FEATURED_LIMIT} → {list(featured_rank)}")


if __name__ == "__main__":
    main()
