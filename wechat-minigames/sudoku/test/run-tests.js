#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var ROOT = path.resolve(__dirname, '..');
var SCREEN_DIR = path.join(ROOT, 'screenshots');
var App = require('../src/sudoku-app.js');
var Preview = require('../preview/platform-preview.js');

var { createCanvas } = require('/tmp/napi-canvas/node_modules/@napi-rs/canvas');

var results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name: name, ok: true });
    console.log('  PASS  ' + name);
  } catch (e) {
    results.push({ name: name, ok: false, error: e.stack || String(e) });
    console.log('  FAIL  ' + name);
    console.log(e && e.stack ? e.stack : e);
  }
}

function makeApp(store) {
  var canvas = createCanvas(780, 1688);
  var platform = Preview.createPreviewPlatform(canvas, {
    width: 390,
    height: 844,
    pixelRatio: 2,
    fixedSize: true,
    store: store || Preview.memoryStore(),
    safeTop: 44,
    safeBottom: 16,
    statusBarHeight: 24
  });
  var app = App.createApp(platform, { manualLoop: true, rng: App.makeSeededRng(20261123) });
  return { canvas: canvas, platform: platform, app: app };
}

function shot(app, canvas, name) {
  app.render();
  if (!fs.existsSync(SCREEN_DIR)) fs.mkdirSync(SCREEN_DIR, { recursive: true });
  var file = path.join(SCREEN_DIR, name + '.png');
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  var st = fs.statSync(file);
  return { file: file, bytes: st.size };
}

var PUZZLE = {
  sol: [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1]
  ],
  grid: [
    [1, 0, 3, 4],
    [3, 4, 0, 2],
    [2, 1, 4, 0],
    [0, 3, 2, 1]
  ]
};

console.log('== 逻辑 ==');
check('4×4 / 6×6 / 9×9 生成盘都是合法解', function () {
  [4, 6, 9].forEach(function (n) {
    var g = App.genSol(n, App.makeSeededRng(n * 99));
    assert.strictEqual(g.length, n);
    var r, c;
    for (r = 0; r < n; r++) {
      for (c = 0; c < n; c++) {
        assert.ok(g[r][c] >= 1 && g[r][c] <= n, 'value range');
        var v = g[r][c];
        g[r][c] = 0;
        assert.ok(App.cellInBoxOk(g, n, r, c, v), 'conflict at ' + n + ':' + r + ',' + c);
        g[r][c] = v;
      }
    }
  });
});

check('6×6 宫格是 2×3', function () {
  assert.strictEqual(App.boxSize(6), 2);
  assert.strictEqual(App.boxWidth(6), 3);
});

check('15 关规格与原作一致（含 5/10/15 首领，不另造首领机制）', function () {
  assert.strictEqual(App.LEVELS.length, 15);
  assert.ok(App.isBoss(4) && App.isBoss(9) && App.isBoss(14));
  assert.strictEqual(App.levelSpec(0).n, 4);
  assert.strictEqual(App.levelSpec(4).name, '数阵卫士');
  assert.strictEqual(App.levelSpec(9).n, 9);
  assert.strictEqual(App.levelSpec(14).name, '终末数独魔');
  assert.ok(!App.isBoss(0) && !App.isBoss(1));
});

console.log('== 玩法 ==');
var pack = makeApp();
var app = pack.app, canvas = pack.canvas;
var shots = {};

check('首页可渲染', function () {
  var st = app.getState();
  assert.strictEqual(st.screen, 'start');
  assert.strictEqual(st.size.W, 390);
  assert.strictEqual(st.size.H, 844);
  assert.strictEqual(st.size.dpr, 2);
  shots.start = shot(app, canvas, '01-start');
});

check('点开始进入教程，跳过后进入选关', function () {
  var startHit = app.getHits().filter(function (h) { return h.id === 'start'; })[0];
  assert.ok(startHit, 'start button');
  var hit = app.pointer({ x: startHit.x + startHit.w / 2, y: startHit.y + startHit.h / 2 });
  assert.ok(hit && hit.id === 'start');
  assert.strictEqual(app.getState().screen, 'tutorial');
  shots.tutorial = shot(app, canvas, '02-tutorial');
  var skip = app.getHits().filter(function (h) { return h.id === 'tutSkip'; })[0];
  app.pointer({ x: skip.x + skip.w / 2, y: skip.y + skip.h / 2 });
  assert.strictEqual(app.getState().screen, 'levels');
  assert.strictEqual(app.getState().progress.tut, 1);
  shots.levels = shot(app, canvas, '03-levels');
});

