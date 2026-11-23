#!/usr/bin/env node
/**
 * 本地静态预览服务。只读本样板目录，不访问微信。
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PORT = Number(process.env.PORT || 8765);
var HOST = process.env.HOST || '0.0.0.0';

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8'
};

var server = http.createServer(function (req, res) {
  var urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/preview/index.html';
  var rel = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  var file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) {
      res.writeHead(404); res.end('not found'); return;
    }
    var ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, HOST, function () {
  var addr = server.address();
  console.log('sudoku preview listening on http://' + (addr.address === '0.0.0.0' ? '127.0.0.1' : addr.address) + ':' + addr.port + '/');
  console.log('This is a local Canvas preview, not WeChat DevTools or a device.');
});
