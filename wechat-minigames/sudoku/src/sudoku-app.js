/**
 * 数独核心：玩法 + 全部 Canvas UI（无 DOM）。
 * 微信小游戏与本地预览共用同一份代码；平台差异只通过 platform 注入。
 * 关卡数据、规则与原版 games/sudoku 对齐；原作棋盘是 DOM，这里改为 Canvas 绘制。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SudokuApp = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LEVELS = [
    { n: 4, holes: 0.45, time: 100 },
    { n: 4, holes: 0.5, time: 95 },
    { n: 4, holes: 0.55, time: 90 },
    { n: 6, holes: 0.45, time: 120 },
    { boss: { name: '数阵卫士', n: 6, holes: 0.5, time: 110, strict: 1 } },
    { n: 6, holes: 0.5, time: 110 },
    { n: 6, holes: 0.55, time: 100 },
    { n: 6, holes: 0.58, time: 95 },
    { n: 9, holes: 0.45, time: 180 },
    { boss: { name: '九宫棋王', n: 9, holes: 0.5, time: 160, strict: 1 } },
    { n: 9, holes: 0.5, time: 150 },
    { n: 9, holes: 0.52, time: 140 },
    { n: 9, holes: 0.55, time: 130 },
    { n: 9, holes: 0.58, time: 120 },
    { boss: { name: '终末数独魔', n: 9, holes: 0.62, time: 110, strict: 1 } }
  ];

  var UPS = [
    { k: 'hint', ic: '提示', name: '提示', desc: '开局提示+1', max: 2, cost: function (l) { return 26 + l * 28; } },
    { k: 'time', ic: '加时', name: '加时', desc: '+15 秒', max: 2, cost: function (l) { return 28 + l * 30; } },
    { k: 'life', ic: '生命', name: '额外命', desc: '+1 命', max: 2, cost: function (l) { return 32 + l * 34; }, stars: 5 }
  ];

  var TUTORIAL = [
    { t: '选格', d: '点空白格子选中。', ic: '选' },
    { t: '填数', d: '点下方数字填入。', ic: '数' },
    { t: '规则', d: '行、列、宫内数字不重复。', ic: '规' },
    { t: '首领关', d: '第 5 / 10 / 15 关盘面更大、已知更少、时限更紧。', ic: '首' }
  ];

  var PROG_KEY = 'g100_sudoku_prog';
  var MUTE_KEY = 'g100_mute';
  var LEVEL_COUNT = 15;

  function boxSize(n) { return n === 9 ? 3 : 2; }
  function boxWidth(n) { return n === 6 ? 3 : boxSize(n); }

  function defaultRng() { return Math.random(); }

  function makeSeededRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s += 0x6D2B79F5;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(a, rng) {
    rng = rng || defaultRng;
    for (var i = a.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0;
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function cellInBoxOk(g, n, r, c, v) {
    var i, bs = boxSize(n), bw = boxWidth(n);
    for (i = 0; i < n; i++) if (g[r][i] === v || g[i][c] === v) return false;
    var br = Math.floor(r / bs) * bs, bc = Math.floor(c / bw) * bw, ii, jj;
    for (ii = 0; ii < bs; ii++) for (jj = 0; jj < bw; jj++) if (g[br + ii][bc + jj] === v) return false;
    return true;
  }

  function genSol(n, rng) {
    rng = rng || defaultRng;
    var g = [];
    var r, c;
    for (r = 0; r < n; r++) {
      g[r] = [];
      for (c = 0; c < n; c++) g[r][c] = 0;
    }
    var bs = boxSize(n);
    function fill(pos) {
      if (pos === n * n) return true;
      var rr = (pos / n) | 0, cc = pos % n;
      var nums = [];
      var k;
      for (k = 1; k <= n; k++) nums.push(k);
      shuffle(nums, rng);
      for (k = 0; k < nums.length; k++) {
        var v = nums[k];
        if (cellInBoxOk(g, n, rr, cc, v)) {
          g[rr][cc] = v;
          if (fill(pos + 1)) return true;
          g[rr][cc] = 0;
        }
      }
      return false;
    }
    if (!fill(0)) {
      for (r = 0; r < n; r++) for (c = 0; c < n; c++) g[r][c] = ((r * bs + Math.floor(r / bs) + c) % n) + 1;
    }
    return g.map(function (row) { return row.slice(); });
  }

  function cellOk(grid, n, r, c) {
    var v = grid[r][c];
    if (!v) return true;
    var i, bs = boxSize(n), bw = boxWidth(n);
    for (i = 0; i < n; i++) {
      if (i !== c && grid[r][i] === v) return false;
      if (i !== r && grid[i][c] === v) return false;
    }
    var br = Math.floor(r / bs) * bs, bc = Math.floor(c / bw) * bw, ii, jj;
    for (ii = 0; ii < bs; ii++) {
      for (jj = 0; jj < bw; jj++) {
        var rr = br + ii, cc = bc + jj;
        if ((rr !== r || cc !== c) && grid[rr][cc] === v) return false;
      }
    }
    return true;
  }

  function levelSpec(i) {
    var L = LEVELS[i];
    return L.boss || L;
  }

  function isBoss(i) { return !!(LEVELS[i] && LEVELS[i].boss); }

  function cloneGrid(g) { return g.map(function (row) { return row.slice(); }); }

  function emptyProgress() { return { stars: [], best: [], coins: 0, up: {}, tut: 0 }; }

  function starStr(n) {
    n = Math.max(0, Math.min(3, n | 0));
    return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
  }

  function parseProgress(raw) {
    var P = emptyProgress();
    if (!raw) return P;
    try {
      var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (o && typeof o === 'object') {
        P.stars = o.stars || [];
        P.best = o.best || [];
        P.coins = o.coins || 0;
        P.up = o.up || {};
        P.tut = o.tut || 0;
      }
    } catch (e) {}
    return P;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hitRect(x, y, r) {
    return r && x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
  }

  function createApp(platform, opts) {
    opts = opts || {};
    var canvas = platform.getCanvas();
    var ctx = canvas.getContext('2d');
    var W = 390, H = 844, dpr = 1;
    var insets = { top: 20, bottom: 16, left: 0, right: 0 };
    var screen = 'start';
    var tutI = 0;
    var tutThen = 'levels';
    var P = emptyProgress();
    var muted = false;
    var toast = { text: '', until: 0 };
    var nowMs = 0;
    var lastTs = 0;
    var raf = 0;
    var ended = false;
    var N = 4, sol = [], grid = [], fixed = [], lives = 3, score = 0;
    var timeLeft = 0, hints = 2, mistakes = 0, sel = -1, boss = null, lv = 0;
    var lastWin = false;
    var overWhy = '';
    var overGain = 0;
    var hits = [];
    var running = true;
    var lastRender = { fills: 0 };
    var audio = null;
    var rngFn = opts.rng || defaultRng;

    function storageGet(k) {
      try { return platform.storageGet(k); } catch (e) { return null; }
    }
    function storageSet(k, v) {
      try { platform.storageSet(k, String(v)); } catch (e) {}
    }
    function loadProg() {
      P = parseProgress(storageGet(PROG_KEY));
      muted = storageGet(MUTE_KEY) === '1';
    }
    function saveProg() { storageSet(PROG_KEY, JSON.stringify(P)); }
    function up(k) { return P.up[k] || 0; }
    function totalStars() {
      var s = 0, i;
      for (i = 0; i < P.stars.length; i++) s += P.stars[i] || 0;
      return s;
    }
    function hs() {
      var s = 0, i;
      for (i = 0; i < P.best.length; i++) s += P.best[i] || 0;
      return s;
    }
    function unlocked(i) { return i === 0 || (P.stars[i - 1] || 0) > 0; }

    function toastMsg(msg, ms) {
      toast.text = msg;
      toast.until = nowMs + (ms || 1300);
    }

    function ensureAudio() {
      if (muted || audio) return audio;
      try { audio = platform.createAudioContext && platform.createAudioContext(); } catch (e) { audio = null; }
      return audio;
    }

    function tone(f, d, type, vol, f2, delay) {
      if (muted) return;
      var ac = ensureAudio();
      if (!ac || !ac.createOscillator) return;
      try {
        if (ac.state === 'suspended' && ac.resume) ac.resume();
        var t = ac.currentTime + (delay || 0);
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
        g.gain.setValueAtTime(vol || 0.13, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(ac.destination);
        o.start(t);
        o.stop(t + d + 0.02);
      } catch (e) {}
    }

    function sfx(n) {
      switch (n) {
        case 'tap': tone(520, 0.06, 'triangle', 0.08); break;
        case 'good': tone(660, 0.08, 'sine'); tone(990, 0.1, 'sine', 0.1, 0, 0.06); break;
        case 'bad': tone(220, 0.22, 'sawtooth', 0.1, 110); break;
        case 'coin': tone(1200, 0.07, 'sine', 0.09); tone(1600, 0.09, 'sine', 0.08, 0, 0.06); break;
        case 'boss': tone(110, 0.5, 'sawtooth', 0.12, 70); tone(165, 0.5, 'square', 0.06, 90, 0.1); break;
        case 'win':
          [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.12, 0, i * 0.11); });
          break;
        case 'lose':
          [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.22, 'sawtooth', 0.08, 0, i * 0.13); });
          break;
        default: tone(440, 0.08);
      }
    }

    function setMute(m) {
      muted = !!m;
      storageSet(MUTE_KEY, muted ? '1' : '0');
    }

    function addHit(r, id, data) {
      if (!r) return;
      hits.push({ x: r.x, y: r.y, w: r.w, h: r.h, id: id, data: data || null });
    }

    function resize() {
      var info = platform.getSystemInfo();
      W = Math.max(320, info.windowWidth || 390);
      H = Math.max(560, info.windowHeight || 844);
      dpr = Math.max(1, Math.min(2.5, info.pixelRatio || 1));
      var sa = info.safeArea || {};
      insets.top = Math.max(info.statusBarHeight || 0, sa.top || 0, 16);
      insets.bottom = Math.max(16, info.windowHeight && sa.bottom ? (info.windowHeight - sa.bottom) : 16);
      insets.left = sa.left || 0;
      insets.right = Math.max(0, (info.windowWidth || W) - (sa.right || info.windowWidth || W));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (platform.setCanvasStyle) platform.setCanvasStyle(W, H);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function layoutPlay() {
      var pad = 14;
      var x0 = pad + insets.left;
      var width = W - pad * 2 - insets.left - insets.right;
      var y = insets.top + 8;
      var topBar = { x: x0, y: y, w: width, h: 48 };
      y += 54;
      var subBar = { x: x0, y: y, w: width, h: 26 };
      y += 34;
      var padH = N <= 4 ? 56 : N <= 6 ? 52 : 100;
      var actH = 48;
      var hintH = 28;
      var footer = padH + actH + hintH + insets.bottom + 18;
      var boardMax = Math.max(180, Math.min(width, H - y - footer));
      var board = { x: x0 + (width - boardMax) / 2, y: y, w: boardMax, h: boardMax, size: boardMax };
      y = board.y + board.size + 12;
      var padBox = { x: x0, y: y, w: width, h: padH };
      y += padH + 8;
      var actions = { x: x0, y: y, w: width, h: actH };
      y += actH + 4;
      var hint = { x: x0, y: y, w: width, h: hintH };
      return { topBar: topBar, subBar: subBar, board: board, padBox: padBox, actions: actions, hint: hint };
    }

    function layoutMenuCard() {
      var w = Math.min(360, W - 32);
      var x = (W - w) / 2;
      var y = Math.max(insets.top + 24, H * 0.08);
      return { x: x, y: y, w: w, h: H - y - insets.bottom - 20 };
    }

    function filledCount() {
      var n = 0, r, c;
      if (!grid || !grid.length) return 0;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (grid[r][c]) n++;
      return n;
    }

    function startLevel(i, inject) {
      lv = i;
      var L = LEVELS[i];
      var b = L.boss || L;
      boss = L.boss ? { name: L.boss.name } : null;
      N = b.n;
      score = 0;
      ended = false;
      lives = 3 + up('life');
      mistakes = 0;
      sel = -1;
      hints = 2 + up('hint');
      timeLeft = b.time + up('time') * 15;
      if (inject && inject.sol && inject.grid) {
        sol = cloneGrid(inject.sol);
        grid = cloneGrid(inject.grid);
      } else {
        sol = genSol(N, inject && inject.rng ? inject.rng : rngFn);
        grid = cloneGrid(sol);
        var cells = [], r, c;
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) cells.push([r, c]);
        shuffle(cells, inject && inject.rng ? inject.rng : rngFn);
        var dig = Math.floor(N * N * b.holes);
        for (var k = 0; k < dig; k++) {
          grid[cells[k][0]][cells[k][1]] = 0;
        }
      }
      fixed = [];
      var rr, cc;
      for (rr = 0; rr < N; rr++) {
        fixed[rr] = [];
        for (cc = 0; cc < N; cc++) fixed[rr][cc] = !!grid[rr][cc];
      }
      screen = 'play';
      lastTs = nowMs || (platform.now ? platform.now() : 0);
      if (boss) {
        sfx('boss');
        toastMsg('首领关：' + boss.name, 1800);
      } else sfx('tap');
      render();
    }

    function checkWin() {
      var r, c;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (grid[r][c] !== sol[r][c]) return false;
      score += 80 + Math.floor(timeLeft) + N * 8;
      endLv(true);
      return true;
    }

    function endLv(won, why) {
      if (ended) return;
      ended = true;
      overWhy = why || (won ? (boss ? ('击败 ' + boss.name) : '数独完成') : '失败');
      if (won) {
        var st = mistakes === 0 && lives >= 3 ? 3 : lives >= 2 ? 2 : 1;
        lastWin = true;
        var old = P.stars[lv] || 0;
        overGain = st * 4 + (old ? 0 : 6) + (isBoss(lv) ? 8 : 0);
        P.coins += overGain;
        if (st > old) P.stars[lv] = st;
        if (score > (P.best[lv] || 0)) P.best[lv] = score;
        saveProg();
        sfx('win');
        screen = 'over';
      } else {
        lastWin = false;
        overGain = Math.min(3, lv > 0 ? 2 : 1);
        P.coins += overGain;
        saveProg();
        sfx('lose');
        if (platform.vibrate) platform.vibrate(120);
        screen = 'over';
      }
    }

    function fillSel(n) {
      if (screen !== 'play' || ended || sel < 0) return false;
      var r = (sel / N) | 0, c = sel % N;
      if (fixed[r][c]) return false;
      grid[r][c] = n;
      sfx('tap');
      checkWin();
      return true;
    }

    function eraseSel() {
      if (screen !== 'play' || ended || sel < 0) return false;
      var r = (sel / N) | 0, c = sel % N;
      if (fixed[r][c]) return false;
      grid[r][c] = 0;
      sfx('tap');
      return true;
    }

    function doCheck() {
      if (screen !== 'play' || ended) return { bad: 0 };
      var bad = 0, r, c;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (grid[r][c] && grid[r][c] !== sol[r][c]) bad++;
      if (bad) {
        lives--;
        mistakes++;
        sfx('bad');
        toastMsg(bad + ' 格错误');
        if (lives <= 0) endLv(false, '检查失败');
      } else {
        sfx('good');
        toastMsg('已填都正确');
      }
      return { bad: bad };
    }

    function doHint() {
      if (screen !== 'play' || ended) return false;
      if (hints <= 0) { toastMsg('提示用完'); return false; }
      var r, c;
      for (r = 0; r < N; r++) {
        for (c = 0; c < N; c++) {
          if (!grid[r][c]) {
            grid[r][c] = sol[r][c];
            fixed[r][c] = true;
            hints--;
            sfx('coin');
            toastMsg('填入一格');
            checkWin();
            return true;
          }
        }
      }
      return false;
    }

    function pause() {
      if (screen !== 'play' || ended) return false;
      screen = 'pause';
      return true;
    }

    function resume() {
      if (screen !== 'pause') return false;
      screen = 'play';
      lastTs = nowMs;
      return true;
    }

    function goMenu() {
      ended = true;
      screen = 'levels';
    }

    function drawStage() {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#5c6bc0');
      g.addColorStop(0.45, '#303f9f');
      g.addColorStop(1, '#12163a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      var v = ctx.createRadialGradient(W / 2, H * 0.28, 20, W / 2, H * 0.4, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(255,255,255,0.10)');
      v.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }

    function drawButton(r, label, kind) {
      kind = kind || 'accent';
      var fill = kind === 'ghost' ? 'rgba(255,255,255,0.14)' : kind === 'disabled' ? 'rgba(255,255,255,0.08)' : kind === 'gold' ? '#ffd54f' : '#ff5fa2';
      var color = kind === 'gold' ? '#3e2723' : kind === 'disabled' ? 'rgba(255,255,255,0.35)' : '#fff';
      ctx.save();
      roundedRect(ctx, r.x, r.y, r.w, r.h, 14);
      ctx.fillStyle = fill;
      ctx.fill();
      if (kind === 'accent') {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.restore();
    }

    function drawIconBtn(r, label) {
      roundedRect(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    }

    function drawStart() {
      hits = [];
      var card = layoutMenuCard();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('数独', W / 2, card.y + 64);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      wrapText('15 关：4×4 → 6×6 → 9×9，挖空更多、时限更紧。第 5 / 10 / 15 关为首领关。可升级提示、加时、额外命。', W / 2, card.y + 110, card.w - 36, 22);
      var best = totalStars() ? ('进度 ★' + totalStars() + '/' + (LEVEL_COUNT * 3) + (hs() ? '  ·  最佳合计 ' + hs() : '')) : '首次游玩会有简短教程';
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(best, W / 2, card.y + 200);
      var startBtn = { x: card.x + 24, y: card.y + 240, w: card.w - 48, h: 52 };
      drawButton(startBtn, '开始游戏', 'accent');
      addHit(startBtn, 'start');
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('平台：' + (platform.name || 'unknown') + (platform.isWeChat ? '（微信运行时）' : '（本地预览，非真机）'), W / 2, H - insets.bottom - 18);
    }

    function wrapText(text, x, y, maxW, lh) {
      var chars = text.split(''), line = '', i, lines = [];
      ctx.textAlign = 'center';
      for (i = 0; i < chars.length; i++) {
        var test = line + chars[i];
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = chars[i]; }
        else line = test;
      }
      if (line) lines.push(line);
      for (i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lh);
    }

    function drawTutorial() {
      hits = [];
      var card = layoutMenuCard();
      var step = TUTORIAL[tutI];
      roundedRect(ctx, card.x, card.y + 40, card.w, 280, 20);
      ctx.fillStyle = 'rgba(18,22,58,0.72)';
      ctx.fill();
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(step.t, W / 2, card.y + 110);
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      wrapText(step.d, W / 2, card.y + 160, card.w - 48, 24);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText((tutI + 1) + ' / ' + TUTORIAL.length, W / 2, card.y + 250);
      var skip = { x: card.x + 20, y: card.y + 360, w: (card.w - 52) / 2, h: 48 };
      var next = { x: skip.x + skip.w + 12, y: skip.y, w: skip.w, h: 48 };
      drawButton(skip, '跳过', 'ghost');
      drawButton(next, tutI === TUTORIAL.length - 1 ? '明白了，开始！' : '下一步', 'accent');
      addHit(skip, 'tutSkip');
      addHit(next, 'tutNext');
    }

    function drawLevels() {
      hits = [];
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('选择关卡', W / 2, insets.top + 36);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('★ ' + totalStars() + '/' + (LEVEL_COUNT * 3) + '    金币 ' + P.coins + (hs() ? '    最佳 ' + hs() : ''), W / 2, insets.top + 62);
      var pad = 16 + insets.left;
      var width = W - pad - 16 - insets.right;
      var cols = 5;
      var gap = 8;
      var cw = (width - gap * (cols - 1)) / cols;
      var ch = 58;
      var gx = pad, gy = insets.top + 80;
      var i;
      for (i = 0; i < LEVEL_COUNT; i++) {
        var col = i % cols, row = Math.floor(i / cols);
        var r = { x: gx + col * (cw + gap), y: gy + row * (ch + gap), w: cw, h: ch };
        var ok = unlocked(i);
        roundedRect(ctx, r.x, r.y, r.w, r.h, 12);
        ctx.fillStyle = ok ? (isBoss(i) ? 'rgba(255,213,79,0.28)' : 'rgba(255,255,255,0.16)') : 'rgba(255,255,255,0.06)';
        ctx.fill();
        ctx.fillStyle = ok ? '#fff' : 'rgba(255,255,255,0.35)';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var lab = ok ? ((isBoss(i) ? '首 ' : '') + (i + 1)) : '锁';
        ctx.fillText(lab, r.x + r.w / 2, r.y + 20);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = ok ? '#ffd54f' : 'rgba(255,255,255,0.25)';
        ctx.fillText(ok ? starStr(P.stars[i] || 0) : ' ', r.x + r.w / 2, r.y + 40);
        if (ok) addHit(r, 'level', { i: i });
      }
      var shopY = gy + 3 * (ch + gap) + 16;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '13px sans-serif';
      ctx.fillText('升级（通关获得金币）', pad, shopY);
      var u, uw = (width - 8) / 2;
      for (u = 0; u < UPS.length; u++) {
        var item = UPS[u];
        var lvUp = up(item.k), max = item.max, cost = lvUp < max ? item.cost(lvUp) : 0;
        var need = item.stars && totalStars() < item.stars;
        var colu = u % 2, rowu = Math.floor(u / 2);
        var sr = { x: pad + colu * (uw + 8), y: shopY + 12 + rowu * 70, w: uw, h: 62 };
        var disabled = lvUp >= max || need;
        roundedRect(ctx, sr.x, sr.y, sr.w, sr.h, 12);
        ctx.fillStyle = disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.14)';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(item.name + '  ' + lvUp + '/' + max, sr.x + 10, sr.y + 22);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        var sub = lvUp >= max ? '已满级' : need ? ('需 ★' + item.stars) : ('金币 ' + cost + ' · ' + item.desc);
        ctx.fillText(sub, sr.x + 10, sr.y + 42);
        if (!disabled) addHit(sr, 'shop', { k: item.k });
      }
      var how = { x: pad, y: H - insets.bottom - 56, w: (width - 10) / 2, h: 44 };
      var home = { x: how.x + how.w + 10, y: how.y, w: how.w, h: 44 };
      drawButton(how, '再看教程', 'ghost');
      drawButton(home, '返回首页', 'ghost');
      addHit(how, 'how');
      addHit(home, 'home');
    }

    function drawBoard(L) {
      var b = L.board;
      var n = N, size = b.size, s = size / n;
      var bw = boxWidth(n), bs = boxSize(n), i;
      roundedRect(ctx, b.x - 4, b.y - 4, size + 8, size + 8, 12);
      ctx.fillStyle = '#e8eaf6';
      ctx.fill();
      ctx.strokeStyle = '#1565c0';
      ctx.lineWidth = 3;
      ctx.stroke();
      var r, c;
      for (r = 0; r < n; r++) {
        for (c = 0; c < n; c++) {
          var x = b.x + c * s, y = b.y + r * s;
          var v = grid[r][c];
          var bad = v && !cellOk(grid, n, r, c);
          var isSel = sel === r * n + c;
          if (fixed[r][c]) ctx.fillStyle = '#c5cae9';
          else if (bad) ctx.fillStyle = '#ffcdd2';
          else if (isSel) ctx.fillStyle = '#fff8e1';
          else ctx.fillStyle = '#e8eaf6';
          ctx.fillRect(x + 0.5, y + 0.5, s - 1, s - 1);
          if (isSel) {
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
          }
          if (v) {
            ctx.fillStyle = bad ? '#b71c1c' : fixed[r][c] ? '#0d47a1' : '#1a237e';
            ctx.font = 'bold ' + Math.floor(s * (n >= 9 ? 0.46 : 0.5)) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(v), x + s / 2, y + s / 2 + 1);
          }
          addHit({ x: x, y: y, w: s, h: s }, 'cell', { r: r, c: c });
        }
      }
      ctx.strokeStyle = '#9fa8da';
      ctx.lineWidth = 1;
      for (i = 1; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(b.x + i * s, b.y);
        ctx.lineTo(b.x + i * s, b.y + size);
        ctx.moveTo(b.x, b.y + i * s);
        ctx.lineTo(b.x + size, b.y + i * s);
        ctx.stroke();
      }
      ctx.strokeStyle = '#1565c0';
      ctx.lineWidth = 2.2;
      for (i = 0; i <= n; i++) {
        if (i % bw === 0) {
          ctx.beginPath();
          ctx.moveTo(b.x + i * s, b.y);
          ctx.lineTo(b.x + i * s, b.y + size);
          ctx.stroke();
        }
        if (i % bs === 0) {
          ctx.beginPath();
          ctx.moveTo(b.x, b.y + i * s);
          ctx.lineTo(b.x + size, b.y + i * s);
          ctx.stroke();
        }
      }
    }

    function drawPad(L) {
      var box = L.padBox, n = N;
      var cols = n <= 6 ? n : 5;
      var rows = Math.ceil(n / cols);
      var gap = 6;
      var bw = (box.w - gap * (cols - 1)) / cols;
      var bh = Math.min(48, (box.h - gap * (rows - 1)) / rows);
      var i;
      for (i = 1; i <= n; i++) {
        var col = (i - 1) % cols, row = Math.floor((i - 1) / cols);
        var r = { x: box.x + col * (bw + gap), y: box.y + row * (bh + gap), w: bw, h: bh };
        roundedRect(ctx, r.x, r.y, r.w, r.h, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fill();
        ctx.fillStyle = '#1a237e';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i), r.x + r.w / 2, r.y + r.h / 2 + 1);
        addHit(r, 'num', { n: i });
      }
    }

    function drawPlay() {
      hits = [];
      var L = layoutPlay();
      var title = boss ? ('首领 · ' + boss.name) : (N + '×' + N + ' 数独');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('第 ' + (lv + 1) + ' 关', L.topBar.x, L.topBar.y + 24);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText('生命 ' + lives + '   格 ' + filledCount() + '/' + (N * N) + '   分 ' + score, L.topBar.x, L.topBar.y + 42);
      var muteBtn = { x: L.topBar.x + L.topBar.w - 100, y: L.topBar.y, w: 44, h: 44 };
      var pauseBtn = { x: L.topBar.x + L.topBar.w - 48, y: L.topBar.y, w: 44, h: 44 };
      drawIconBtn(muteBtn, muted ? '静' : '音');
      drawIconBtn(pauseBtn, '停');
      addHit(muteBtn, 'mute');
      addHit(pauseBtn, 'pause');
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffd54f';
      ctx.font = '13px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, L.subBar.x, L.subBar.y + 8);
      var pw = Math.min(140, L.subBar.w * 0.36);
      var px = L.subBar.x + L.subBar.w / 2 - pw / 2 + 10;
      var py = L.subBar.y + 14;
      roundedRect(ctx, px, py, pw, 8, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
      var ratio = filledCount() / (N * N);
      if (ratio > 0) {
        roundedRect(ctx, px, py, Math.max(6, pw * ratio), 8, 4);
        var pg = ctx.createLinearGradient(px, py, px + pw, py);
        pg.addColorStop(0, '#ffd34d');
        pg.addColorStop(1, '#ff5fa2');
        ctx.fillStyle = pg;
        ctx.fill();
      }
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.fillText('时 ' + Math.ceil(timeLeft) + '   提示 ' + hints, L.subBar.x + L.subBar.w, L.subBar.y + 18);
      drawBoard(L);
      drawPad(L);
      var aw = (L.actions.w - 16) / 3;
      var erase = { x: L.actions.x, y: L.actions.y, w: aw, h: 46 };
      var hintB = { x: L.actions.x + aw + 8, y: L.actions.y, w: aw, h: 46 };
      var checkB = { x: L.actions.x + (aw + 8) * 2, y: L.actions.y, w: aw, h: 46 };
      drawButton(erase, '清除', 'ghost');
      drawButton(hintB, '提示', 'ghost');
      drawButton(checkB, '检查', 'ghost');
      addHit(erase, 'erase');
      addHit(hintB, 'hint');
      addHit(checkB, 'check');
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = '13px sans-serif';
      ctx.fillText('每行每列每宫 1-' + N + ' 不重复', L.hint.x + L.hint.w / 2, L.hint.y + 12);
    }

    function drawOverlayChrome(title, bodyLines, buttons) {
      ctx.fillStyle = 'rgba(10,12,32,0.72)';
      ctx.fillRect(0, 0, W, H);
      var w = Math.min(340, W - 40);
      var bh = 46;
      var bodyTop = 72;
      var bodyH = bodyTop + bodyLines.length * 26 + 18;
      var h = bodyH + buttons.length * (bh + 10) + 20;
      var x = (W - w) / 2, y = Math.max(insets.top + 20, (H - h) / 2 - 10);
      roundedRect(ctx, x, y, w, h, 22);
      ctx.fillStyle = '#1b2048';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(title, W / 2, y + 44);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      var i;
      for (i = 0; i < bodyLines.length; i++) ctx.fillText(bodyLines[i], W / 2, y + bodyTop + i * 26);
      var bw = w - 48, by = y + bodyH;
      for (i = 0; i < buttons.length; i++) {
        var r = { x: x + 24, y: by + i * (bh + 10), w: bw, h: bh };
        drawButton(r, buttons[i].label, buttons[i].kind || 'accent');
        addHit(r, buttons[i].id);
      }
    }

    function drawPause() {
      drawPlay();
      var kept = hits.slice();
      hits = kept.filter(function (h) { return h.id === 'mute'; });
      var label = '第 ' + (lv + 1) + ' 关' + (isBoss(lv) ? ' · 首领关' : '');
      drawOverlayChrome('已暂停', [label, '计时已暂停，进度保留'], [
        { id: 'resume', label: '继续', kind: 'accent' },
        { id: 'restart', label: '重开本关', kind: 'ghost' },
        { id: 'menu', label: '返回选关', kind: 'ghost' }
      ]);
    }

    function drawOver() {
      drawPlay();
      hits = [];
      var title, lines;
      if (lastWin) {
        title = isBoss(lv) ? '击败首领！' : '过关！';
        lines = [starStr(P.stars[lv] || 1), overWhy, '金币 +' + overGain + '    本关最佳 ' + (P.best[lv] || 0), '得分 ' + score];
      } else {
        title = '挑战失败';
        lines = ['☆☆☆', overWhy, '安慰金 +' + overGain + '    可在选关页升级后再战', '得分 ' + score];
      }
      var buttons = [];
      if (lastWin && lv + 1 < LEVEL_COUNT) buttons.push({ id: 'next', label: isBoss(lv + 1) ? '挑战首领' : '下一关', kind: 'accent' });
      buttons.push({ id: 'again', label: '再玩一次', kind: lastWin && lv + 1 < LEVEL_COUNT ? 'ghost' : 'accent' });
      buttons.push({ id: 'menu', label: '返回选关', kind: 'ghost' });
      drawOverlayChrome(title, lines, buttons);
    }

    function drawToast() {
      if (!toast.text || nowMs > toast.until) return;
      ctx.font = 'bold 15px sans-serif';
      var tw = Math.min(W - 40, ctx.measureText(toast.text).width + 36);
      var x = (W - tw) / 2, y = insets.top + 72;
      roundedRect(ctx, x, y, tw, 36, 18);
      ctx.fillStyle = 'rgba(10,8,30,0.92)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toast.text, W / 2, y + 19);
    }

    function render() {
      hits = [];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStage();
      if (screen === 'start') drawStart();
      else if (screen === 'tutorial') drawTutorial();
      else if (screen === 'levels') drawLevels();
      else if (screen === 'play') drawPlay();
      else if (screen === 'pause') drawPause();
      else if (screen === 'over') drawOver();
      drawToast();
      lastRender.fills = hits.length;
      lastRender.screen = screen;
    }

    function buy(k) {
      var item = null, i;
      for (i = 0; i < UPS.length; i++) if (UPS[i].k === k) item = UPS[i];
      if (!item) return false;
      var lvUp = up(item.k);
      if (lvUp >= item.max) return false;
      if (item.stars && totalStars() < item.stars) return false;
      var cost = item.cost(lvUp);
      if (P.coins < cost) { toastMsg('金币不够：通关赚取'); sfx('bad'); return false; }
      P.coins -= cost;
      P.up[item.k] = lvUp + 1;
      saveProg();
      sfx('coin');
      toastMsg(item.name + ' 升到 ' + (lvUp + 1) + ' 级');
      return true;
    }

    function handle(id, data) {
      if (id === 'start') {
        sfx('tap');
        if (!P.tut) { tutI = 0; tutThen = 'levels'; screen = 'tutorial'; }
        else screen = 'levels';
        return;
      }
      if (id === 'tutNext') {
        sfx('tap');
        if (tutI < TUTORIAL.length - 1) tutI++;
        else { P.tut = 1; saveProg(); screen = tutThen; }
        return;
      }
      if (id === 'tutSkip') { sfx('tap'); P.tut = 1; saveProg(); screen = tutThen; return; }
      if (id === 'how') { sfx('tap'); tutI = 0; tutThen = 'levels'; screen = 'tutorial'; return; }
      if (id === 'home') { sfx('tap'); screen = 'start'; return; }
      if (id === 'level') { startLevel(data.i); return; }
      if (id === 'shop') { buy(data.k); return; }
      if (id === 'mute') { setMute(!muted); if (!muted) sfx('tap'); return; }
      if (id === 'pause') { pause(); return; }
      if (id === 'resume') { sfx('tap'); resume(); return; }
      if (id === 'restart' || id === 'again') { startLevel(lv); return; }
      if (id === 'menu') { sfx('tap'); goMenu(); return; }
      if (id === 'next') { startLevel(Math.min(LEVEL_COUNT - 1, lv + 1)); return; }
      if (id === 'cell') {
        if (screen !== 'play' || ended) return;
        if (fixed[data.r][data.c]) return;
        sel = data.r * N + data.c;
        sfx('tap');
        return;
      }
      if (id === 'num') { fillSel(data.n); return; }
      if (id === 'erase') { eraseSel(); return; }
      if (id === 'hint') { doHint(); return; }
      if (id === 'check') { doCheck(); return; }
    }

    function pointerToLogical(p) {
      return { x: p.x, y: p.y };
    }

    function onPointer(p) {
      var pt = pointerToLogical(p);
      var i, h;
      for (i = hits.length - 1; i >= 0; i--) {
        h = hits[i];
        if (hitRect(pt.x, pt.y, h)) {
          handle(h.id, h.data);
          render();
          return h;
        }
      }
      return null;
    }

    function tick(ts) {
      if (!running) return;
      nowMs = ts;
      var dt = Math.min(0.033, (ts - (lastTs || ts)) / 1000);
      lastTs = ts;
      if (screen === 'play' && !ended) {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endLv(false, '时间到'); }
      }
      render();
      raf = platform.raf(tick);
    }

    loadProg();
    resize();
    nowMs = platform.now ? platform.now() : 0;
    lastTs = nowMs;
    render();
    if (!opts.manualLoop) raf = platform.raf(tick);

    if (platform.onTouchStart) {
      platform.onTouchStart(function (p) { onPointer(p); });
    }
    if (platform.onResize) platform.onResize(function () { resize(); render(); });
    if (platform.onHide) platform.onHide(function () { pause(); render(); });

    return {
      render: render,
      resize: resize,
      pointer: onPointer,
      startLevel: startLevel,
      fillSel: fillSel,
      eraseSel: eraseSel,
      doCheck: doCheck,
      doHint: doHint,
      pause: pause,
      resume: resume,
      buy: buy,
      setScreen: function (s) { screen = s; },
      setSel: function (r, c) { sel = r * N + c; },
      setMute: setMute,
      saveProg: saveProg,
      loadProg: loadProg,
      stop: function () { running = false; if (platform.caf && raf) platform.caf(raf); },
      advance: function (dtSec) {
        nowMs += dtSec * 1000;
        if (screen === 'play' && !ended) {
          timeLeft -= dtSec;
          if (timeLeft <= 0) { timeLeft = 0; endLv(false, '时间到'); }
        }
        render();
      },
      layoutPlay: layoutPlay,
      mapPoint: pointerToLogical,
      getHits: function () { return hits.slice(); },
      getState: function () {
        return {
          screen: screen,
          lv: lv,
          N: N,
          grid: cloneGrid(grid),
          sol: cloneGrid(sol),
          fixed: cloneGrid(fixed),
          lives: lives,
          score: score,
          timeLeft: timeLeft,
          hints: hints,
          mistakes: mistakes,
          sel: sel,
          ended: ended,
          boss: boss,
          filled: filledCount(),
          need: N * N,
          muted: muted,
          tutI: tutI,
          progress: { stars: P.stars.slice(), best: P.best.slice(), coins: P.coins, up: Object.assign({}, P.up), tut: P.tut },
          size: { W: W, H: H, dpr: dpr, insets: Object.assign({}, insets) },
          lastWin: lastWin,
          platform: platform.name || ''
        };
      }
    };
  }

  return {
    LEVELS: LEVELS,
    LEVEL_COUNT: LEVEL_COUNT,
    UPS: UPS,
    TUTORIAL: TUTORIAL,
    boxSize: boxSize,
    boxWidth: boxWidth,
    genSol: genSol,
    cellOk: cellOk,
    cellInBoxOk: cellInBoxOk,
    levelSpec: levelSpec,
    isBoss: isBoss,
    starStr: starStr,
    parseProgress: parseProgress,
    makeSeededRng: makeSeededRng,
    createApp: createApp
  };
});