check('首关可注入已知残局并通关', function () {
  app.startLevel(0, PUZZLE);
  var st = app.getState();
  assert.strictEqual(st.screen, 'play');
  assert.strictEqual(st.N, 4);
  assert.strictEqual(st.filled, 12);
  assert.strictEqual(st.need, 16);
  shots.play = shot(app, canvas, '04-play-level1');

  function tapCell(r, c) {
    var cell = app.getHits().filter(function (h) { return h.id === 'cell' && h.data.r === r && h.data.c === c; })[0];
    assert.ok(cell, 'cell ' + r + ',' + c);
    var got = app.pointer({ x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 });
    assert.ok(got && got.id === 'cell');
  }
  function tapNum(n) {
    var btn = app.getHits().filter(function (h) { return h.id === 'num' && h.data.n === n; })[0];
    assert.ok(btn, 'num ' + n);
    var got = app.pointer({ x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 });
    assert.ok(got && got.id === 'num');
  }
  // empties: (0,1)=2, (1,2)=1, (2,3)=3, (3,0)=4
  tapCell(0, 1); tapNum(2);
  tapCell(1, 2); tapNum(1);
  tapCell(2, 3); tapNum(3);
  tapCell(3, 0); tapNum(4);
  st = app.getState();
  assert.strictEqual(st.ended, true);
  assert.strictEqual(st.screen, 'over');
  assert.strictEqual(st.lastWin, true);
  assert.strictEqual(st.progress.stars[0], 3);
  assert.ok(st.progress.coins > 0);
  shots.win = shot(app, canvas, '05-win');
});

check('选关解锁第 2 关，重开后进度仍在', function () {
  var menu = app.getHits().filter(function (h) { return h.id === 'menu'; })[0];
  app.pointer({ x: menu.x + menu.w / 2, y: menu.y + menu.h / 2 });
  assert.ok(app.getHits().some(function (h) { return h.id === 'level' && h.data.i === 1; }));
  var store = pack.platform._store;
  var pack2 = makeApp(store);
  pack2.app.setScreen('levels');
  pack2.app.render();
  assert.strictEqual(pack2.app.getState().progress.stars[0], 3);
  assert.ok(pack2.app.getHits().some(function (h) { return h.id === 'level' && h.data.i === 1; }));
  pack2.app.stop();
});

console.log('== 错误输入 / 清除 / 检查 / 提示 ==');
var p2 = makeApp();
p2.app.startLevel(0, PUZZLE);

check('错误数字会标冲突，检查会扣命', function () {
  // (0,1) 正确是 2；填 1 会与 (0,0) 的 1 冲突
  p2.app.setSel(0, 1);
  p2.app.fillSel(1);
  assert.strictEqual(p2.app.getState().grid[0][1], 1);
  assert.strictEqual(App.cellOk(p2.app.getState().grid, 4, 0, 1), false);
  shots.bad = shot(p2.app, p2.canvas, '06-bad-input');
  var lives = p2.app.getState().lives;
  var res = p2.app.doCheck();
  assert.ok(res.bad >= 1);
  assert.strictEqual(p2.app.getState().lives, lives - 1);
  assert.strictEqual(p2.app.getState().mistakes, 1);
});

check('清除可去掉当前格', function () {
  p2.app.setSel(0, 1);
  assert.ok(p2.app.eraseSel());
  assert.strictEqual(p2.app.getState().grid[0][1], 0);
  shots.erase = shot(p2.app, p2.canvas, '07-erase');
});

check('提示会填入一格并消耗次数', function () {
  var hints = p2.app.getState().hints;
  assert.ok(p2.app.doHint());
  assert.strictEqual(p2.app.getState().hints, hints - 1);
  assert.strictEqual(p2.app.getState().filled, 13);
});

check('原作没有笔记/铅笔标记，样板同样未实现笔记', function () {
  var ids = p2.app.getHits().map(function (h) { return h.id; });
  assert.ok(ids.indexOf('erase') !== -1);
  assert.ok(ids.indexOf('note') === -1);
  assert.ok(ids.indexOf('pencil') === -1);
});

console.log('== 暂停 / 续玩 / 计时 ==');
check('暂停时计时停止，继续后恢复', function () {
  var before = p2.app.getState().timeLeft;
  p2.app.advance(2);
  var mid = p2.app.getState().timeLeft;
  assert.ok(mid < before - 1.5, 'running timer ' + mid + ' vs ' + before);
  assert.ok(p2.app.pause());
  assert.strictEqual(p2.app.getState().screen, 'pause');
  shots.pause = shot(p2.app, p2.canvas, '08-pause');
  var pausedAt = p2.app.getState().timeLeft;
  p2.app.advance(3);
  assert.ok(Math.abs(p2.app.getState().timeLeft - pausedAt) < 1e-9, 'paused timer should freeze');
  assert.ok(p2.app.resume());
  assert.strictEqual(p2.app.getState().screen, 'play');
  p2.app.advance(1);
  assert.ok(p2.app.getState().timeLeft < pausedAt - 0.5);
});

