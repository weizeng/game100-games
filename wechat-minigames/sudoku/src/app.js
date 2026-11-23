/**
 * 逻辑谜题：数独、数岛搭桥、围圈数谜共用同一 Canvas 核心（无 DOM）。
 * 微信小游戏与本地预览共用这份代码；平台差异只通过 platform 注入。
 * 全部关卡与脚本都在包内，运行时不下载 JS。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./sudoku-app.js'), require('./levels-data.js'));
  } else {
    root.LogicApp = factory(root.SudokuApp, root.LogicLevels);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Sudoku, Levels) {
  'use strict';

  if (!Sudoku || !Levels) {
    throw new Error('LogicApp 需要先加载 sudoku-app.js 与 levels-data.js');
  }

  var SUDOKU_LEVELS = Sudoku.LEVELS;
  var HASHI_LEVELS = Levels.HASHI_LEVELS;
  var SLITHER_LEVELS = Levels.SLITHER_LEVELS;
  var UPS = Sudoku.UPS;
  var boxSize = Sudoku.boxSize;
  var boxWidth = Sudoku.boxWidth;
  var genSol = Sudoku.genSol;
  var cellOk = Sudoku.cellOk;
  var cellInBoxOk = Sudoku.cellInBoxOk;
  var sudokuSpec = Sudoku.levelSpec;
  var sudokuBoss = Sudoku.isBoss;
  var starStr = Sudoku.starStr;
  var makeSeededRng = Sudoku.makeSeededRng;

  var PROG_KEY = 'g100_logic_v1_prog';
  var SESSION_KEY = 'g100_logic_v1_session';
  var MUTE_KEY = 'g100_mute';

  var FONT = {
    title: 40,
    heading: 26,
    sub: 18,
    body: 17,
    button: 18,
    hud: 17,
    caption: 15,
    star: 14
  };

  var MODES = [
    { id: 'sudoku', title: '数独', icon: '数', blurb: '行列宫内数字不重复。15 关由 4×4 走到 9×9。', count: SUDOKU_LEVELS.length, color: '#ff8fb8' },
    { id: 'hashi', title: '数岛搭桥', icon: '桥', blurb: '单双桥连接岛屿，数字等于桥数，全图连通且桥不相交。', count: HASHI_LEVELS.length, color: '#ffd54f' },
    { id: 'slither', title: '围圈数谜', icon: '圈', blurb: '沿点阵画一条闭合回路，数字等于邻接边数。', count: SLITHER_LEVELS.length, color: '#80deea' }
  ];

  var COLLECT_TUT = [
    { t: '三种玩法', d: '大厅里是数独、数岛搭桥和围圈数谜，都是同一类逻辑益智，共用视觉、关卡进度和返回。' },
    { t: '进度与续局', d: '通关会解锁下一关。中途回大厅，或下次打开，都可以用「继续本局」回到刚才的棋盘。' },
    { t: '撤销与容错', d: '三种玩法都提供撤销或清除。搭桥交叉、超额，或回路边让数字超过线索，都会被拒绝并可以改。' }
  ];

  var MODE_TUT = {
    sudoku: [
      { t: '选格', d: '点空白格子选中。' },
      { t: '填数', d: '点下方数字填入，也可用清除或撤销改回。' },
      { t: '规则', d: '行、列、宫内数字不重复。检查会按解答核对，错了扣命。' },
      { t: '首领关', d: '第 5 / 10 / 15 关盘面更大、已知更少、时限更紧。' }
    ],
    hashi: [
      { t: '选岛', d: '先点一座岛，再点同一行或同一列的另一座岛，就会搭上一座桥。' },
      { t: '单桥与双桥', d: '再点同一对岛屿，桥会变成双桥；再点一次则拆除。数字必须等于连出的桥数。' },
      { t: '连通', d: '桥不能交叉、不能穿过别的岛。所有岛最终要连成一体。随时可以撤销。' },
      { t: '首领关', d: '第 6 / 10 / 15 关岛屿更多，需要同时照顾数字和连通。' }
    ],
    slither: [
      { t: '画边', d: '点相邻两点之间的边：实线、×、空白循环切换。' },
      { t: '数字', d: '格子里的数字等于它四周实线的条数。0 表示四周都不能画线。' },
      { t: '一条回路', d: '全部数字满足后，必须是一条没有分叉、没有端点、也没有双回路的闭合圈。随时可以撤销。' },
      { t: '必经格', d: '部分关卡会标出必经格，回路必须从该格穿过至少两条边。' }
    ]
  };

  function defaultRng() { return Math.random(); }

  function shuffle(a, rng) {
    rng = rng || defaultRng;
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = (rng() * (i + 1)) | 0;
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function cloneGrid(g) {
    if (!g) return g;
    return g.map(function (row) { return row.slice(); });
  }

  function cloneBridges(list) {
    return (list || []).map(function (b) { return { a: b.a, b: b.b, n: b.n }; });
  }

  function modeMeta(id) {
    var i;
    for (i = 0; i < MODES.length; i++) if (MODES[i].id === id) return MODES[i];
    return MODES[0];
  }

  function levelCount(mode) {
    if (mode === 'hashi') return HASHI_LEVELS.length;
    if (mode === 'slither') return SLITHER_LEVELS.length;
    return SUDOKU_LEVELS.length;
  }

  function isBoss(mode, i) {
    if (mode === 'sudoku') return sudokuBoss(i);
    if (mode === 'hashi') return !!(HASHI_LEVELS[i] && HASHI_LEVELS[i].boss);
    if (mode === 'slither') return !!(SLITHER_LEVELS[i] && SLITHER_LEVELS[i].boss);
    return false;
  }

  function levelTitle(mode, i) {
    if (mode === 'hashi' && HASHI_LEVELS[i]) return HASHI_LEVELS[i].name;
    if (mode === 'slither' && SLITHER_LEVELS[i]) return SLITHER_LEVELS[i].name || ('第 ' + (i + 1) + ' 关');
    if (mode === 'sudoku' && sudokuBoss(i)) return sudokuSpec(i).name;
    return '第 ' + (i + 1) + ' 关';
  }

  function emptyModeProg() { return { stars: [], best: [] }; }

  function emptyProgress() {
    return {
      tut: 0,
      modeTut: { sudoku: 0, hashi: 0, slither: 0 },
      coins: 0,
      up: {},
      modes: {
        sudoku: emptyModeProg(),
        hashi: emptyModeProg(),
        slither: emptyModeProg()
      }
    };
  }

  function parseProgress(raw) {
    var P = emptyProgress();
    if (!raw) return P;
    try {
      var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!o || typeof o !== 'object') return P;
      P.tut = o.tut || 0;
      P.coins = o.coins || 0;
      P.up = o.up || {};
      if (o.modeTut && typeof o.modeTut === 'object') {
        P.modeTut.sudoku = o.modeTut.sudoku || 0;
        P.modeTut.hashi = o.modeTut.hashi || 0;
        P.modeTut.slither = o.modeTut.slither || 0;
      }
      ['sudoku', 'hashi', 'slither'].forEach(function (id) {
        var src = (o.modes && o.modes[id]) || {};
        P.modes[id].stars = src.stars || [];
        P.modes[id].best = src.best || [];
      });
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

  function hashiCurN(islands, bridges, i) {
    var s = 0, k;
    for (k = 0; k < bridges.length; k++) {
      if (bridges[k].a === i || bridges[k].b === i) s += bridges[k].n;
    }
    return s;
  }

  function hashiFindBr(bridges, a, b) {
    var i = Math.min(a, b), j = Math.max(a, b), k;
    for (k = 0; k < bridges.length; k++) if (bridges[k].a === i && bridges[k].b === j) return bridges[k];
    return null;
  }

  function hashiAligned(islands, a, b) {
    return islands[a].x === islands[b].x || islands[a].y === islands[b].y;
  }

  function hashiCrosses(A, B, C, D) {
    var h1 = A.y === B.y, h2 = C.y === D.y;
    if (h1 === h2) return false;
    if (h1) {
      return A.y > Math.min(C.y, D.y) && A.y < Math.max(C.y, D.y) && C.x > Math.min(A.x, B.x) && C.x < Math.max(A.x, B.x);
    }
    return A.x > Math.min(C.x, D.x) && A.x < Math.max(C.x, D.x) && C.y > Math.min(A.y, B.y) && C.y < Math.max(A.y, B.y);
  }

  function hashiCanLink(islands, bridges, a, b) {
    if (a === b) return '请选择另一座岛';
    if (!hashiAligned(islands, a, b)) return '必须同一行或同一列';
    var A = islands[a], B = islands[b], k, P;
    for (k = 0; k < islands.length; k++) {
      if (k === a || k === b) continue;
      P = islands[k];
      if (A.y === B.y && P.y === A.y && P.x > Math.min(A.x, B.x) && P.x < Math.max(A.x, B.x)) return '中间有岛挡住';
      if (A.x === B.x && P.x === A.x && P.y > Math.min(A.y, B.y) && P.y < Math.max(A.y, B.y)) return '中间有岛挡住';
    }
    for (k = 0; k < bridges.length; k++) {
      var br = bridges[k];
      if ((br.a === a && br.b === b) || (br.a === b && br.b === a)) continue;
      if (hashiCrosses(A, B, islands[br.a], islands[br.b])) return '桥会交叉';
    }
    return '';
  }

  function hashiConnected(islands, bridges) {
    if (!islands.length) return true;
    var g = islands.map(function () { return []; });
    var i, seen, q, u, v, k;
    for (i = 0; i < bridges.length; i++) {
      if (!bridges[i].n) continue;
      g[bridges[i].a].push(bridges[i].b);
      g[bridges[i].b].push(bridges[i].a);
    }
    seen = {}; seen[0] = 1; q = [0];
    while (q.length) {
      u = q.pop();
      for (k = 0; k < g[u].length; k++) {
        v = g[u][k];
        if (!seen[v]) { seen[v] = 1; q.push(v); }
      }
    }
    return Object.keys(seen).length === islands.length;
  }

  function hashiWin(islands, bridges) {
    var i;
    for (i = 0; i < islands.length; i++) if (hashiCurN(islands, bridges, i) !== islands[i].n) return false;
    return hashiConnected(islands, bridges);
  }

  function slitherCellCount(HZ, VZ, r, c) {
    return (HZ[r][c] === 1 ? 1 : 0) + (HZ[r + 1][c] === 1 ? 1 : 0) + (VZ[r][c] === 1 ? 1 : 0) + (VZ[r][c + 1] === 1 ? 1 : 0);
  }

  function slitherClueOk(puz, HZ, VZ, r, c) {
    var cl = puz.clues[r][c];
    if (cl == null) return true;
    return slitherCellCount(HZ, VZ, r, c) === cl;
  }

  function slitherAllCluesOk(puz, HZ, VZ) {
    var r, c;
    for (r = 0; r < puz.h; r++) for (c = 0; c < puz.w; c++) if (!slitherClueOk(puz, HZ, VZ, r, c)) return false;
    return true;
  }

  function slitherOverClue(puz, HZ, VZ) {
    var r, c, cl;
    for (r = 0; r < puz.h; r++) {
      for (c = 0; c < puz.w; c++) {
        cl = puz.clues[r][c];
        if (cl == null) continue;
        if (slitherCellCount(HZ, VZ, r, c) > cl) return true;
      }
    }
    return false;
  }

  function slitherMustOk(puz, HZ, VZ) {
    var must = puz.must || [], i;
    for (i = 0; i < must.length; i++) {
      if (slitherCellCount(HZ, VZ, must[i][0], must[i][1]) < 2) return false;
    }
    return true;
  }

  function slitherLoopInfo(puz, HZ, VZ) {
    var w = puz.w, h = puz.h;
    var deg = [], r, c;
    for (r = 0; r <= h; r++) {
      deg[r] = [];
      for (c = 0; c <= w; c++) deg[r][c] = 0;
    }
    for (r = 0; r <= h; r++) for (c = 0; c < w; c++) if (HZ[r][c] === 1) { deg[r][c]++; deg[r][c + 1]++; }
    for (r = 0; r < h; r++) for (c = 0; c <= w; c++) if (VZ[r][c] === 1) { deg[r][c]++; deg[r + 1][c]++; }
    for (r = 0; r <= h; r++) for (c = 0; c <= w; c++) if (deg[r][c] !== 0 && deg[r][c] !== 2) return { ok: false, reason: '有分叉或端点' };
    var start = null, used = 0;
    for (r = 0; r <= h; r++) for (c = 0; c <= w; c++) if (deg[r][c] === 2) { used++; if (!start) start = [r, c]; }
    if (!start) return { ok: false, reason: '还没有回路' };
    r = start[0]; c = start[1];
    var pr = -1, pc = -1, steps = 0, cand, nxt, n, i;
    while (true) {
      cand = [];
      if (c < w && HZ[r][c] === 1) cand.push([r, c + 1]);
      if (c > 0 && HZ[r][c - 1] === 1) cand.push([r, c - 1]);
      if (r < h && VZ[r][c] === 1) cand.push([r + 1, c]);
      if (r > 0 && VZ[r - 1][c] === 1) cand.push([r - 1, c]);
      nxt = null;
      for (i = 0; i < cand.length; i++) {
        n = cand[i];
        if (!(n[0] === pr && n[1] === pc)) { nxt = n; break; }
      }
      if (!nxt) return { ok: false, reason: '回路中断' };
      pr = r; pc = c; r = nxt[0]; c = nxt[1]; steps++;
      if (r === start[0] && c === start[1]) break;
      if (steps > 400) return { ok: false, reason: '回路异常' };
    }
    if (steps !== used) return { ok: false, reason: '存在双回路' };
    return { ok: true, len: steps };
  }

  function createApp(platform, opts) {
    opts = opts || {};
    var canvas = platform.getCanvas();
    var ctx = canvas.getContext('2d');
    var W = 390, H = 844, dpr = 1;
    var insets = { top: 20, bottom: 16, left: 0, right: 0 };
    var screen = 'start';
    var tutI = 0;
    var tutThen = 'lobby';
    var tutKind = 'collect';
    var P = emptyProgress();
    var muted = false;
    var toast = { text: '', until: 0 };
    var nowMs = 0;
    var lastTs = 0;
    var raf = 0;
    var ended = false;
    var mode = 'sudoku';
    var lv = 0;
    var lastWin = false;
    var overWhy = '';
    var overGain = 0;
    var hits = [];
    var running = true;
    var audio = null;
    var rngFn = opts.rng || defaultRng;
    var session = null;

    var N = 4, sol = [], grid = [], fixed = [], lives = 3, score = 0;
    var timeLeft = 0, hints = 2, mistakes = 0, sel = -1, boss = null;
    var sudokuHist = [];

    var islands = [];
    var bridges = [];
    var hashiHist = [];

    var puz = null;
    var HZ = [];
    var VZ = [];
    var slitherHist = [];
    var hintsLeft = 2;

    function storageGet(k) {
      try { return platform.storageGet(k); } catch (e) { return null; }
    }
    function storageSet(k, v) {
      try { platform.storageSet(k, String(v)); } catch (e) {}
    }
    function loadProg() {
      P = parseProgress(storageGet(PROG_KEY));
      muted = storageGet(MUTE_KEY) === '1';
      session = parseSession(storageGet(SESSION_KEY));
    }
    function saveProg() { storageSet(PROG_KEY, JSON.stringify(P)); }
    function up(k) { return P.up[k] || 0; }
    function mp() { return P.modes[mode] || P.modes.sudoku; }
    function totalStarsAll() {
      var s = 0, id, i, arr;
      for (id in P.modes) {
        if (!Object.prototype.hasOwnProperty.call(P.modes, id)) continue;
        arr = P.modes[id].stars || [];
        for (i = 0; i < arr.length; i++) s += arr[i] || 0;
      }
      return s;
    }
    function unlocked(md, i) {
      var stars = P.modes[md].stars;
      return i === 0 || (stars[i - 1] || 0) > 0;
    }

    function parseSession(raw) {
      if (!raw) return null;
      try {
        var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!o || !o.mode || typeof o.lv !== 'number') return null;
        if (o.lv < 0 || o.lv >= levelCount(o.mode)) return null;
        return o;
      } catch (e) { return null; }
    }

    function clearSession() {
      session = null;
      try { storageSet(SESSION_KEY, ''); } catch (e) {}
    }

    function capturePayload() {
      if (mode === 'sudoku') {
        return {
          grid: cloneGrid(grid), sol: cloneGrid(sol), fixed: cloneGrid(fixed),
          lives: lives, score: score, timeLeft: timeLeft, hints: hints,
          mistakes: mistakes, sel: sel, hist: sudokuHist.map(function (h) {
            return { grid: cloneGrid(h.grid), fixed: cloneGrid(h.fixed), hints: h.hints };
          })
        };
      }
      if (mode === 'hashi') {
        return { bridges: cloneBridges(bridges), sel: sel, hist: hashiHist.map(cloneBridges), mistakes: mistakes, score: score };
      }
      return {
        HZ: cloneGrid(HZ), VZ: cloneGrid(VZ),
        hist: slitherHist.map(function (h) { return { HZ: cloneGrid(h.HZ), VZ: cloneGrid(h.VZ) }; }),
        mistakes: mistakes, score: score, hintsLeft: hintsLeft
      };
    }

    function saveSession() {
      if (ended || (screen !== 'play' && screen !== 'pause')) return;
      session = { mode: mode, lv: lv, payload: capturePayload(), savedAt: Date.now() };
      storageSet(SESSION_KEY, JSON.stringify(session));
    }

    function toastMsg(msg, ms) {
      toast.text = msg;
      toast.until = nowMs + (ms || 1400);
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

    function contentBox() {
      var pad = 18;
      return {
        x: pad + insets.left,
        y: insets.top + 10,
        w: W - pad * 2 - insets.left - insets.right,
        pad: pad
      };
    }

    function layoutPlay() {
      var box = contentBox();
      var x0 = box.x, width = box.w;
      var topBar = { x: x0, y: box.y, w: width, h: 52 };
      var subBar = { x: x0, y: box.y + 58, w: width, h: 28 };
      var actH = 52;
      var hintH = 32;
      var board, padBox, actions, hint, boardMax, footer, padH;
      if (mode === 'sudoku') {
        padH = N <= 4 ? 60 : N <= 6 ? 56 : 104;
        footer = padH + actH + hintH + insets.bottom + 18;
        boardMax = Math.max(180, Math.min(width, H - (subBar.y + 36) - footer));
        board = { x: x0 + (width - boardMax) / 2, y: subBar.y + 36, w: boardMax, h: boardMax, size: boardMax };
        padBox = { x: x0, y: board.y + board.size + 12, w: width, h: padH };
        actions = { x: x0, y: padBox.y + padH + 8, w: width, h: actH };
        hint = { x: x0, y: actions.y + actH + 4, w: width, h: hintH };
      } else {
        footer = actH + hintH + insets.bottom + 18;
        boardMax = Math.max(180, Math.min(width, H - (subBar.y + 36) - footer));
        board = { x: x0 + (width - boardMax) / 2, y: subBar.y + 36, w: boardMax, h: boardMax, size: boardMax };
        padBox = { x: x0, y: board.y + board.size + 12, w: width, h: 0 };
        actions = { x: x0, y: board.y + board.size + 12, w: width, h: actH };
        hint = { x: x0, y: actions.y + actH + 6, w: width, h: hintH };
      }
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

    function resetCommon(i, isBossLv, bossName) {
      lv = i;
      ended = false;
      score = 0;
      mistakes = 0;
      sel = -1;
      boss = isBossLv ? { name: bossName || '首领关' } : null;
      lastTs = nowMs || (platform.now ? platform.now() : 0);
    }

    function startSudoku(i, inject) {
      var L = SUDOKU_LEVELS[i];
      var b = L.boss || L;
      resetCommon(i, !!L.boss, b.name);
      N = b.n;
      lives = 3 + up('life');
      hints = 2 + up('hint');
      timeLeft = b.time + up('time') * 15;
      sudokuHist = [];
      if (inject && inject.sol && inject.grid) {
        sol = cloneGrid(inject.sol);
        grid = cloneGrid(inject.grid);
      } else {
        sol = genSol(N, inject && inject.rng ? inject.rng : rngFn);
        grid = cloneGrid(sol);
        var cells = [], r, c, k, dig;
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) cells.push([r, c]);
        shuffle(cells, inject && inject.rng ? inject.rng : rngFn);
        dig = Math.floor(N * N * b.holes);
        for (k = 0; k < dig; k++) grid[cells[k][0]][cells[k][1]] = 0;
      }
      fixed = [];
      var rr, cc;
      for (rr = 0; rr < N; rr++) {
        fixed[rr] = [];
        for (cc = 0; cc < N; cc++) fixed[rr][cc] = !!grid[rr][cc];
      }
      if (inject && inject.lives != null) lives = inject.lives;
      if (inject && inject.timeLeft != null) timeLeft = inject.timeLeft;
      if (inject && inject.hints != null) hints = inject.hints;
      if (inject && inject.mistakes != null) mistakes = inject.mistakes;
      if (inject && inject.score != null) score = inject.score;
      if (inject && inject.sel != null) sel = inject.sel;
      if (inject && inject.hist) sudokuHist = inject.hist.map(function (h) {
        return { grid: cloneGrid(h.grid), fixed: cloneGrid(h.fixed), hints: h.hints };
      });
    }

    function startHashi(i, inject) {
      var L = HASHI_LEVELS[i];
      resetCommon(i, !!L.boss, L.name);
      islands = L.islands.map(function (p) { return { x: p.x, y: p.y, n: p.n }; });
      bridges = [];
      hashiHist = [];
      timeLeft = 0;
      lives = 0;
      hints = 0;
      if (inject && inject.bridges) bridges = cloneBridges(inject.bridges);
      if (inject && inject.sel != null) sel = inject.sel;
      if (inject && inject.hist) hashiHist = inject.hist.map(cloneBridges);
      if (inject && inject.mistakes != null) mistakes = inject.mistakes;
      if (inject && inject.score != null) score = inject.score;
    }

    function emptyEdges(w, h) {
      var r, c, Hlines = [], Vlines = [];
      for (r = 0; r <= h; r++) {
        Hlines[r] = [];
        for (c = 0; c < w; c++) Hlines[r][c] = 0;
      }
      for (r = 0; r < h; r++) {
        Vlines[r] = [];
        for (c = 0; c <= w; c++) Vlines[r][c] = 0;
      }
      return { HZ: Hlines, VZ: Vlines };
    }

    function startSlither(i, inject) {
      var L = SLITHER_LEVELS[i];
      resetCommon(i, !!L.boss, L.name);
      puz = {
        w: L.w, h: L.h, clues: L.clues, must: L.must || [], trap: !!L.trap, name: L.name, boss: !!L.boss
      };
      var ev = emptyEdges(puz.w, puz.h);
      HZ = ev.HZ; VZ = ev.VZ;
      slitherHist = [];
      hintsLeft = 2;
      timeLeft = 0;
      lives = 0;
      hints = hintsLeft;
      if (inject && inject.HZ) HZ = cloneGrid(inject.HZ);
      if (inject && inject.VZ) VZ = cloneGrid(inject.VZ);
      if (inject && inject.hist) slitherHist = inject.hist.map(function (h) { return { HZ: cloneGrid(h.HZ), VZ: cloneGrid(h.VZ) }; });
      if (inject && inject.mistakes != null) mistakes = inject.mistakes;
      if (inject && inject.score != null) score = inject.score;
      if (inject && inject.hintsLeft != null) hintsLeft = inject.hintsLeft;
      hints = hintsLeft;
    }

    function startLevel(modeId, i, inject) {
      if (typeof modeId === 'number') { inject = i; i = modeId; modeId = 'sudoku'; }
      mode = modeId || 'sudoku';
      i = i | 0;
      if (mode === 'hashi') startHashi(i, inject);
      else if (mode === 'slither') startSlither(i, inject);
      else startSudoku(i, inject);
      screen = 'play';
      if (boss) {
        sfx('boss');
        toastMsg('首领关：' + boss.name, 1800);
      } else sfx('tap');
      saveSession();
      render();
    }

    function restoreSession() {
      if (!session) session = parseSession(storageGet(SESSION_KEY));
      if (!session) return false;
      startLevel(session.mode, session.lv, session.payload);
      return true;
    }

    function endLv(won, why) {
      if (ended) return;
      ended = true;
      clearSession();
      var title = levelTitle(mode, lv);
      overWhy = why || (won ? (boss ? ('完成 ' + title) : (modeMeta(mode).title + '完成')) : '失败');
      var prog = mp();
      if (won) {
        var st = 3;
        if (mode === 'sudoku') st = mistakes === 0 && lives >= 3 ? 3 : lives >= 2 ? 2 : 1;
        else st = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        lastWin = true;
        var old = prog.stars[lv] || 0;
        overGain = st * 4 + (old ? 0 : 6) + (isBoss(mode, lv) ? 8 : 0);
        P.coins += overGain;
        if (st > old) prog.stars[lv] = st;
        if (score > (prog.best[lv] || 0)) prog.best[lv] = score;
        saveProg();
        sfx('win');
      } else {
        lastWin = false;
        overGain = Math.min(3, lv > 0 ? 2 : 1);
        P.coins += overGain;
        saveProg();
        sfx('lose');
        if (platform.vibrate) platform.vibrate(120);
      }
      screen = 'over';
    }

    function pushSudokuHist() {
      sudokuHist.push({ grid: cloneGrid(grid), fixed: cloneGrid(fixed), hints: hints });
      if (sudokuHist.length > 80) sudokuHist.shift();
    }

    function checkSudokuWin() {
      var r, c;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (grid[r][c] !== sol[r][c]) return false;
      score += 80 + Math.floor(timeLeft) + N * 8;
      endLv(true);
      return true;
    }

    function fillSel(n) {
      if (screen !== 'play' || ended || mode !== 'sudoku' || sel < 0) return false;
      var r = (sel / N) | 0, c = sel % N;
      if (fixed[r][c]) return false;
      pushSudokuHist();
      grid[r][c] = n;
      sfx('tap');
      checkSudokuWin();
      saveSession();
      return true;
    }

    function eraseSel() {
      if (screen !== 'play' || ended || mode !== 'sudoku' || sel < 0) return false;
      var r = (sel / N) | 0, c = sel % N;
      if (fixed[r][c]) return false;
      if (!grid[r][c]) return false;
      pushSudokuHist();
      grid[r][c] = 0;
      sfx('tap');
      saveSession();
      return true;
    }

    function slitherHint() {
      if (hintsLeft <= 0) { toastMsg('提示用完'); return false; }
      var r, c, edges, e, i;
      for (r = 0; r < puz.h; r++) {
        for (c = 0; c < puz.w; c++) {
          if (puz.clues[r][c] !== 0) continue;
          edges = [['h', r, c], ['h', r + 1, c], ['v', r, c], ['v', r, c + 1]];
          for (i = 0; i < edges.length; i++) {
            e = edges[i];
            if (e[0] === 'h' && HZ[e[1]][e[2]] === 0) {
              slitherHist.push({ HZ: cloneGrid(HZ), VZ: cloneGrid(VZ) });
              HZ[e[1]][e[2]] = 2; hintsLeft--; hints = hintsLeft;
              toastMsg('已将一条不可能的边标✕');
              saveSession();
              return true;
            }
            if (e[0] === 'v' && VZ[e[1]][e[2]] === 0) {
              slitherHist.push({ HZ: cloneGrid(HZ), VZ: cloneGrid(VZ) });
              VZ[e[1]][e[2]] = 2; hintsLeft--; hints = hintsLeft;
              toastMsg('已将一条不可能的边标✕');
              saveSession();
              return true;
            }
          }
        }
      }
      toastMsg('先把数字为 0 的四周标✕');
      return false;
    }

    function doHint() {
      if (screen !== 'play' || ended) return false;
      if (mode === 'slither') return slitherHint();
      if (mode !== 'sudoku') { toastMsg('本玩法请用撤销'); return false; }
      if (hints <= 0) { toastMsg('提示用完'); return false; }
      var r, c;
      for (r = 0; r < N; r++) {
        for (c = 0; c < N; c++) {
          if (!grid[r][c]) {
            pushSudokuHist();
            grid[r][c] = sol[r][c];
            fixed[r][c] = true;
            hints--;
            sfx('coin');
            toastMsg('填入一格');
            checkSudokuWin();
            saveSession();
            return true;
          }
        }
      }
      return false;
    }

    function doCheck() {
      if (screen !== 'play' || ended) return { bad: 0, ok: false };
      if (mode === 'sudoku') {
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
        saveSession();
        return { bad: bad, ok: bad === 0 };
      }
      if (mode === 'hashi') {
        if (hashiWin(islands, bridges)) {
          score += 40 + islands.length * 4;
          endLv(true);
          return { bad: 0, ok: true };
        }
        sfx('bad');
        if (!hashiConnected(islands, bridges)) toastMsg('岛屿尚未全部连通');
        else toastMsg('还有岛屿的桥数不对');
        return { bad: 1, ok: false };
      }
      if (!slitherAllCluesOk(puz, HZ, VZ)) { sfx('bad'); toastMsg('数字尚未全部满足'); return { bad: 1, ok: false, reason: '数字尚未全部满足' }; }
      if (!slitherMustOk(puz, HZ, VZ)) { sfx('bad'); toastMsg('有必经格未被穿过'); return { bad: 1, ok: false, reason: '有必经格未被穿过' }; }
      var loop = slitherLoopInfo(puz, HZ, VZ);
      if (!loop.ok) { sfx('bad'); toastMsg(loop.reason); return { bad: 1, ok: false, reason: loop.reason }; }
      score += 40 + (boss ? 35 : 0) + puz.w * 4;
      endLv(true);
      return { bad: 0, ok: true };
    }

    function undo() {
      if (screen !== 'play' || ended) return false;
      if (mode === 'sudoku') {
        if (!sudokuHist.length) { toastMsg('无法撤销'); return false; }
        var sh = sudokuHist.pop();
        grid = cloneGrid(sh.grid);
        fixed = cloneGrid(sh.fixed);
        hints = sh.hints;
        sfx('tap');
        saveSession();
        return true;
      }
      if (mode === 'hashi') {
        if (!hashiHist.length) { toastMsg('无法撤销'); return false; }
        bridges = cloneBridges(hashiHist.pop());
        sel = -1;
        sfx('tap');
        saveSession();
        return true;
      }
      if (!slitherHist.length) { toastMsg('无法撤销'); return false; }
      var sl = slitherHist.pop();
      HZ = cloneGrid(sl.HZ);
      VZ = cloneGrid(sl.VZ);
      sfx('tap');
      saveSession();
      return true;
    }

    function linkHashi(a, b) {
      if (screen !== 'play' || ended || mode !== 'hashi') return { ok: false };
      var err = hashiCanLink(islands, bridges, a, b);
      if (err) {
        mistakes++;
        sfx('bad');
        toastMsg(err);
        if (platform.vibrate) platform.vibrate(40);
        if (mistakes > 8) endLv(false, '违规过多');
        return { ok: false, error: err };
      }
      hashiHist.push(cloneBridges(bridges));
      var br = hashiFindBr(bridges, a, b);
      if (!br) bridges.push({ a: Math.min(a, b), b: Math.max(a, b), n: 1 });
      else {
        br.n++;
        if (br.n > 2) {
          bridges = bridges.filter(function (x) { return !(x.a === br.a && x.b === br.b); });
        }
      }
      if (hashiCurN(islands, bridges, a) > islands[a].n || hashiCurN(islands, bridges, b) > islands[b].n) {
        mistakes++;
        toastMsg('桥数超过数字');
        bridges = hashiHist.pop();
        sfx('bad');
        if (mistakes > 8) endLv(false, '桥数超额');
        return { ok: false, error: '桥数超过数字' };
      }
      score += 4;
      sfx('good');
      sel = -1;
      if (hashiWin(islands, bridges)) {
        score += 40 + islands.length * 4;
        endLv(true);
      } else saveSession();
      return { ok: true };
    }

    function pickIsland(i) {
      if (screen !== 'play' || ended || mode !== 'hashi') return false;
      if (sel === i) { sel = -1; return true; }
      if (sel >= 0 && sel !== i) return !!linkHashi(sel, i);
      sel = i;
      sfx('tap');
      return true;
    }

    function toggleEdge(kind, r, c) {
      if (screen !== 'play' || ended || mode !== 'slither') return { ok: false };
      if (kind === 'h') {
        if (r < 0 || r > puz.h || c < 0 || c >= puz.w) return { ok: false };
      } else {
        if (r < 0 || r >= puz.h || c < 0 || c > puz.w) return { ok: false };
      }
      slitherHist.push({ HZ: cloneGrid(HZ), VZ: cloneGrid(VZ) });
      if (kind === 'h') HZ[r][c] = (HZ[r][c] + 1) % 3;
      else VZ[r][c] = (VZ[r][c] + 1) % 3;
      var val = kind === 'h' ? HZ[r][c] : VZ[r][c];
      if (val === 1 && slitherOverClue(puz, HZ, VZ)) {
        mistakes++;
        if (kind === 'h') HZ[r][c] = (HZ[r][c] + 2) % 3;
        else VZ[r][c] = (VZ[r][c] + 2) % 3;
        slitherHist.pop();
        sfx('bad');
        toastMsg('这条边让数字超过了');
        return { ok: false, error: '这条边让数字超过了' };
      }
      if (val === 1) score += 2;
      sfx('tap');
      if (slitherAllCluesOk(puz, HZ, VZ) && slitherMustOk(puz, HZ, VZ)) {
        var info = slitherLoopInfo(puz, HZ, VZ);
        if (info.ok) {
          score += 40 + (boss ? 35 : 0) + puz.w * 4;
          endLv(true);
          return { ok: true, won: true };
        }
      }
      saveSession();
      return { ok: true, value: val };
    }

    function pause() {
      if (screen !== 'play' || ended) return false;
      screen = 'pause';
      saveSession();
      return true;
    }

    function resume() {
      if (screen !== 'pause') return false;
      screen = 'play';
      lastTs = nowMs;
      return true;
    }

    function goLevels() {
      if ((screen === 'play' || screen === 'pause') && !ended) saveSession();
      screen = 'levels';
    }

    function goLobby() {
      if ((screen === 'play' || screen === 'pause') && !ended) saveSession();
      screen = 'lobby';
    }

    function openMode(id) {
      mode = id;
      if (!P.modeTut[id]) {
        tutKind = id;
        tutI = 0;
        tutThen = 'levels';
        screen = 'tutorial';
        return;
      }
      screen = 'levels';
    }

    function finishTutorial() {
      if (tutKind === 'collect') {
        P.tut = 1;
        saveProg();
        screen = 'lobby';
      } else {
        P.modeTut[tutKind] = 1;
        saveProg();
        mode = tutKind;
        screen = tutThen || 'levels';
      }
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
      roundedRect(ctx, r.x, r.y, r.w, r.h, 16);
      ctx.fillStyle = fill;
      ctx.fill();
      if (kind === 'accent') {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.font = 'bold ' + FONT.button + 'px sans-serif';
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
      ctx.font = 'bold ' + FONT.hud + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    }

    function wrapText(text, x, y, maxW, lh) {
      var chars = String(text).split(''), line = '', i, ch, w, yy = y;
      ctx.textAlign = 'left';
      for (i = 0; i < chars.length; i++) {
        ch = chars[i];
        w = ctx.measureText(line + ch).width;
        if (w > maxW && line) {
          ctx.fillText(line, x, yy);
          yy += lh;
          line = ch;
        } else line += ch;
      }
      if (line) { ctx.fillText(line, x, yy); yy += lh; }
      return yy;
    }

    function drawMute(x, y) {
      var r = { x: x, y: y, w: 48, h: 48 };
      drawIconBtn(r, muted ? '静' : '声');
      addHit(r, 'mute');
      return r;
    }

    function drawStart() {
      var box = contentBox();
      drawMute(W - insets.right - 66, insets.top + 8);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + FONT.title + 'px sans-serif';
      ctx.fillText('逻辑谜题', W / 2, insets.top + 128);
      ctx.font = FONT.sub + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillText('数独 · 数岛搭桥 · 围圈数谜', W / 2, insets.top + 168);
      ctx.font = FONT.caption + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      var y = insets.top + 210;
      y = wrapText('同一款逻辑益智小游戏里的三种完整玩法，不是把网页图标堆在一起。', box.x, y, box.w, 24);
      y += 8;
      ctx.fillStyle = 'rgba(255,248,220,0.8)';
      y = wrapText('待审核技术样板，未提交微信审核，不承诺可上架。300 元是微信认证费，不是每个玩法单独收费，也不保证过审。这是微信小游戏，不是普通小程序。touristappid 只是游客占位。', box.x, y, box.w, 22);

      var start = { x: box.x, y: Math.max(y + 24, H * 0.58), w: box.w, h: 56 };
      drawButton(start, '开始', 'accent');
      addHit(start, 'start');
      if (session && session.payload) {
        var cont = { x: box.x, y: start.y + 68, w: box.w, h: 56 };
        drawButton(cont, '继续本局 · ' + modeMeta(session.mode).title + ' 第' + (session.lv + 1) + '关', 'gold');
        addHit(cont, 'continue');
      }
    }

    function drawTutorial() {
      var box = contentBox();
      var pages = tutKind === 'collect' ? COLLECT_TUT : (MODE_TUT[tutKind] || COLLECT_TUT);
      var page = pages[tutI] || pages[0];
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + FONT.heading + 'px sans-serif';
      ctx.fillText(page.t, box.x, box.y + 48);
      ctx.font = FONT.body + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      wrapText(page.d, box.x, box.y + 92, box.w, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = FONT.caption + 'px sans-serif';
      ctx.fillText((tutI + 1) + ' / ' + pages.length, box.x, H - insets.bottom - 90);
      var skip = { x: box.x, y: H - insets.bottom - 72, w: (box.w - 12) / 2, h: 52 };
      var next = { x: skip.x + skip.w + 12, y: skip.y, w: skip.w, h: 52 };
      drawButton(skip, '跳过', 'ghost');
      drawButton(next, tutI >= pages.length - 1 ? '完成' : '下一步', 'accent');
      addHit(skip, 'tutSkip');
      addHit(next, 'tutNext');
    }

    function drawLobby() {
      var box = contentBox();
      drawMute(W - insets.right - 66, insets.top + 8);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + FONT.heading + 'px sans-serif';
      ctx.fillText('逻辑谜题', box.x, box.y + 36);
      ctx.font = FONT.body + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fillText('选一种玩法进入。三种都可存档、撤销。', box.x, box.y + 68);
      var y = box.y + 92;
      if (session && session.payload) {
        var cont = { x: box.x, y: y, w: box.w, h: 52 };
        drawButton(cont, '继续本局 · ' + modeMeta(session.mode).title + ' 第' + (session.lv + 1) + '关', 'gold');
        addHit(cont, 'continue');
        y += 64;
      }
      var i, cardH = Math.max(108, Math.min(132, (H - y - insets.bottom - 24) / 3 - 12));
      for (i = 0; i < MODES.length; i++) {
        var m = MODES[i];
        var r = { x: box.x, y: y + i * (cardH + 12), w: box.w, h: cardH };
        roundedRect(ctx, r.x, r.y, r.w, r.h, 18);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fill();
        ctx.fillStyle = m.color;
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.icon, r.x + 18, r.y + 36);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + FONT.sub + 'px sans-serif';
        ctx.fillText(m.title, r.x + 58, r.y + 28);
        var stars = P.modes[m.id].stars;
        var cleared = 0, k;
        for (k = 0; k < stars.length; k++) if (stars[k]) cleared++;
        ctx.font = FONT.caption + 'px sans-serif';
        ctx.fillStyle = '#ffd54f';
        ctx.fillText(cleared + ' / ' + m.count + ' 关已通', r.x + 58, r.y + 52);
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.font = FONT.caption + 'px sans-serif';
        wrapText(m.blurb, r.x + 18, r.y + 74, r.w - 36, 20);
        addHit(r, 'mode', { id: m.id });
      }
    }

    function drawLevels() {
      var box = contentBox();
      var back = { x: box.x, y: box.y, w: 72, h: 48 };
      drawIconBtn(back, '大厅');
      addHit(back, 'lobby');
      drawMute(W - insets.right - 66, box.y);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + FONT.heading + 'px sans-serif';
      ctx.fillText(modeMeta(mode).title, box.x + 84, box.y + 32);
      ctx.font = FONT.caption + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('通关解锁下一关 · 金币 ' + P.coins, box.x, box.y + 64);

      var count = levelCount(mode);
      var cols = 5, gap = 8;
      var cw = (box.w - gap * (cols - 1)) / cols;
      var ch = 64;
      var gy = box.y + 84;
      var i;
      for (i = 0; i < count; i++) {
        var col = i % cols, row = Math.floor(i / cols);
        var r = { x: box.x + col * (cw + gap), y: gy + row * (ch + gap), w: cw, h: ch };
        var ok = unlocked(mode, i);
        roundedRect(ctx, r.x, r.y, r.w, r.h, 12);
        ctx.fillStyle = ok ? (isBoss(mode, i) ? 'rgba(255,213,79,0.28)' : 'rgba(255,255,255,0.16)') : 'rgba(255,255,255,0.06)';
        ctx.fill();
        ctx.fillStyle = ok ? '#fff' : 'rgba(255,255,255,0.35)';
        ctx.font = 'bold ' + FONT.hud + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ok ? ((isBoss(mode, i) ? '首 ' : '') + (i + 1)) : '锁', r.x + r.w / 2, r.y + 22);
        ctx.font = FONT.star + 'px sans-serif';
        ctx.fillStyle = ok ? '#ffd54f' : 'rgba(255,255,255,0.25)';
        ctx.fillText(ok ? starStr((mp().stars[i]) || 0) : ' ', r.x + r.w / 2, r.y + 44);
        if (ok) addHit(r, 'level', { i: i });
      }
      if (mode === 'sudoku') {
        var rows = Math.ceil(count / cols);
        var shopY = gy + rows * (ch + gap) + 10;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.font = FONT.caption + 'px sans-serif';
        ctx.fillText('数独升级（通关获得金币）', box.x, shopY);
        var u, uw = (box.w - 8) / 2;
        for (u = 0; u < UPS.length; u++) {
          var item = UPS[u];
          var lvUp = up(item.k), max = item.max, cost = lvUp < max ? item.cost(lvUp) : 0;
          var need = item.stars && totalStarsAll() < item.stars;
          var colu = u % 2, rowu = Math.floor(u / 2);
          var sr = { x: box.x + colu * (uw + 8), y: shopY + 12 + rowu * 74, w: uw, h: 66 };
          var disabled = lvUp >= max || need;
          roundedRect(ctx, sr.x, sr.y, sr.w, sr.h, 12);
          ctx.fillStyle = disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.14)';
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold ' + FONT.caption + 'px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.name + '  ' + lvUp + '/' + max, sr.x + 10, sr.y + 22);
          ctx.font = FONT.star + 'px sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fillText(disabled ? (lvUp >= max ? '已满级' : '需更多星星') : ('花费 ' + cost), sr.x + 10, sr.y + 44);
          if (!disabled) addHit(sr, 'buy', { k: item.k });
        }
      }
    }

    function drawSudokuBoard(L) {
      var n = N, s = L.board.size / n, x = L.board.x, y = L.board.y;
      var r, c, v, xx, yy;
      roundedRect(ctx, x - 4, y - 4, L.board.size + 8, L.board.size + 8, 10);
      ctx.fillStyle = '#f4f1ff';
      ctx.fill();
      for (r = 0; r < n; r++) {
        for (c = 0; c < n; c++) {
          xx = x + c * s; yy = y + r * s;
          if (sel === r * n + c) {
            ctx.fillStyle = 'rgba(255,95,162,0.22)';
            ctx.fillRect(xx, yy, s, s);
          }
          v = grid[r][c];
          var ok = cellOk(grid, n, r, c);
          if (v && !ok) {
            ctx.fillStyle = 'rgba(229,57,53,0.28)';
            ctx.fillRect(xx, yy, s, s);
          }
          if (v) {
            ctx.fillStyle = fixed[r][c] ? '#1a237e' : (ok ? '#283593' : '#c62828');
            ctx.font = 'bold ' + Math.max(18, Math.floor(s * (n >= 9 ? 0.48 : 0.52))) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(v), xx + s / 2, yy + s / 2 + 1);
          }
          addHit({ x: xx, y: yy, w: s, h: s }, 'cell', { r: r, c: c });
        }
      }
      var bs = boxSize(n), bw = boxWidth(n), i;
      ctx.strokeStyle = 'rgba(40,53,147,0.18)';
      ctx.lineWidth = 1;
      for (i = 1; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s, y);
        ctx.lineTo(x + i * s, y + L.board.size);
        ctx.moveTo(x, y + i * s);
        ctx.lineTo(x + L.board.size, y + i * s);
        ctx.stroke();
      }
      ctx.strokeStyle = '#1a237e';
      ctx.lineWidth = 2;
      for (i = 0; i <= n; i++) {
        if (i % bw === 0) {
          ctx.beginPath();
          ctx.moveTo(x + i * s, y);
          ctx.lineTo(x + i * s, y + L.board.size);
          ctx.stroke();
        }
        if (i % bs === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y + i * s);
          ctx.lineTo(x + L.board.size, y + i * s);
          ctx.stroke();
        }
      }
    }

    function drawPad(L) {
      var i, n = N, cols = n, gap = 8;
      var cw = (L.padBox.w - gap * (cols - 1)) / cols;
      var ch = Math.min(56, L.padBox.h);
      for (i = 1; i <= n; i++) {
        var r = { x: L.padBox.x + (i - 1) * (cw + gap), y: L.padBox.y, w: cw, h: ch };
        roundedRect(ctx, r.x, r.y, r.w, r.h, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i), r.x + r.w / 2, r.y + r.h / 2 + 1);
        addHit(r, 'num', { n: i });
      }
    }

    function drawHashiBoard(L) {
      var maxX = 0, maxY = 0, i;
      for (i = 0; i < islands.length; i++) {
        if (islands[i].x > maxX) maxX = islands[i].x;
        if (islands[i].y > maxY) maxY = islands[i].y;
      }
      var gw = maxX + 1, gh = maxY + 1;
      var cell = Math.min(L.board.size / (gw + 0.2), L.board.size / (gh + 0.2));
      var ox = L.board.x + (L.board.size - cell * gw) / 2 + cell / 2;
      var oy = L.board.y + (L.board.size - cell * gh) / 2 + cell / 2;
      roundedRect(ctx, L.board.x, L.board.y, L.board.size, L.board.size, 12);
      ctx.fillStyle = 'rgba(8,16,48,0.45)';
      ctx.fill();
      function pt(idx) { return { x: ox + islands[idx].x * cell, y: oy + islands[idx].y * cell }; }
      var k, A, B, p1, dx, dy, len, nx, ny;
      for (k = 0; k < bridges.length; k++) {
        A = pt(bridges[k].a); B = pt(bridges[k].b);
        dx = B.x - A.x; dy = B.y - A.y;
        len = Math.sqrt(dx * dx + dy * dy) || 1;
        nx = -dy / len; ny = dx / len;
        ctx.strokeStyle = '#ffe082';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        if (bridges[k].n === 2) {
          ctx.beginPath(); ctx.moveTo(A.x + nx * 5, A.y + ny * 5); ctx.lineTo(B.x + nx * 5, B.y + ny * 5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(A.x - nx * 5, A.y - ny * 5); ctx.lineTo(B.x - nx * 5, B.y - ny * 5); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        }
      }
      var rad = Math.max(22, Math.min(32, cell * 0.32));
      for (i = 0; i < islands.length; i++) {
        p1 = pt(i);
        var cur = hashiCurN(islands, bridges, i);
        var over = cur > islands[i].n;
        var ok = cur === islands[i].n;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = sel === i ? '#ff5fa2' : (over ? '#ef9a9a' : (ok ? '#a5d6a7' : '#fff8e1'));
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = sel === i ? '#fff' : '#ffd54f';
        ctx.stroke();
        ctx.fillStyle = '#1a237e';
        ctx.font = 'bold ' + Math.max(18, Math.floor(rad * 0.95)) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(islands[i].n), p1.x, p1.y + 1);
        var hitR = Math.max(rad, 24);
        addHit({ x: p1.x - hitR, y: p1.y - hitR, w: hitR * 2, h: hitR * 2 }, 'island', { i: i });
      }
    }

    function drawSlitherBoard(L) {
      var w = puz.w, h = puz.h;
      var cell = Math.min(L.board.size / (w + 0.6), L.board.size / (h + 0.6));
      var ox = L.board.x + (L.board.size - cell * w) / 2;
      var oy = L.board.y + (L.board.size - cell * h) / 2;
      roundedRect(ctx, L.board.x, L.board.y, L.board.size, L.board.size, 12);
      ctx.fillStyle = 'rgba(8,16,48,0.45)';
      ctx.fill();
      var mustMap = {}, i, r, c;
      for (i = 0; i < (puz.must || []).length; i++) mustMap[puz.must[i][0] + ',' + puz.must[i][1]] = 1;
      for (r = 0; r < h; r++) {
        for (c = 0; c < w; c++) {
          var cl = puz.clues[r][c];
          var cx = ox + c * cell, cy = oy + r * cell;
          if (mustMap[r + ',' + c]) {
            ctx.fillStyle = 'rgba(255,213,79,0.18)';
            ctx.fillRect(cx + 4, cy + 4, cell - 8, cell - 8);
          }
          if (cl != null) {
            var cnt = slitherCellCount(HZ, VZ, r, c);
            ctx.fillStyle = cnt > cl ? '#ef9a9a' : (cnt === cl ? '#c8e6c9' : '#fff');
            ctx.font = 'bold ' + Math.max(18, Math.floor(cell * 0.38)) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(cl), cx + cell / 2, cy + cell / 2 + 1);
          }
        }
      }
      function drawH(rr, cc) {
        var x1 = ox + cc * cell, y1 = oy + rr * cell, x2 = x1 + cell;
        var st = HZ[rr][cc];
        if (st === 1) {
          ctx.strokeStyle = '#80deea'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
        } else if (st === 2) {
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
          var mx = (x1 + x2) / 2, my = y1;
          ctx.beginPath(); ctx.moveTo(mx - 7, my - 7); ctx.lineTo(mx + 7, my + 7);
          ctx.moveTo(mx + 7, my - 7); ctx.lineTo(mx - 7, my + 7); ctx.stroke();
        }
        addHit({ x: x1 + 8, y: y1 - 16, w: cell - 16, h: 32 }, 'hedge', { r: rr, c: cc });
      }
      function drawV(rr, cc) {
        var x1 = ox + cc * cell, y1 = oy + rr * cell, y2 = y1 + cell;
        var st = VZ[rr][cc];
        if (st === 1) {
          ctx.strokeStyle = '#80deea'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1, y2); ctx.stroke();
        } else if (st === 2) {
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
          var mx = x1, my = (y1 + y2) / 2;
          ctx.beginPath(); ctx.moveTo(mx - 7, my - 7); ctx.lineTo(mx + 7, my + 7);
          ctx.moveTo(mx + 7, my - 7); ctx.lineTo(mx - 7, my + 7); ctx.stroke();
        }
        addHit({ x: x1 - 16, y: y1 + 8, w: 32, h: cell - 16 }, 'vedge', { r: rr, c: cc });
      }
      for (r = 0; r <= h; r++) for (c = 0; c < w; c++) drawH(r, c);
      for (r = 0; r < h; r++) for (c = 0; c <= w; c++) drawV(r, c);
      ctx.fillStyle = '#fff8e1';
      for (r = 0; r <= h; r++) {
        for (c = 0; c <= w; c++) {
          ctx.beginPath();
          ctx.arc(ox + c * cell, oy + r * cell, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawActions(L, labels) {
      var n = labels.length, gap = 8, i;
      var cw = (L.actions.w - gap * (n - 1)) / n;
      for (i = 0; i < n; i++) {
        var r = { x: L.actions.x + i * (cw + gap), y: L.actions.y, w: cw, h: L.actions.h };
        drawButton(r, labels[i].label, 'ghost');
        addHit(r, labels[i].id);
      }
    }

    function drawPlay() {
      var L = layoutPlay();
      var pauseBtn = { x: L.topBar.x + L.topBar.w - 104, y: L.topBar.y, w: 48, h: 48 };
      drawIconBtn(pauseBtn, '停');
      addHit(pauseBtn, 'pause');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + FONT.hud + 'px sans-serif';
      var title = modeMeta(mode).title + '  ' + (lv + 1) + '/' + levelCount(mode);
      if (boss) title = '首 · ' + boss.name;
      ctx.fillText(title, L.topBar.x, L.topBar.y + 24);
      ctx.font = FONT.caption + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      var sub = '';
      if (mode === 'sudoku') sub = '命 ' + lives + '   提示 ' + hints + '   时间 ' + Math.max(0, Math.ceil(timeLeft)) + 's';
      else if (mode === 'hashi') sub = '撤销可用   错误 ' + mistakes;
      else sub = '实线 / × 切换   撤销可用' + (puz && puz.must && puz.must.length ? '   含必经格' : '');
      ctx.fillText(sub, L.subBar.x, L.subBar.y + 14);

      if (mode === 'sudoku') {
        drawSudokuBoard(L);
        drawPad(L);
        drawActions(L, [
          { id: 'erase', label: '清除' },
          { id: 'undo', label: '撤销' },
          { id: 'hint', label: '提示' },
          { id: 'check', label: '检查' }
        ]);
      } else if (mode === 'hashi') {
        drawHashiBoard(L);
        drawActions(L, [
          { id: 'undo', label: '撤销' },
          { id: 'check', label: '检查' }
        ]);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = FONT.caption + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(sel >= 0 ? '已选一座岛，再点同行或同列的岛搭桥' : '点两座岛搭桥，再点可改成双桥或拆除', L.hint.x, L.hint.y + 16);
      } else {
        drawSlitherBoard(L);
        drawActions(L, [
          { id: 'undo', label: '撤销' },
          { id: 'hint', label: '提示' },
          { id: 'check', label: '检查' }
        ]);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = FONT.caption + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('点边：实线 → × → 空白。数字等于邻接实线数。', L.hint.x, L.hint.y + 16);
      }
    }

    function drawOverlayChrome(title, bodyLines, buttons) {
      var card = layoutMenuCard();
      var textH = 28 + bodyLines.length * 26;
      var btnH = buttons.length * 64;
      var h = Math.min(card.h, 90 + textH + btnH + 24);
      var y0 = card.y + Math.max(0, (card.h - h) / 2);
      roundedRect(ctx, card.x, y0, card.w, h, 20);
      ctx.fillStyle = 'rgba(18,22,58,0.94)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + FONT.heading + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(title, card.x + card.w / 2, y0 + 48);
      ctx.font = FONT.body + 'px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      var i, yy = y0 + 84;
      for (i = 0; i < bodyLines.length; i++) {
        ctx.fillText(bodyLines[i], card.x + card.w / 2, yy);
        yy += 26;
      }
      var bw = card.w - 40, bx = card.x + 20, by = yy + 16, j;
      for (j = 0; j < buttons.length; j++) {
        var r = { x: bx, y: by + j * 64, w: bw, h: 52 };
        drawButton(r, buttons[j].label, buttons[j].kind || 'accent');
        addHit(r, buttons[j].id);
      }
    }

    function drawPause() {
      hits = hits.filter(function (h) { return h.id === 'mute'; });
      drawOverlayChrome('暂停', [modeMeta(mode).title + ' 第 ' + (lv + 1) + ' 关', '进度已保存，回大厅后可继续'], [
        { id: 'resume', label: '继续', kind: 'accent' },
        { id: 'restart', label: '重开本关', kind: 'ghost' },
        { id: 'levels', label: '选关', kind: 'ghost' },
        { id: 'lobby', label: '回大厅', kind: 'ghost' }
      ]);
    }

    function drawOver() {
      var lines = [overWhy];
      if (lastWin) lines.push('获得 ' + overGain + ' 金币');
      var buttons = [];
      if (lastWin && lv < levelCount(mode) - 1 && unlocked(mode, lv + 1)) {
        buttons.push({ id: 'next', label: '下一关', kind: 'accent' });
      }
      buttons.push({ id: 'again', label: lastWin ? '再玩本关' : '重试', kind: lastWin ? 'ghost' : 'accent' });
      buttons.push({ id: 'levels', label: '选关', kind: 'ghost' });
      buttons.push({ id: 'lobby', label: '回大厅', kind: 'ghost' });
      drawOverlayChrome(lastWin ? '完成' : '未完成', lines, buttons);
    }

    function drawToast() {
      if (!toast.text || nowMs > toast.until) return;
      ctx.font = 'bold ' + FONT.body + 'px sans-serif';
      var w = Math.min(W - 40, ctx.measureText(toast.text).width + 36);
      var r = { x: (W - w) / 2, y: H - insets.bottom - 86, w: w, h: 44 };
      roundedRect(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toast.text, W / 2, r.y + r.h / 2);
    }

    function render() {
      hits = [];
      drawStage();
      if (screen === 'start') drawStart();
      else if (screen === 'tutorial') drawTutorial();
      else if (screen === 'lobby') drawLobby();
      else if (screen === 'levels') drawLevels();
      else if (screen === 'play') drawPlay();
      else if (screen === 'pause') { drawPlay(); drawPause(); }
      else if (screen === 'over') { drawPlay(); drawOver(); }
      drawMute(W - insets.right - 66, insets.top + 8);
      drawToast();
    }

    function buy(k) {
      var item, i;
      for (i = 0; i < UPS.length; i++) if (UPS[i].k === k) item = UPS[i];
      if (!item) return false;
      var lvUp = up(k);
      if (lvUp >= item.max) return false;
      if (item.stars && totalStarsAll() < item.stars) return false;
      var cost = item.cost(lvUp);
      if (P.coins < cost) { toastMsg('金币不足'); return false; }
      P.coins -= cost;
      P.up[k] = lvUp + 1;
      saveProg();
      sfx('coin');
      toastMsg(item.name + '已升级');
      return true;
    }

    function handle(id, data) {
      if (id === 'mute') { setMute(!muted); return; }
      if (id === 'start') {
        if (!P.tut) {
          tutKind = 'collect'; tutI = 0; tutThen = 'lobby'; screen = 'tutorial';
        } else screen = 'lobby';
        return;
      }
      if (id === 'continue') { restoreSession(); return; }
      if (id === 'tutSkip') { finishTutorial(); return; }
      if (id === 'tutNext') {
        var pages = tutKind === 'collect' ? COLLECT_TUT : (MODE_TUT[tutKind] || COLLECT_TUT);
        if (tutI >= pages.length - 1) finishTutorial();
        else tutI++;
        return;
      }
      if (id === 'mode') { openMode(data.id); return; }
      if (id === 'lobby') { goLobby(); return; }
      if (id === 'levels') { goLevels(); return; }
      if (id === 'level') { startLevel(mode, data.i); return; }
      if (id === 'buy') { buy(data.k); return; }
      if (id === 'pause') { pause(); return; }
      if (id === 'resume') { sfx('tap'); resume(); return; }
      if (id === 'restart' || id === 'again') { startLevel(mode, lv); return; }
      if (id === 'next') { startLevel(mode, Math.min(levelCount(mode) - 1, lv + 1)); return; }
      if (id === 'cell') { sel = data.r * N + data.c; sfx('tap'); return; }
      if (id === 'num') { fillSel(data.n); return; }
      if (id === 'erase') { eraseSel(); return; }
      if (id === 'hint') { doHint(); return; }
      if (id === 'check') { doCheck(); return; }
      if (id === 'undo') { undo(); return; }
      if (id === 'island') { pickIsland(data.i); return; }
      if (id === 'hedge') { toggleEdge('h', data.r, data.c); return; }
      if (id === 'vedge') { toggleEdge('v', data.r, data.c); return; }
    }

    function pointerToLogical(p) {
      return { x: p.x, y: p.y };
    }

    function onPointer(p) {
      var pt = pointerToLogical(p);
      var i, h, found = null;
      for (i = hits.length - 1; i >= 0; i--) {
        h = hits[i];
        if (hitRect(pt.x, pt.y, h)) { found = h; break; }
      }
      if (found) handle(found.id, found.data);
      render();
      return found;
    }

    function loop(ts) {
      if (!running) return;
      if (!nowMs) nowMs = ts;
      var dt = Math.min(0.1, (ts - lastTs) / 1000);
      if (lastTs) {
        nowMs = ts;
        if (screen === 'play' && !ended && mode === 'sudoku') {
          timeLeft -= dt;
          if (timeLeft <= 0) { timeLeft = 0; endLv(false, '时间到'); }
        }
      }
      lastTs = ts;
      render();
      raf = platform.raf(loop);
    }

    loadProg();
    resize();
    nowMs = platform.now ? platform.now() : 0;
    lastTs = nowMs;
    render();
    if (!opts.manualLoop) raf = platform.raf(loop);
    if (platform.onTouchStart) platform.onTouchStart(onPointer);
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
      undo: undo,
      linkHashi: linkHashi,
      pickIsland: pickIsland,
      toggleEdge: toggleEdge,
      pause: pause,
      resume: resume,
      buy: buy,
      goLobby: goLobby,
      goLevels: goLevels,
      openMode: openMode,
      restoreSession: restoreSession,
      saveSession: saveSession,
      clearSession: clearSession,
      setScreen: function (s) { screen = s; },
      setMode: function (id) { mode = id; },
      setSel: function (r, c) { sel = r * N + c; },
      setMute: setMute,
      saveProg: saveProg,
      loadProg: loadProg,
      stop: function () { running = false; if (platform.caf && raf) platform.caf(raf); },
      advance: function (dtSec) {
        nowMs += dtSec * 1000;
        if (screen === 'play' && !ended && mode === 'sudoku') {
          timeLeft -= dtSec;
          if (timeLeft <= 0) { timeLeft = 0; endLv(false, '时间到'); }
        }
        render();
      },
      layoutPlay: layoutPlay,
      mapPoint: pointerToLogical,
      getHits: function () { return hits.slice(); },
      getSession: function () { return session; },
      getState: function () {
        return {
          screen: screen,
          mode: mode,
          lv: lv,
          N: N,
          grid: cloneGrid(grid),
          sol: cloneGrid(sol),
          fixed: cloneGrid(fixed),
          lives: lives,
          score: score,
          timeLeft: timeLeft,
          hints: hints,
          hintsLeft: hintsLeft,
          mistakes: mistakes,
          sel: sel,
          ended: ended,
          boss: boss,
          filled: filledCount(),
          need: mode === 'sudoku' ? N * N : 0,
          muted: muted,
          tutI: tutI,
          tutKind: tutKind,
          islands: islands.map(function (p) { return { x: p.x, y: p.y, n: p.n }; }),
          bridges: cloneBridges(bridges),
          puz: puz,
          HZ: cloneGrid(HZ),
          VZ: cloneGrid(VZ),
          hasSession: !!(session && session.payload),
          session: session,
          progress: {
            stars: (P.modes[mode] && P.modes[mode].stars.slice()) || [],
            best: (P.modes[mode] && P.modes[mode].best.slice()) || [],
            coins: P.coins,
            up: Object.assign({}, P.up),
            tut: P.tut,
            modeTut: { sudoku: P.modeTut.sudoku, hashi: P.modeTut.hashi, slither: P.modeTut.slither },
            modes: {
              sudoku: { stars: P.modes.sudoku.stars.slice(), best: P.modes.sudoku.best.slice() },
              hashi: { stars: P.modes.hashi.stars.slice(), best: P.modes.hashi.best.slice() },
              slither: { stars: P.modes.slither.stars.slice(), best: P.modes.slither.best.slice() }
            }
          },
          size: { W: W, H: H, dpr: dpr, insets: Object.assign({}, insets) },
          lastWin: lastWin,
          platform: platform.name || ''
        };
      }
    };
  }

  return {
    MODES: MODES,
    LEVELS: SUDOKU_LEVELS,
    LEVEL_COUNT: SUDOKU_LEVELS.length,
    HASHI_LEVELS: HASHI_LEVELS,
    SLITHER_LEVELS: SLITHER_LEVELS,
    UPS: UPS,
    TUTORIAL: COLLECT_TUT,
    FONT: FONT,
    boxSize: boxSize,
    boxWidth: boxWidth,
    genSol: genSol,
    cellOk: cellOk,
    cellInBoxOk: cellInBoxOk,
    levelSpec: sudokuSpec,
    isBoss: function (mode, i) {
      if (typeof mode === 'number') return sudokuBoss(mode);
      return isBoss(mode, i);
    },
    starStr: starStr,
    parseProgress: parseProgress,
    makeSeededRng: makeSeededRng,
    hashiCanLink: hashiCanLink,
    hashiWin: hashiWin,
    hashiCurN: hashiCurN,
    slitherLoopInfo: slitherLoopInfo,
    slitherCellCount: slitherCellCount,
    slitherAllCluesOk: slitherAllCluesOk,
    slitherOverClue: slitherOverClue,
    createApp: createApp
  };
});
