#!/usr/bin/env python3
"""华为 AppGallery Connect Publishing API：上传 APK/AAB 并提交审核。
⚠️ 按官方文档编写，尚未用真实账号实测；首次启用前请先在测试应用上跑一次。
文档：
  获取 token   https://developer.huawei.com/consumer/cn/doc/agcapi-publish_api_overview
  上传地址     https://developer.huawei.com/consumer/en/doc/AppGallery-connect-References/agcapi-upload-url-new-0000001111685200
  上传文件     https://developer.huawei.com/consumer/en/doc/AppGallery-connect-References/agcapi-upload-file-new-0000001111845090
环境变量：HUAWEI_CLIENT_ID, HUAWEI_CLIENT_SECRET, HUAWEI_APP_ID
可选：HUAWEI_RELEASE_PHASE（0=全网，3=分阶段，默认 0）, RELEASE_NOTES_FILE
用法：huawei_upload.py <apk|aab>
"""
import hashlib, json, os, sys, time, urllib.parse
from _http import json_request, request, need_env

API = "https://connect-api.cloud.huawei.com/api"


def main():
    cid, csecret, app_id = need_env("HUAWEI_CLIENT_ID", "HUAWEI_CLIENT_SECRET", "HUAWEI_APP_ID")
    path = sys.argv[1]
    tok = json_request("POST", f"{API}/oauth2/v1/token",
                       payload={"grant_type": "client_credentials", "client_id": cid, "client_secret": csecret})
    token = tok.get("access_token") or sys.exit(f"获取 token 失败: {tok}")
    auth = {"client_id": cid, "Authorization": f"Bearer {token}"}

    data = open(path, "rb").read()
    fname = "release" + os.path.splitext(path)[1]
    q = urllib.parse.urlencode({"appId": app_id, "fileName": fname, "contentLength": len(data),
                                "sha256": hashlib.sha256(data).hexdigest(), "releaseType": 1})
    r = json_request("GET", f"{API}/publish/v2/upload-url/for-obs?{q}", auth)
    if r.get("ret", {}).get("code") != 0:
        sys.exit(f"获取上传地址失败: {r}")
    u = r["urlInfo"]
    status, _ = request(u.get("method", "PUT"), u["url"], u.get("headers") or {}, data)
    print(f"文件已上传 HTTP {status}")

    r = json_request("PUT", f"{API}/publish/v2/app-file-info?appId={app_id}", auth,
                     payload={"fileType": 5, "files": [{"fileName": fname, "fileDestUrl": u["objectId"]}]})
    if r.get("ret", {}).get("code") != 0:
        sys.exit(f"更新应用文件信息失败: {r}")
    print("应用文件信息已更新，等待华为解析软件包…")

    notes_file = os.environ.get("RELEASE_NOTES_FILE")
    if notes_file and os.path.exists(notes_file):
        notes = open(notes_file, encoding="utf-8").read()[:500]
        r = json_request("PUT", f"{API}/publish/v2/app-language-info?appId={app_id}", auth,
                         payload={"lang": "zh-CN", "newFeatures": notes})
        print(f"更新新版本特性: {r.get('ret')}")

    phase = int(os.environ.get("HUAWEI_RELEASE_PHASE", "0") or 0)
    body = {"releaseType": 1, "releasePhase": phase}
    if phase == 3:
        body["phasedReleaseDescription"] = "分阶段发布"
    # 官方说明：软件包异步解析，传包后约 2 分钟再提交；仍在解析时会返回 204144660，重试即可
    for attempt in range(10):
        time.sleep(120 if attempt == 0 else 60)
        r = json_request("POST", f"{API}/publish/v2/app-submit?appId={app_id}", auth, payload=body)
        code = r.get("ret", {}).get("code")
        if code == 0:
            print("已提交华为审核")
            return
        print(f"提交返回 {r.get('ret')}，稍后重试")
    sys.exit("多次提交仍失败，请到 AppGallery Connect 查看")


if __name__ == "__main__":
    main()
