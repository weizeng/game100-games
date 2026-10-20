#!/usr/bin/env python3
"""读取 APK / AAB 的包名、versionCode、targetSdk、权限、签名证书 SHA-256。

用法: inspect_artifact.py <file> [--bundletool path/to/bundletool.jar]
依赖: Android build-tools 中的 aapt2 / apksigner（APK），JDK 的 keytool + bundletool（AAB）。
输出: 一行 JSON。
"""
import argparse, glob, json, os, re, shutil, subprocess, sys
import xml.etree.ElementTree as ET

ANDROID_NS = "{http://schemas.android.com/apk/res/android}"


def build_tool(name):
    found = shutil.which(name)
    if found:
        return found
    home = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT") or ""
    cands = sorted(glob.glob(os.path.join(home, "build-tools", "*", name)),
                   key=lambda p: [int(x) if x.isdigit() else x for x in re.split(r"[.\-]", p.split(os.sep)[-2])])
    if not cands:
        sys.exit(f"找不到 {name}：请安装 Android build-tools 或设置 ANDROID_HOME")
    return cands[-1]


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def norm_sha(s):
    return re.sub(r"[^0-9a-f]", "", s.lower())


def inspect_apk(path):
    out = run([build_tool("aapt2"), "dump", "badging", path])
    m = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'", out)
    t = re.search(r"targetSdkVersion:'(\d+)'", out)
    perms = re.findall(r"uses-permission: name='([^']+)'", out)
    try:
        certs_out = run([build_tool("apksigner"), "verify", "--print-certs", path])
    except subprocess.CalledProcessError:
        certs_out = ""  # 未签名或签名无效
    certs = [norm_sha(c) for c in re.findall(r"certificate SHA-256 digest: ([0-9a-fA-F:]+)", certs_out)]
    return dict(kind="apk", package=m.group(1), versionCode=int(m.group(2)), versionName=m.group(3),
                targetSdk=int(t.group(1)) if t else 0, permissions=sorted(set(perms)), certSha256=certs)


def inspect_aab(path, bundletool):
    xml = run(["java", "-jar", bundletool, "dump", "manifest", "--bundle", path])
    root = ET.fromstring(xml)
    sdk = root.find("uses-sdk")
    perms = [e.get(ANDROID_NS + "name") for e in root.findall("uses-permission")]
    perms += [e.get(ANDROID_NS + "name") for e in root.findall("uses-permission-sdk-23")]
    target = int(sdk.get(ANDROID_NS + "targetSdkVersion", "0")) if sdk is not None else 0
    try:
        kt = run(["keytool", "-printcert", "-jarfile", path])
    except subprocess.CalledProcessError:
        kt = ""
    certs = [norm_sha(c) for c in re.findall(r"SHA256:\s*([0-9A-Fa-f:]+)", kt)]
    return dict(kind="aab", package=root.get("package"),
                versionCode=int(root.get(ANDROID_NS + "versionCode", "0")),
                versionName=root.get(ANDROID_NS + "versionName", ""),
                targetSdk=target, permissions=sorted(set(p for p in perms if p)), certSha256=certs)


def inspect(path, bundletool=None):
    if path.endswith(".aab"):
        if not bundletool:
            sys.exit("检查 AAB 需要 --bundletool")
        info = inspect_aab(path, bundletool)
    elif path.endswith(".apk"):
        info = inspect_apk(path)
    else:
        sys.exit(f"不支持的文件类型: {path}")
    info["file"] = os.path.basename(path)
    return info


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--bundletool")
    a = ap.parse_args()
    print(json.dumps(inspect(a.file, a.bundletool), ensure_ascii=False))
