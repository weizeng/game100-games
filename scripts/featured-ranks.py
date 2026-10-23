#!/usr/bin/env python3
"""输出 {gameId: featuredRank} JSON。供 build-publish-assets / zipBundledGames 共用。"""
from __future__ import annotations

import json
import os
import subprocess
import sys

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


def ranks(games_dir: str = "games", limit: int = FEATURED_LIMIT) -> dict[str, int]:
    gids = []
    for gid in sorted(os.listdir(games_dir)):
        gdir = os.path.join(games_dir, gid)
        if os.path.isdir(gdir) and os.path.isfile(os.path.join(gdir, "meta.json")) and os.path.isfile(
            os.path.join(gdir, "index.html")
        ):
            gids.append(gid)
    ranked = sorted(((last_touch_unix(gid), gid) for gid in gids), key=lambda t: (-t[0], t[1]))
    return {gid: i + 1 for i, (_ts, gid) in enumerate(ranked[: max(0, limit)])}


if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    os.chdir(root)
    json.dump(ranks(), sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
