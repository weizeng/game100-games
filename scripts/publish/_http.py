"""极简 HTTP 工具（仅标准库），供各商店上传脚本使用。"""
import json, mimetypes, os, sys, urllib.error, urllib.parse, urllib.request, uuid


def request(method, url, headers=None, data=None, timeout=600):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            return r.status, body
    except urllib.error.HTTPError as e:
        body = e.read()
        sys.stderr.write(f"HTTP {e.code} {method} {url.split('?')[0]}: {body[:800]!r}\n")
        raise


def json_request(method, url, headers=None, payload=None, form=None):
    h = dict(headers or {})
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        h.setdefault("Content-Type", "application/json")
    elif form is not None:
        data = urllib.parse.urlencode(form).encode()
        h.setdefault("Content-Type", "application/x-www-form-urlencoded")
    _, body = request(method, url, h, data)
    return json.loads(body.decode() or "{}")


def multipart(fields, files):
    """fields: {name: str}; files: {name: path} -> (body, content_type)"""
    boundary = uuid.uuid4().hex
    out = []
    for k, v in fields.items():
        out += [f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode(),
                str(v).encode("utf-8"), b"\r\n"]
    for k, path in files.items():
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        out += [f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{k}"; filename="{os.path.basename(path)}"\r\n'.encode(),
                f"Content-Type: {ctype}\r\n\r\n".encode(),
                open(path, "rb").read(), b"\r\n"]
    out.append(f"--{boundary}--\r\n".encode())
    return b"".join(out), f"multipart/form-data; boundary={boundary}"


def need_env(*names):
    missing = [n for n in names if not os.environ.get(n)]
    if missing:
        sys.exit(f"缺少环境变量: {', '.join(missing)}")
    return [os.environ[n] for n in names]
