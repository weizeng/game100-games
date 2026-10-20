#!/usr/bin/env python3
"""TapTap：用官方「API 上传 APK」接口上传安装包。
文档：https://developer.taptap.cn/docs/sdk/apk-upload/guide/
上传成功后约 3–5 分钟，需在 TapTap 开发者中心「商店 > 游戏资料 > 商店资料」里手动选择该 APK 并提交审核
（官方未提供提审 API）。

环境变量：TAPTAP_CLIENT_ID, TAPTAP_SERVER_SECRET, TAPTAP_APP_ID
用法：taptap_upload.py <apk>
"""
import base64, hashlib, hmac, os, re, secrets, sys, time, urllib.parse
from _http import json_request, request, need_env

HOST = "https://cloud.tapapis.cn"


def sign(method, path_and_query, headers, body, secret):
    hs = "\n".join(f"{k}:{v}" for k, v in sorted((k.lower(), v) for k, v in headers.items()
                                                  if k.lower().startswith("x-tap-") and k.lower() != "x-tap-sign"))
    parts = f"{method}\n{path_and_query}\n{hs}\n{body}\n"
    return base64.b64encode(hmac.new(secret.encode(), parts.encode(), hashlib.sha256).digest()).decode()


def main():
    client_id, secret, app_id = need_env("TAPTAP_CLIENT_ID", "TAPTAP_SERVER_SECRET", "TAPTAP_APP_ID")
    apk = sys.argv[1]
    # 文件名只允许字母、数字、下划线、中横线，且以 .apk 结尾
    fname = re.sub(r"[^A-Za-z0-9_-]", "-", os.path.basename(apk)[:-4]) + ".apk"
    q = urllib.parse.urlencode({"app_id": app_id, "file_name": fname, "client_id": client_id})
    path = f"/apk/v1/upload-params?{q}"
    headers = {"X-Tap-Ts": str(int(time.time())), "X-Tap-Nonce": secrets.token_hex(4)}
    headers["X-Tap-Sign"] = sign("GET", path, headers, "", secret)
    r = json_request("GET", HOST + path, headers)
    if not r.get("success"):
        sys.exit(f"获取上传参数失败: {r}")
    d = r["data"]
    status, body = request(d.get("method", "PUT"), d["url"], d.get("headers") or {}, open(apk, "rb").read())
    print(f"TapTap 上传完成：HTTP {status} {body[:200]!r}")
    print("下一步：3–5 分钟后到 TapTap 开发者中心 > 商店 > 游戏资料 > 商店资料，选择刚上传的 APK 并提交审核。")


if __name__ == "__main__":
    main()
