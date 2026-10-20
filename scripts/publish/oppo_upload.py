#!/usr/bin/env python3
"""OPPO 开放平台 API 传包：上传 APK 并以现有商店资料提交新版本。
⚠️ 按文档编写，尚未实测。官方文档：https://open.oppomobile.com/new/developmentDoc/info?id=10998
注意：OPPO 规定个人开发者不能上传「Android 应用游戏」，游戏版本接口必须带版号等资质字段。
本脚本先查询线上资料（/resource/v1/app/info），沿用其中字段，只替换 apk_url / version_code / update_desc。

环境变量：OPPO_CLIENT_ID, OPPO_CLIENT_SECRET
可选：RELEASE_NOTES_FILE, EXPECTED_PACKAGE
用法：oppo_upload.py <apk>
"""
import hashlib, hmac, json, os, sys, time, urllib.parse
from _http import json_request, request, multipart, need_env

API = "https://oop-openapi-cn.heytapmobi.com"


def signed(params, secret, token):
    p = {k: v for k, v in dict(params, access_token=token, timestamp=str(int(time.time()))).items() if v is not None}
    s = "&".join(f"{k}={p[k]}" for k in sorted(p))
    p["api_sign"] = hmac.new(secret.encode(), s.encode(), hashlib.sha256).hexdigest()
    return p


def ok(r, what):
    if r.get("errno") != 0:
        sys.exit(f"{what}失败: {r}")
    return r.get("data")


def main():
    cid, secret = need_env("OPPO_CLIENT_ID", "OPPO_CLIENT_SECRET")
    apk = sys.argv[1]
    pkg = os.environ.get("EXPECTED_PACKAGE", "com.game100.center")
    q = urllib.parse.urlencode({"client_id": cid, "client_secret": secret})
    token = ok(json_request("GET", f"{API}/developer/v1/token?{q}"), "获取 token")["access_token"]

    info = ok(json_request("GET", f"{API}/resource/v1/app/info?" +
                           urllib.parse.urlencode(signed({"pkg_name": pkg}, secret, token))), "查询应用资料")
    up = ok(json_request("GET", f"{API}/resource/v1/upload/get-upload-url?" +
                         urllib.parse.urlencode(signed({}, secret, token))), "获取上传地址")
    body, ctype = multipart({"type": "apk", "sign": up["sign"]}, {"file": apk})
    _, resp = request("POST", up["upload_url"], {"Content-Type": ctype}, body)
    f = ok(json.loads(resp.decode()), "上传 APK")

    notes = "问题修复与体验优化"
    nf = os.environ.get("RELEASE_NOTES_FILE")
    if nf and os.path.exists(nf):
        notes = open(nf, encoding="utf-8").read()[:500] or notes
    version_code = os.environ.get("VERSION_CODE", "")
    # 沿用线上资料里的字段（字段名以 OPPO 文档为准，非字符串字段需转 JSON）
    params = {}
    for k, v in (info or {}).items():
        if v is None or k in ("apk_url", "version_code", "update_desc"):
            continue
        params[k] = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
    params.update({
        "pkg_name": pkg,
        "version_code": version_code,
        "apk_url": json.dumps([{"url": f["url"], "md5": f["md5"], "cpu_code": 0}]),
        "update_desc": notes,
        "online_type": "1",
    })
    r = json_request("POST", f"{API}/resource/v1/app/upd", form=signed(params, secret, token))
    ok(r, "提交新版本")
    print(f"OPPO 已受理（异步任务）：{r}")


if __name__ == "__main__":
    main()
