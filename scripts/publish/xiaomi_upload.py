#!/usr/bin/env python3
"""小米应用商店「应用自动发布接口」：更新 APK（synchroType=1）。
⚠️ 按官方文档编写，尚未用真实账号实测。文档：https://dev.mi.com/xiaomihyperos/documentation/detail?pId=1134
注意：小米联运游戏要求包名以 .mi 结尾；本脚本只负责传包，资质需事先在后台完成。

环境变量：XIAOMI_USERNAME（开发者站登录邮箱）, XIAOMI_PRIVATE_KEY（后台“获取私钥”得到的访问密码）,
          XIAOMI_PUBLIC_CERT（后台下载的公钥证书 PEM 全文）, XIAOMI_APP_NAME
可选：RELEASE_NOTES_FILE；XIAOMI_ICON（512x512 PNG 路径，默认 docs/store-assets/icon-512.png）
用法：xiaomi_upload.py <apk>
依赖：pip install cryptography
"""
import hashlib, json, os, sys
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from _http import request, multipart, need_env

API = "https://api.developer.xiaomi.com/devupload/dev/push"


def md5_bytes(b):
    return hashlib.md5(b).hexdigest()


def rsa_encrypt_hex(pem, text):
    pem = pem.strip()
    if "BEGIN CERTIFICATE" in pem:
        pub = x509.load_pem_x509_certificate(pem.encode()).public_key()
    else:
        pub = serialization.load_pem_public_key(pem.encode())
    raw = text.encode("utf-8")
    block = pub.key_size // 8 - 11  # RSA/NONE/PKCS1Padding 分段加密
    out = b"".join(pub.encrypt(raw[i:i + block], padding.PKCS1v15()) for i in range(0, len(raw), block))
    return out.hex()


def main():
    user, password, cert, app_name = need_env("XIAOMI_USERNAME", "XIAOMI_PRIVATE_KEY", "XIAOMI_PUBLIC_CERT",
                                              "XIAOMI_APP_NAME")
    apk = sys.argv[1]
    icon = os.environ.get("XIAOMI_ICON") or "docs/store-assets/icon-512.png"
    if not os.path.exists(icon):
        sys.exit(f"小米接口必须同时上传图标，找不到 {icon}")
    notes = ""
    nf = os.environ.get("RELEASE_NOTES_FILE")
    if nf and os.path.exists(nf):
        notes = open(nf, encoding="utf-8").read()[:500]
    request_data = json.dumps({
        "userName": user,
        "synchroType": 1,
        "appInfo": {"appName": app_name, "packageName": os.environ.get("EXPECTED_PACKAGE", "com.game100.center"),
                    "updateDesc": notes or "问题修复与体验优化"},
    }, ensure_ascii=False)
    sig_json = json.dumps({
        "sig": [
            {"name": "RequestData", "hash": md5_bytes(request_data.encode("utf-8"))},
            {"name": "apk", "hash": md5_bytes(open(apk, "rb").read())},
            {"name": "icon", "hash": md5_bytes(open(icon, "rb").read())},
        ],
        "password": password,
    })
    body, ctype = multipart({"RequestData": request_data, "SIG": rsa_encrypt_hex(cert, sig_json)},
                            {"apk": apk, "icon": icon})
    status, resp = request("POST", API, {"Content-Type": ctype}, body)
    r = json.loads(resp.decode() or "{}")
    print(f"小米返回 HTTP {status}: {r}")
    if r.get("result") != 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
