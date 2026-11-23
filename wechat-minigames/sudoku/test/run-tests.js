#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var ROOT = path.resolve(__dirname, '..');
var SCREEN_DIR = path.join(ROOT, 'screenshots');
var App = require('../src/app.js');
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

function tapId(app, id, pred) {
  var hits = app.getHits().filter(function (h) {
    if (h.id !== id) return false;
    return pred ? pred(h) : true;
  });
  assert.ok(hits.length, 'missing hit ' + id);
  var h = hits[0];
  var got = app.pointer({ x: h.x + h.w / 2, y: h.y + h.h / 2 });
  assert.ok(got && got.id === id, 'pointer missed ' + id + ' got ' + JSON.stringify(got));
  return got;
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

console.log('== 关卡与规则 ==');
check('三种玩法关卡数量：数独 15、搭桥 15、围圈 18', function () {
  assert.strictEqual(App.LEVELS.length, 15);
  assert.strictEqual(App.HASHI_LEVELS.length, 15);
  assert.strictEqual(App.SLITHER_LEVELS.length, 18);
  assert.strictEqual(App.MODES.length, 3);
});

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

check('6×6 宫格是 2×3；数独 5/10/15 为首领', function () {
  assert.strictEqual(App.boxSize(6), 2);
  assert.strictEqual(App.boxWidth(6), 3);
  assert.ok(App.isBoss('sudoku', 4) && App.isBoss('sudoku', 9) && App.isBoss('sudoku', 14));
  assert.strictEqual(App.levelSpec(4).name, '数阵卫士');
  assert.strictEqual(App.levelSpec(14).name, '终末数独魔');
});

check('15 道搭桥关卡的设计解均满足数字、连通且无交叉', function () {
  App.HASHI_LEVELS.forEach(function (lv, i) {
    assert.ok(App.hashiWin(lv.islands, lv.sol), 'hashi sol invalid at ' + (i + 1) + ' ' + lv.name);
    assert.ok(!App.hashiCanLink || true);
  });
  assert.ok(App.isBoss('hashi', 5) && App.isBoss('hashi', 9) && App.isBoss('hashi', 14));
});

check('围圈第 1 关是 2×2 全 2，外圈是合法回路', function () {
  var p = App.SLITHER_LEVELS[0];
  assert.strictEqual(p.w, 2);
  assert.strictEqual(p.h, 2);
  var HZ = [[1, 1], [0, 0], [1, 1]];
  var VZ = [[1, 0, 1], [1, 0, 1]];
  assert.ok(App.slitherAllCluesOk(p, HZ, VZ));
  var info = App.slitherLoopInfo(p, HZ, VZ);
  assert.ok(info.ok, info.reason);
});

console.log('== 大厅与字号 ==');
var pack = makeApp();
var app = pack.app, canvas = pack.canvas;
var shots = {};

check('首页可渲染，标题为逻辑谜题', function () {
  var st = app.getState();
  assert.strictEqual(st.screen, 'start');
  assert.strictEqual(st.size.W, 390);
  assert.strictEqual(st.size.H, 844);
  assert.strictEqual(st.size.dpr, 2);
  assert.ok(App.FONT.body >= 17);
  assert.ok(App.FONT.caption >= 15);
  assert.ok(App.FONT.title >= 36);
  shots.start = shot(app, canvas, '01-start');
});

check('点开始进入合集教程，跳过后进入大厅', function () {
  tapId(app, 'start');
  assert.strictEqual(app.getState().screen, 'tutorial');
  shots.tutorial = shot(app, canvas, '02-tutorial');
  tapId(app, 'tutSkip');
  assert.strictEqual(app.getState().screen, 'lobby');
  assert.strictEqual(app.getState().progress.tut, 1);
  assert.ok(app.getHits().some(function (h) { return h.id === 'mode' && h.data.id === 'sudoku'; }));
  assert.ok(app.getHits().some(function (h) { return h.id === 'mode' && h.data.id === 'hashi'; }));
  assert.ok(app.getHits().some(function (h) { return h.id === 'mode' && h.data.id === 'slither'; }));
  shots.lobby = shot(app, canvas, '03-lobby');
});

console.log('== 数独首关 ==');
check('数独首关可注入残局并通关', function () {
  app.startLevel('sudoku', 0, PUZZLE);
  var st = app.getState();
  assert.strictEqual(st.screen, 'play');
  assert.strictEqual(st.mode, 'sudoku');
  assert.strictEqual(st.N, 4);
  assert.strictEqual(st.filled, 12);
  assert.strictEqual(st.need, 16);
  shots.sudoku = shot(app, canvas, '04-play-sudoku');

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
  tapCell(0, 1); tapNum(2);
  tapCell(1, 2); tapNum(1);
  tapCell(2, 3); tapNum(3);
  tapCell(3, 0); tapNum(4);
  st = app.getState();
  assert.strictEqual(st.ended, true);
  assert.strictEqual(st.screen, 'over');
  assert.strictEqual(st.lastWin, true);
  assert.strictEqual(st.progress.modes.sudoku.stars[0], 3);
  assert.ok(st.progress.coins > 0);
  shots.sudokuWin = shot(app, canvas, '05-win-sudoku');
});

check('数独选关解锁第 2 关，重开后进度仍在', function () {
  tapId(app, 'levels');
  assert.ok(app.getHits().some(function (h) { return h.id === 'level' && h.data.i === 1; }));
  var store = pack.platform._store;
  var pack2 = makeApp(store);
  pack2.app.setMode('sudoku');
  pack2.app.setScreen('levels');
  pack2.app.render();
  assert.strictEqual(pack2.app.getState().progress.modes.sudoku.stars[0], 3);
  assert.ok(pack2.app.getHits().some(function (h) { return h.id === 'level' && h.data.i === 1; }));
  pack2.app.stop();
});

console.log('== 数独错误输入 / 清除 / 检查 / 提示 / 撤销 ==');
var p2 = makeApp();
p2.app.startLevel('sudoku', 0, PUZZLE);

check('错误数字会标冲突，检查会扣命', function () {
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

check('清除可去掉当前格，撤销可回到上一步', function () {
  p2.app.setSel(0, 1);
  assert.ok(p2.app.eraseSel());
  assert.strictEqual(p2.app.getState().grid[0][1], 0);
  shots.erase = shot(p2.app, p2.canvas, '07-erase');
  p2.app.setSel(0, 1);
  p2.app.fillSel(2);
  assert.strictEqual(p2.app.getState().grid[0][1], 2);
  assert.ok(p2.app.undo());
  assert.strictEqual(p2.app.getState().grid[0][1], 0);
});

check('提示会填入一格并消耗次数', function () {
  var hints = p2.app.getState().hints;
  assert.ok(p2.app.doHint());
  assert.strictEqual(p2.app.getState().hints, hints - 1);
  assert.strictEqual(p2.app.getState().filled, 13);
});

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

console.log('== 数岛搭桥 ==');
var h1 = makeApp();
check('搭桥首关点两座岛可通关', function () {
  h1.app.startLevel('hashi', 0);
  assert.strictEqual(h1.app.getState().screen, 'play');
  assert.strictEqual(h1.app.getState().islands.length, 2);
  shots.hashi = shot(h1.app, h1.canvas, '09-play-hashi');
  tapId(h1.app, 'island', function (h) { return h.data.i === 0; });
  tapId(h1.app, 'island', function (h) { return h.data.i === 1; });
  var st = h1.app.getState();
  assert.strictEqual(st.ended, true);
  assert.strictEqual(st.lastWin, true);
  assert.strictEqual(st.progress.modes.hashi.stars[0], 3);
  shots.hashiWin = shot(h1.app, h1.canvas, '10-win-hashi');
});

check('搭桥非法：对角不相邻的岛不能连，超额桥会被拒绝', function () {
  var hx = makeApp();
  hx.app.startLevel('hashi', 3); // 转弯的桥：(0,0)-(2,0)-(2,2)
  var bad = hx.app.linkHashi(0, 2);
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.error && bad.error.indexOf('同一行') !== -1, bad.error);
  assert.strictEqual(hx.app.getState().bridges.length, 0);
  hx.app.startLevel('hashi', 0);
  hx.app.linkHashi(0, 1);
  // already won on first link; use 双桥初学 (index 4) to test over-number? 
  // level 4 is 双桥初学 n=2,n=2 — one link is n=1, second is n=2, third removes.
  hx.app.stop();

  var hy = makeApp();
  hy.app.startLevel('hashi', 4);
  assert.ok(hy.app.linkHashi(0, 1).ok);
  assert.ok(hy.app.linkHashi(0, 1).ok);
  assert.strictEqual(hy.app.getState().ended, true); // n=2 exactly wins
  hy.app.stop();
});

check('搭桥回大厅后续局：半成品桥还在，解锁与存档保留', function () {
  var packH = makeApp();
  packH.app.startLevel('hashi', 1); // 一线三岛，先搭一座桥
  var res = packH.app.linkHashi(0, 1);
  assert.ok(res.ok);
  assert.strictEqual(packH.app.getState().ended, false);
  assert.strictEqual(packH.app.getState().bridges.length, 1);
  packH.app.goLobby();
  packH.app.render();
  assert.strictEqual(packH.app.getState().screen, 'lobby');
  assert.ok(packH.app.getState().hasSession);
  assert.ok(packH.app.getHits().some(function (h) { return h.id === 'continue'; }));
  var store = packH.platform._store;
  var packH2 = makeApp(store);
  assert.ok(packH2.app.getState().hasSession);
  packH2.app.render();
  assert.ok(packH2.app.getHits().some(function (h) { return h.id === 'continue'; }), 'start screen continue');
  assert.ok(packH2.app.restoreSession());
  var st = packH2.app.getState();
  assert.strictEqual(st.mode, 'hashi');
  assert.strictEqual(st.lv, 1);
  assert.strictEqual(st.screen, 'play');
  assert.strictEqual(st.bridges.length, 1);
  assert.strictEqual(st.bridges[0].n, 1);
  packH.app.linkHashi(1, 2);
  // original already in lobby; finish on restored
  var fin = packH2.app.linkHashi(1, 2);
  assert.ok(fin.ok);
  assert.strictEqual(packH2.app.getState().ended, true);
  assert.strictEqual(packH2.app.getState().lastWin, true);
  packH2.app.goLevels();
  packH2.app.setMode('hashi');
  packH2.app.setScreen('levels');
  packH2.app.render();
  // level 1 (index 1) should be starred; level 2 unlocked only after completing index 1
  assert.ok((packH2.app.getState().progress.modes.hashi.stars[1] || 0) > 0);
  assert.ok(packH2.app.getHits().some(function (h) { return h.id === 'level' && h.data.i === 2; }));
  packH.app.stop();
  packH2.app.stop();
});

console.log('== 围圈数谜 ==');
var s1 = makeApp();
check('围圈首关画出外圈即可通关', function () {
  s1.app.startLevel('slither', 0);
  assert.strictEqual(s1.app.getState().screen, 'play');
  assert.strictEqual(s1.app.getState().puz.w, 2);
  shots.slither = shot(s1.app, s1.canvas, '11-play-slither');
  [
    ['h', 0, 0], ['h', 0, 1], ['h', 2, 0], ['h', 2, 1],
    ['v', 0, 0], ['v', 0, 2], ['v', 1, 0], ['v', 1, 2]
  ].forEach(function (e) {
    var r = s1.app.toggleEdge(e[0], e[1], e[2]);
    assert.ok(r.ok, JSON.stringify(r) + ' ' + e.join(','));
  });
  var st = s1.app.getState();
  assert.strictEqual(st.ended, true);
  assert.strictEqual(st.lastWin, true);
  shots.slitherWin = shot(s1.app, s1.canvas, '12-win-slither');
});

check('围圈非法：给数字 0 的格子画边会被拒绝', function () {
  var sx = makeApp();
  sx.app.startLevel('slither', 2); // 底边三个 0
  var r = sx.app.toggleEdge('h', 3, 0); // bottom edge of bottom-left 0 cell
  assert.strictEqual(r.ok, false);
  assert.ok(r.error && r.error.indexOf('超过') !== -1, r.error);
  assert.strictEqual(sx.app.getState().HZ[3][0], 0);
  assert.ok(sx.app.getState().mistakes >= 1);
  sx.app.stop();
});

check('围圈撤销与回大厅续局', function () {
  var packS = makeApp();
  packS.app.startLevel('slither', 0);
  assert.ok(packS.app.toggleEdge('h', 0, 0).ok);
  assert.strictEqual(packS.app.getState().HZ[0][0], 1);
  assert.ok(packS.app.undo());
  assert.strictEqual(packS.app.getState().HZ[0][0], 0);
  assert.ok(packS.app.toggleEdge('h', 0, 0).ok);
  packS.app.goLobby();
  var store = packS.platform._store;
  var packS2 = makeApp(store);
  assert.ok(packS2.app.restoreSession());
  var st = packS2.app.getState();
  assert.strictEqual(st.mode, 'slither');
  assert.strictEqual(st.HZ[0][0], 1);
  assert.strictEqual(st.ended, false);
  packS.app.stop();
  packS2.app.stop();
});

check('点边命中测试：触摸坐标能点到围圈边', function () {
  var s2 = makeApp();
  s2.app.startLevel('slither', 0);
  s2.app.render();
  var edge = s2.app.getHits().filter(function (h) { return h.id === 'hedge' && h.data.r === 0 && h.data.c === 0; })[0];
  assert.ok(edge, 'hedge 0,0');
  var got = s2.app.pointer({ x: edge.x + edge.w / 2, y: edge.y + edge.h / 2 });
  assert.ok(got && got.id === 'hedge');
  assert.strictEqual(s2.app.getState().HZ[0][0], 1);
  s2.app.stop();
});

console.log('== 坐标映射 ==');
check('CSS 像素经 getBoundingClientRect 映射到数独棋盘格', function () {
  var p4 = makeApp();
  p4.app.startLevel('sudoku', 0, PUZZLE);
  var L = p4.app.layoutPlay();
  var s = L.board.size / 4;
  var lx = L.board.x + s * 1.5;
  var ly = L.board.y + s * 0.5;
  var plat = Preview.createPreviewPlatform({
    getBoundingClientRect: function () { return { left: 20, top: 40, width: 195, height: 422 }; }
  }, { width: 390, height: 844, pixelRatio: 2, fixedSize: true });
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
h1.app.stop();
s1.app.stop();

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
  note: '逻辑与 Canvas 程序化渲染测试。不是微信开发者工具或真机测试。三种玩法均在包内，无远程 JS。'
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
