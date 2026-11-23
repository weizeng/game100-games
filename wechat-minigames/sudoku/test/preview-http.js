#!/usr/bin/env node
/**
 * 回归：在浏览器地址为 / 时，页面引用的静态资源必须全部 HTTP 200，且 MIME 正确。
 * 用来防止再出现 ./boot.js 被解析成 /boot.js 导致 Canvas 黑屏的问题。
 */
'use strict';

var http = require('http');
var path = require('path');
var { start, TYPES } = require('../preview/server.js');

function request(url) {
  return new Promise(function (resolve, reject) {
    var req = http.get(url, function (res) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        resolve({
          url: url,
          status: res.statusCode,
          type: res.headers['content-type'] || '',
          body: Buffer.concat(chunks)
        });
      });
    });
    req.on('error', reject);
  });
}

function extractRefs(html) {
  var refs = [];
  var re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  var m;
  while ((m = re.exec(html))) {
    var ref = m[1].trim();
    if (!ref || ref.charAt(0) === '#' || /^(https?:|data:|mailto:|javascript:)/i.test(ref)) continue;
    refs.push(ref);
  }
  return refs;
}

function expectedMime(urlPath) {
  var ext = path.extname(urlPath.split('?')[0]).toLowerCase();
  return TYPES[ext] || null;
}

function mimeOk(fileUrl, contentType) {
  var expect = expectedMime(new URL(fileUrl).pathname);
  if (!expect) return true;
  // charset 允许存在；主类型必须一致
  return contentType.indexOf(expect.split(';')[0]) === 0;
}

async function checkPage(baseUrl, label, report) {
  var page = await request(baseUrl);
  if (page.status !== 200) {
    report.push({ ok: false, name: label + ' status', detail: String(page.status) });
    return;
  }
  if (page.type.indexOf('text/html') !== 0) {
    report.push({ ok: false, name: label + ' mime', detail: page.type });
    return;
  }
  report.push({ ok: true, name: label + ' ' + page.status + ' ' + page.type });
  var html = page.body.toString('utf8');
  var refs = extractRefs(html);
  if (!refs.length) {
    report.push({ ok: false, name: label + ' has script/link refs', detail: 'none' });
    return;
  }
  var i, ref;
  for (i = 0; i < refs.length; i++) {
    ref = refs[i];
    var abs = new URL(ref, baseUrl).href;
    var res = await request(abs);
    var ok = res.status === 200 && mimeOk(abs, res.type) && res.body.length > 0;
    var name = label + ' dep ' + ref + ' -> ' + abs + ' => ' + res.status + ' ' + res.type + ' ' + res.body.length + 'b';
    report.push({ ok: ok, name: name, detail: ok ? '' : 'missing or wrong mime' });
    if (/\.js$/i.test(abs) && res.status === 200) {
      var text = res.body.toString('utf8');
      if (!text.trim()) report.push({ ok: false, name: abs + ' empty js' });
    }
  }
}

async function main() {
  var report = [];
  var server = await new Promise(function (resolve, reject) {
    var s = start({ port: 0, host: '127.0.0.1' }, function (err, started) {
      if (err) reject(err);
      else resolve(started);
    });
    s.on('error', reject);
  });
  var port = server.address().port;
  var origin = 'http://127.0.0.1:' + port;
  try {
    // 关键回归：地址栏是 / 而不是 /preview/index.html
    await checkPage(origin + '/', 'GET /', report);
    await checkPage(origin + '/preview/index.html', 'GET /preview/index.html', report);

    var required = ['/src/sudoku-app.js', '/src/levels-data.js', '/src/app.js', '/preview/platform-preview.js', '/preview/boot.js'];
    var i;
    for (i = 0; i < required.length; i++) {
      var res = await request(origin + required[i]);
      var ok = res.status === 200 && mimeOk(origin + required[i], res.type);
      report.push({
        ok: ok,
        name: 'required ' + required[i] + ' => ' + res.status + ' ' + res.type
      });
    }

    // 旧的相对路径在地址栏为 / 时会打到这些位置；现在页面不应再引用它们。
    var html = (await request(origin + '/')).body.toString('utf8');
    if (html.indexOf('src="./boot.js"') !== -1 || html.indexOf('src="./platform-preview.js"') !== -1) {
      report.push({ ok: false, name: 'HTML must not use ./ relative script paths at /' });
    } else {
      report.push({ ok: true, name: 'HTML uses root-absolute script paths' });
    }
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
  }

  var failed = report.filter(function (r) { return !r.ok; });
  report.forEach(function (r) {
    console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.name + (r.detail ? '  (' + r.detail + ')' : ''));
  });
  console.log('\npreview-http: ' + (report.length - failed.length) + ' passed, ' + failed.length + ' failed');
  if (failed.length) process.exit(1);
}

module.exports = { main: main, extractRefs: extractRefs };

if (require.main === module) {
  main().catch(function (err) {
    console.error(err);
    process.exit(1);
  });
}
