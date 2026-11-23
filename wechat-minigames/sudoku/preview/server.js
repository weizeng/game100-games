#!/usr/bin/env node
/**
 * 本地静态预览服务。只读本样板目录，不访问微信。
 *
 * 入口 http://127.0.0.1:PORT/ 会直接返回 preview/index.html，但浏览器地址仍是 /。
 * 因此页面里的脚本必须用站点根绝对路径（如 /preview/boot.js），不能写成 ./boot.js。
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var DEFAULT_PORT = Number(process.env.PORT || 8765);
var DEFAULT_HOST = process.env.HOST || '0.0.0.0';

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8'
};

function resolvePath(urlPath) {
  urlPath = decodeURIComponent((urlPath || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/preview/index.html';
  var rel = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  var file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) return { forbidden: true, urlPath: urlPath };
  return { file: file, urlPath: urlPath };
}

function handler(req, res) {
  var resolved = resolvePath(req.url);
  if (resolved.forbidden) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.stat(resolved.file, function (err, st) {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('not found');
      return;
    }
    var ext = path.extname(resolved.file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(resolved.file).pipe(res);
  });
}

function start(opts, cb) {
  opts = opts || {};
  if (typeof opts === 'function') { cb = opts; opts = {}; }
  var port = opts.port != null ? opts.port : DEFAULT_PORT;
  var host = opts.host || DEFAULT_HOST;
  var server = http.createServer(handler);
  server.listen(port, host, function () {
    if (cb) cb(null, server);
  });
  server.on('error', function (err) { if (cb) cb(err); });
  return server;
}

if (require.main === module) {
  start(function (err, server) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    var addr = server.address();
    var host = addr.address === '0.0.0.0' || addr.address === '::' ? '127.0.0.1' : addr.address;
    console.log('sudoku preview listening on http://' + host + ':' + addr.port + '/');
    console.log('This is a local Canvas preview, not WeChat DevTools or a device.');
  });
}

module.exports = {
  start: start,
  resolvePath: resolvePath,
  ROOT: ROOT,
  TYPES: TYPES,
  DEFAULT_PORT: DEFAULT_PORT
};