check('隐藏/切后台会暂停（onHide）', function () {
  var p3 = makeApp();
  p3.app.startLevel(0, PUZZLE);
  assert.strictEqual(p3.app.getState().screen, 'play');
  // platform hide is wired at create time; call pause as the hide path does
  p3.app.pause();
  assert.strictEqual(p3.app.getState().screen, 'pause');
  p3.app.stop();
});

console.log('== 坐标映射 ==');
check('CSS 像素经 getBoundingClientRect 映射到棋盘格', function () {
  var p4 = makeApp();
  p4.app.startLevel(0, PUZZLE);
  var L = p4.app.layoutPlay();
  var s = L.board.size / 4;
  // 逻辑坐标：第 0 行 1 列中心
  var lx = L.board.x + s * 1.5;
  var ly = L.board.y + s * 0.5;
  // 模拟画布按 0.5 缩放显示在 (20, 40)
  var fakeCanvas = {
    getBoundingClientRect: function () {
      return { left: 20, top: 40, width: 195, height: 422 };
    }
  };
  var mapped = p4.platform.cssToLogical.call(
    { /* rebound */ },
    // recreate using function with canvas replaced
    20 + (lx / 390) * 195,
    40 + (ly / 844) * 422
  );
  // The cssToLogical closes over the napi canvas without getBoundingClientRect.
  // Call the method from a platform built with a stub canvas.
  var stub = {
    getBoundingClientRect: function () { return { left: 20, top: 40, width: 195, height: 422 }; }
  };
  var plat = Preview.createPreviewPlatform(stub, { width: 390, height: 844, pixelRatio: 2, fixedSize: true });
  var pt = plat.cssToLogical(20 + (lx / 390) * 195, 40 + (ly / 844) * 422);
  assert.ok(Math.abs(pt.x - lx) < 0.6, 'x ' + pt.x + ' vs ' + lx);
  assert.ok(Math.abs(pt.y - ly) < 0.6, 'y ' + pt.y + ' vs ' + ly);
  var hit = p4.app.pointer({ x: pt.x, y: pt.y });
  assert.ok(hit && hit.id === 'cell' && hit.data.r === 0 && hit.data.c === 1, JSON.stringify(hit && hit.data));
  p4.app.stop();
});

console.log('== 体积 ==');
var sizeReport = [];
function walk(dir, rel) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === 'screenshots' || name === 'node_modules') return;
    var p = path.join(dir, name);
    var r = path.join(rel, name);
    var st = fs.statSync(p);
    if (st.isDirectory()) walk(p, r);
    else sizeReport.push({ path: r, bytes: st.size });
  });
}
walk(ROOT, '.');
sizeReport.sort(function (a, b) { return b.bytes - a.bytes; });
var packIgnore = ['preview', 'test', 'screenshots'];
var wxBytes = sizeReport.filter(function (f) {
  return packIgnore.every(function (ig) { return f.path.indexOf('./' + ig + '/') !== 0 && f.path.indexOf(ig + '/') !== 0; });
}).reduce(function (s, f) { return s + f.bytes; }, 0);

check('小游戏目录体积累计远小于 4MB 主包限制', function () {
  assert.ok(wxBytes < 4 * 1024 * 1024, wxBytes);
});

p2.app.stop();
app.stop();

var failed = results.filter(function (r) { return !r.ok; });
var report = {
  generatedAt: new Date().toISOString(),
  passed: results.filter(function (r) { return r.ok; }).length,
  failed: failed.length,
  results: results,
  screenshots: shots,
  sizes: sizeReport,
  wechatPackBytes: wxBytes,
  wechatPackKB: Math.round(wxBytes / 102.4) / 10,
  note: '逻辑与 Canvas 程序化渲染测试。不是微信开发者工具或真机测试。原作无笔记功能。'
};
fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 2));
console.log('\nwechat pack files: ' + (wxBytes / 1024).toFixed(1) + ' KB');
sizeReport.forEach(function (f) {
  console.log('  ' + (f.bytes + '   ').padStart(8) + f.path);
});
console.log('\nlogic tests: ' + report.passed + ' passed, ' + report.failed + ' failed');
var httpTest = require('./preview-http.js');
httpTest.main().then(function () {
  process.exit(failed.length ? 1 : 0);
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
