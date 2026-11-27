// Game100 Micro-Engine (Plan A): ZzFX-grade procedural audio, Juice game-feel, and Vector Sprite Library.
// Inlined into every standalone game (~10KB raw / ~3.5KB zip) with zero external URLs and 60fps WebView speed.
(function () {
  'use strict';
  var UI = window.GameUI || (window.GameUI = {});
  var FX = UI.fx || null;
  function shade(h, t) { return FX && FX.shade ? FX.shade(h, t) : h; }
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.abs(w) * .5, Math.abs(h) * .5));
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
  }

  /* ==================== 1. ZzFX-Inspired Procedural SFX Engine ==================== */
  var ac = null;
  function isMuted() {
    try {
      if (UI.storageGet && (UI.storageGet('g100_mute') === '1' || UI.storageGet('g100_sound') === '0')) return true;
      var gid = document.documentElement.dataset.game;
      if (gid && UI.storageGet && (UI.storageGet('g100_' + gid + '_mute') === '1' || UI.storageGet(gid + '-mute') === '1')) return true;
    } catch (_) {}
    return false;
  }
  function ctxAudio() {
    if (isMuted()) return null;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (_) { return null; }
  }
  // Core ZzFX-style synthesizer: renders an envelope-shaped oscillator + noise buffer.
  function synth(p) {
    var a = ctxAudio(); if (!a) return;
    try {
      var sr = a.sampleRate || 44100;
      var vol = p.v == null ? .16 : p.v;
      var dur = Math.max(.02, (p.a || .006) + (p.s || .04) + (p.r || .1));
      var len = Math.min(sr * 1.2, Math.floor(sr * dur));
      var buf = a.createBuffer(1, len, sr), ch = buf.getChannelData(0);
      var f = (p.f || 440) * (1 + (Math.random() * 2 - 1) * (p.j || .02));
      var slide = p.sl || 0, wave = p.w || 0, noise = p.n || 0, bit = p.b || 0;
      var att = Math.max(1, (p.a || .006) * sr), sus = (p.s || .04) * sr, rel = Math.max(1, (p.r || .1) * sr);
      var ph = 0, lp = 0;
      for (var i = 0; i < len; i++) {
        var env = i < att ? i / att : i < att + sus ? 1 : Math.max(0, 1 - (i - att - sus) / rel);
        env = env * env;
        f = Math.max(28, f + slide * (1 / sr) * 1000);
        ph += f * 6.2831853 / sr;
        var s = wave === 1 ? (Math.sin(ph) >= 0 ? .8 : -.8)
              : wave === 2 ? (2 / Math.PI) * Math.asin(Math.sin(ph))
              : wave === 3 ? ((ph / Math.PI) % 2 - 1) * .7
              : Math.sin(ph);
        if (p.h) s = s * .72 + Math.sin(ph * 2) * .28;
        if (noise) {
          var wn = Math.random() * 2 - 1;
          lp += (wn - lp) * (p.lp || .35);
          s = s * (1 - noise) + lp * noise * 1.4;
        }
        if (bit) s = Math.round(s * bit) / bit;
        ch[i] = Math.max(-1, Math.min(1, s * env * vol));
      }
      var src = a.createBufferSource(); src.buffer = buf;
      src.connect(a.destination);
      src.start(a.currentTime + (p.d || 0));
    } catch (_) {}
  }
  var PENTA = [523, 587, 659, 784, 880, 1046, 1175, 1319, 1568];
  var sfx = {
    synth: synth,
    play: function (name, n) {
      if (isMuted()) return;
      switch (name) {
        case 'ui': case 'tap':
          synth({ f: 620, sl: 180, a: .003, s: .012, r: .045, w: 2, v: .11 }); break;
        case 'jump':
          synth({ f: 280, sl: 920, a: .004, s: .035, r: .09, w: 0, h: 1, v: .16 }); break;
        case 'coin':
          var cf = 988 + Math.min(6, (n || 0)) * 55;
          synth({ f: cf, a: .003, s: .02, r: .09, w: 0, h: 1, v: .15 });
          synth({ f: cf * 1.334, a: .003, s: .03, r: .14, w: 0, h: 1, v: .14, d: .055 }); break;
        case 'good':
          synth({ f: 659, a: .004, s: .02, r: .09, w: 2, h: 1, v: .14 });
          synth({ f: 988, a: .004, s: .03, r: .12, w: 0, h: 1, v: .14, d: .055 }); break;
        case 'combo':
          var f0 = PENTA[Math.min(PENTA.length - 1, Math.max(0, (n || 1) - 1))];
          synth({ f: f0, sl: 80, a: .004, s: .025, r: .12, w: 2, h: 1, v: .16 });
          synth({ f: f0 * 1.5, a: .004, s: .02, r: .13, w: 0, v: .11, d: .045 }); break;
        case 'shoot': case 'laser':
          synth({ f: 920, sl: -1800, a: .002, s: .02, r: .065, w: 2, n: .15, v: .13 }); break;
        case 'hit': case 'smash':
          synth({ f: 210, sl: -480, a: .002, s: .018, r: .08, w: 3, n: .48, lp: .28, v: .18 }); break;
        case 'boom':
          synth({ f: 135, sl: -190, a: .004, s: .06, r: .28, w: 0, n: .68, lp: .18, v: .22 }); break;
        case 'shield':
          synth({ f: 520, sl: 540, a: .005, s: .04, r: .15, w: 0, h: 1, v: .15 }); break;
        case 'bad': case 'hurt':
          synth({ f: 250, sl: -360, a: .004, s: .04, r: .18, w: 2, n: .22, lp: .25, v: .17 }); break;
        case 'boss':
          synth({ f: 130, sl: -40, a: .02, s: .16, r: .28, w: 3, h: 1, v: .16 });
          synth({ f: 196, sl: -55, a: .02, s: .14, r: .26, w: 2, v: .12, d: .12 }); break;
        case 'win':
          [523, 659, 784, 1046].forEach(function (fr, i) {
            synth({ f: fr, a: .005, s: .04, r: .18, w: 2, h: 1, v: .15, d: i * .09 });
          }); break;
        case 'lose':
          [392, 349, 311, 261].forEach(function (fr, i) {
            synth({ f: fr, sl: -30, a: .006, s: .05, r: .18, w: 2, v: .13, d: i * .11 });
          }); break;
        default:
          synth({ f: 520, sl: 120, a: .004, s: .02, r: .06, w: 0, v: .12 });
      }
    }
  };
  UI.sfx = sfx;

  // Auto-upgrade Kit.sfx across all Kit-powered games so every game benefits from ZzFX audio!
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      var k = window.__T && window.__T.kit;
      if (k && typeof k.sfx === 'function' && !k._sfxUpgraded) {
        var orig = k.sfx;
        k._sfxUpgraded = true;
        k.sfx = function (name, x) {
          if (isMuted()) return;
          if (/^(tap|good|combo|bad|hit|coin|boss|win|lose|boom|jump|shoot|shield|smash|throw|roll|blizzard)$/.test(name)) {
            sfx.play(name === 'throw' ? 'jump' : name === 'roll' ? 'hit' : name === 'blizzard' ? 'shield' : name, x);
          } else {
            orig.call(k, name, x);
          }
        };
      }
    }, 50);
  });

  /* ==================== 2. Juice Game-Feel Engine ==================== */
  function createJuice() {
    var st = { sh: 0, shMax: 0, fl: 0, flCol: '#fff', frz: 0, rings: [], pops: [], trails: [] };
    return {
      shake: function (power) { st.sh = Math.max(st.sh, power || 6); st.shMax = Math.max(st.shMax, st.sh); },
      flash: function (col, alpha) { st.flCol = col || '#fff'; st.fl = Math.max(st.fl, alpha || .26); },
      freeze: function (sec) { st.frz = Math.max(st.frz, sec || .045); },
      ring: function (x, y, col, maxR) { st.rings.push({ x: x, y: y, r: 5, m: maxR || 28, c: col || '#fde047', a: 1 }); },
      pop: function (x, y, txt, col, sz) { st.pops.push({ x: x, y: y, t: txt, c: col || '#fff', s: sz || 13, a: 1, sc: 1.45 }); },
      trail: function (x, y, r, col) { st.trails.push({ x: x, y: y, r: r || 5, c: col || '#38bdf8', a: .65 }); },
      clear: function () { st.sh = 0; st.fl = 0; st.frz = 0; st.rings.length = 0; st.pops.length = 0; st.trails.length = 0; },
      step: function (dt) {
        if (st.sh > 0) st.sh = Math.max(0, st.sh - dt * 28);
        if (st.fl > 0) st.fl = Math.max(0, st.fl - dt * 2.4);
        for (var i = st.rings.length - 1; i >= 0; i--) {
          var rg = st.rings[i]; rg.r += (rg.m - rg.r) * Math.min(1, dt * 11) + dt * 22; rg.a -= dt * 2.7;
          if (rg.a <= 0) st.rings.splice(i, 1);
        }
        for (var j = st.pops.length - 1; j >= 0; j--) {
          var p = st.pops[j]; p.y -= dt * 34; p.a -= dt * 1.35; p.sc += (1 - p.sc) * Math.min(1, dt * 14);
          if (p.a <= 0) st.pops.splice(j, 1);
        }
        for (var k = st.trails.length - 1; k >= 0; k--) {
          var tr = st.trails[k]; tr.a -= dt * 2.8; tr.r *= (1 - dt * 1.4);
          if (tr.a <= 0 || tr.r < .5) st.trails.splice(k, 1);
        }
        if (st.frz > 0) { st.frz = Math.max(0, st.frz - dt); return 0; }
        return dt;
      },
      begin: function (ctx) {
        ctx.save();
        if (st.sh > .2) ctx.translate((Math.random() - .5) * st.sh * 2, (Math.random() - .5) * st.sh * 2);
      },
      end: function (ctx) { ctx.restore(); },
      draw: function (ctx, w, h) {
        for (var k = 0; k < st.trails.length; k++) {
          var tr = st.trails[k]; ctx.save(); ctx.globalAlpha = Math.max(0, tr.a); ctx.fillStyle = tr.c;
          ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, 7); ctx.fill(); ctx.restore();
        }
        for (var i = 0; i < st.rings.length; i++) {
          var rg = st.rings[i]; ctx.save(); ctx.globalAlpha = Math.max(0, rg.a);
          ctx.strokeStyle = rg.c; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, 7); ctx.stroke(); ctx.restore();
        }
        for (var j = 0; j < st.pops.length; j++) {
          var p = st.pops[j]; ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, p.a * 1.4));
          ctx.translate(p.x, p.y); ctx.scale(p.sc, p.sc);
          ctx.font = '900 ' + p.s + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(15,23,42,.78)'; ctx.lineJoin = 'round';
          ctx.strokeText(p.t, 0, 0); ctx.fillStyle = p.c; ctx.fillText(p.t, 0, 0); ctx.restore();
        }
        if (st.fl > .01 && w && h) {
          ctx.save(); ctx.globalAlpha = st.fl; ctx.fillStyle = st.flCol; ctx.fillRect(0, 0, w, h); ctx.restore();
        }
      }
    };
  }
  UI.juice = Object.assign(createJuice(), { create: createJuice });

  /* ==================== 3. High-Craft Vector Sprite Library ==================== */
  var S = {
    astronaut: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 14;
      var t = performance.now() * .02, thrust = !!o.thrust, tilt = Math.max(-.35, Math.min(.35, (o.vy || 0) / 520));
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
      if (o.shield) { ctx.strokeStyle = 'rgba(56,189,248,.85)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, 7); ctx.stroke(); }
      // Jetpack thruster pack + animated flame
      ctx.fillStyle = '#64748b'; rr(ctx, -r * 1.05, -r * .42, r * .52, r * .92, 4); ctx.fill();
      ctx.fillStyle = '#f43f5e'; rr(ctx, -r * 1.02, -r * .2, r * .46, r * .24, 2); ctx.fill();
      if (thrust) {
        var fl = r * (1.05 + Math.sin(t * 2.4) * .32);
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-r * .98, r * .48); ctx.lineTo(-r * .78, r * .48 + fl); ctx.lineTo(-r * .56, r * .48); ctx.fill();
        ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.moveTo(-r * .9, r * .48); ctx.lineTo(-r * .78, r * .48 + fl * .58); ctx.lineTo(-r * .64, r * .48); ctx.fill();
      }
      // Suit body & legs
      ctx.fillStyle = '#e2e8f0'; rr(ctx, -r * .48, -r * .1, r * .96, r * .88, 6); ctx.fill();
      ctx.fillStyle = '#0284c7'; rr(ctx, -r * .48, r * .22, r * .96, r * .24, 2); ctx.fill();
      ctx.fillStyle = '#334155'; rr(ctx, -r * .42, r * .65, r * .36, r * .34, 3); rr(ctx, r * .08, r * .62, r * .36, r * .34, 3); ctx.fill();
      // Helmet & curved reflective cyan visor
      var hg = ctx.createRadialGradient(-r * .25, -r * .65, 1, 0, -r * .42, r * .78);
      hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -r * .42, r * .72, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(r * .2, -r * .42, r * .48, r * .38, 0, 0, 7); ctx.fill();
      var vg = ctx.createLinearGradient(0, -r * .75, r * .6, -r * .1); vg.addColorStop(0, '#38bdf8'); vg.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(r * .22, -r * .42, r * .42, r * .31, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.beginPath(); ctx.ellipse(r * .14, -r * .56, r * .18, r * .08, -.4, 0, 7); ctx.fill();
      ctx.restore();
    },
    missile: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 10; var track = !!o.track, t = performance.now() * .025;
      ctx.save(); ctx.translate(x, y);
      // Exhaust flame on right (flying left)
      var fl = r * (.85 + Math.sin(t) * .25);
      ctx.fillStyle = track ? '#f43f5e' : '#f97316';
      ctx.beginPath(); ctx.moveTo(r * .9, -r * .32); ctx.lineTo(r * .9 + fl, 0); ctx.lineTo(r * .9, r * .32); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.moveTo(r * .9, -r * .16); ctx.lineTo(r * .9 + fl * .55, 0); ctx.lineTo(r * .9, r * .16); ctx.fill();
      // Tail fins
      ctx.fillStyle = track ? '#e11d48' : '#ef4444';
      ctx.beginPath(); ctx.moveTo(r * .35, -r * .35); ctx.lineTo(r * 1.05, -r * .85); ctx.lineTo(r * .95, -r * .35); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * .35, r * .35); ctx.lineTo(r * 1.05, r * .85); ctx.lineTo(r * .95, r * .35); ctx.fill();
      // Metallic cylindrical body + pointed warhead
      var mg = ctx.createLinearGradient(0, -r * .5, 0, r * .5); mg.addColorStop(0, '#f8fafc'); mg.addColorStop(.55, '#94a3b8'); mg.addColorStop(1, '#475569');
      ctx.fillStyle = mg; rr(ctx, -r * .75, -r * .45, r * 1.7, r * .9, r * .45); ctx.fill();
      ctx.fillStyle = track ? '#f43f5e' : '#ef4444';
      ctx.beginPath(); ctx.moveTo(-r * .5, -r * .45); ctx.quadraticCurveTo(-r * 1.35, 0, -r * .5, r * .45); ctx.closePath(); ctx.fill();
      if (track) { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(-r * .1, 0, r * .22, 0, 7); ctx.fill(); }
      ctx.restore();
    },
    penguin: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 18; var sq = o.squash || 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq * .34, 1 - sq * .26);
      if (FX) FX.shadow(ctx, 0, 4, r * .75, 4.5, .32);
      // Orange webbed feet
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.ellipse(-r * .35, 0, r * .3, r * .14, 0, 0, 7); ctx.ellipse(r * .35, 0, r * .3, r * .14, 0, 0, 7); ctx.fill();
      // Plump navy-slate body + snowy belly
      var bg = ctx.createRadialGradient(-r * .25, -r * 1.4, 2, 0, -r * 1.0, r * 1.3);
      bg.addColorStop(0, '#475569'); bg.addColorStop(.55, '#1e293b'); bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -r * .98, r * .76, r * 1.02, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(0, -r * .82, r * .52, r * .74, 0, 0, 7); ctx.fill();
      // Cute flippers
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.ellipse(-r * .78, -r * .88, r * .2, r * .48, .32, 0, 7);
      ctx.ellipse(r * .78, -r * .88, r * .2, r * .48, -.32, 0, 7); ctx.fill();
      // Cozy red-gold scarf
      ctx.fillStyle = '#f43f5e'; rr(ctx, -r * .62, -r * 1.42, r * 1.24, r * .24, 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * .3, -r * 1.25); ctx.lineTo(r * .68, -r * .95); ctx.lineTo(r * .44, -r * .85); ctx.lineTo(r * .18, -r * 1.2); ctx.fill();
      // Expressive eyes, rosy cheeks & coral beak
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * .25, -r * 1.66, r * .2, 0, 7); ctx.arc(r * .25, -r * 1.66, r * .2, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-r * .21, -r * 1.66, r * .1, 0, 7); ctx.arc(r * .29, -r * 1.66, r * .1, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * .18, -r * 1.72, r * .045, 0, 7); ctx.arc(r * .32, -r * 1.72, r * .045, 0, 7); ctx.fill();
      ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(-r * .16, -r * 1.52); ctx.lineTo(r * .16, -r * 1.52); ctx.lineTo(0, -r * 1.34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(251,113,133,.45)'; ctx.beginPath(); ctx.ellipse(-r * .38, -r * 1.48, r * .14, r * .08, 0, 0, 7); ctx.ellipse(r * .38, -r * 1.48, r * .14, r * .08, 0, 0, 7); ctx.fill();
      ctx.restore();
    },
    yeti: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 20; var sc = o.scale || 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      if (FX) FX.shadow(ctx, 0, r * .85, r * .9, r * .3, .34);
      // Curved golden mountain horns
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.moveTo(-r * .55, -r * .55); ctx.quadraticCurveTo(-r * 1.05, -r * 1.15, -r * .4, -r * 1.15); ctx.lineTo(-r * .25, -r * .72); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * .55, -r * .55); ctx.quadraticCurveTo(r * 1.05, -r * 1.15, r * .4, -r * 1.15); ctx.lineTo(r * .25, -r * .72); ctx.fill();
      // Fluffy snow-white fur body
      var yg = ctx.createRadialGradient(-r * .25, -r * .35, 2, 0, 0, r * 1.1);
      yg.addColorStop(0, '#ffffff'); yg.addColorStop(.65, '#e0f2fe'); yg.addColorStop(1, '#7dd3fc');
      ctx.fillStyle = yg; ctx.beginPath(); ctx.arc(0, 0, r * .96, 0, 7); ctx.fill();
      // Expressive cyan yeti face + determined brows + fang smile
      ctx.fillStyle = '#38bdf8'; rr(ctx, -r * .62, -r * .42, r * 1.24, r * .76, r * .32); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * .26, -r * .12, r * .19, 0, 7); ctx.arc(r * .26, -r * .12, r * .19, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-r * .24, -r * .1, r * .1, 0, 7); ctx.arc(r * .28, -r * .1, r * .1, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-r * .28, r * .14); ctx.lineTo(-r * .18, r * .3); ctx.lineTo(-r * .08, r * .14); ctx.moveTo(r * .08, r * .14); ctx.lineTo(r * .18, r * .3); ctx.lineTo(r * .28, r * .14); ctx.fill();
      ctx.restore();
    },
    climber: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 13; var col = o.color || '#f97316';
      ctx.save(); ctx.translate(x, y);
      if (FX) FX.shadow(ctx, 0, r * .85, r * .8, r * .28, .3);
      ctx.fillStyle = o.frozen ? '#38bdf8' : col; rr(ctx, -r * .62, -r * .1, r * 1.24, r * .9, 5); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -r * .42, r * .55, 0, 7); ctx.fill();
      ctx.fillStyle = o.frozen ? '#0284c7' : shade(col, -.22); ctx.beginPath(); ctx.arc(0, -r * .58, r * .6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-r * .2, -r * .42, r * .11, 0, 7); ctx.arc(r * .2, -r * .42, r * .11, 0, 7); ctx.fill();
      if (o.frozen) { ctx.strokeStyle = 'rgba(224,242,254,.9)'; ctx.lineWidth = 2; rr(ctx, -r * .85, -r * .95, r * 1.7, r * 1.85, 6); ctx.stroke(); }
      ctx.restore();
    },
    skier: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 16; var lean = Math.max(-.4, Math.min(.4, (o.dx || 0) * .018));
      ctx.save(); ctx.translate(x, y); ctx.rotate(lean);
      if (FX) FX.shadow(ctx, 0, r * .95, r * .8, 4, .26);
      // Curved twin skis
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-7, r * 1.15); ctx.moveTo(6, -6); ctx.lineTo(7, r * 1.15); ctx.stroke();
      // Fluttering scarf + vibrant alpine parka
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(3, -5); ctx.quadraticCurveTo(14 + Math.sin(performance.now() * .018) * 4, -12, 18, -4); ctx.lineTo(5, 0); ctx.fill();
      ctx.fillStyle = '#f43f5e'; rr(ctx, -8.5, -5, 17, 15, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-8, 1, 16, 2.5);
      // Helmet + reflective ski goggles
      ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.arc(0, -11, 8.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; rr(ctx, -6.5, -13, 13, 5.2, 2.5); ctx.fill();
      ctx.fillStyle = '#38bdf8'; rr(ctx, -5, -12, 10, 3, 1.5); ctx.fill();
      ctx.restore();
    },
    pine: function (ctx, x, y, s) {
      s = s || 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      if (FX) FX.shadow(ctx, 0, 14, 15, 4.5, .24);
      ctx.fillStyle = '#78350f'; rr(ctx, -3.5, 4, 7, 11, 2); ctx.fill();
      [[-15, 7, 0, -9, 15, 7, '#15803d'], [-12, -2, 0, -17, 12, -2, '#16a34a'], [-9, -11, 0, -24, 9, -11, '#22c55e']].forEach(function (t) {
        ctx.fillStyle = t[6]; ctx.beginPath(); ctx.moveTo(t[0], t[1]); ctx.lineTo(t[2], t[3]); ctx.lineTo(t[4], t[5]); ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.beginPath(); ctx.moveTo(-4, -17); ctx.lineTo(0, -24); ctx.lineTo(4, -17); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    lumberjack: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 18; var dir = o.dir || 1, swing = o.swing || 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
      if (FX) FX.shadow(ctx, 0, r * .95, r * .85, 4.5, .32);
      // Boots & jeans
      ctx.fillStyle = '#451a03'; rr(ctx, -8, 9, 6.5, 7, 2.5); rr(ctx, 1.5, 9, 6.5, 7, 2.5); ctx.fill();
      ctx.fillStyle = '#1d4ed8'; rr(ctx, -8, 2, 16, 9, 3); ctx.fill();
      // Red flannel shirt with plaid stripes
      ctx.fillStyle = '#dc2626'; rr(ctx, -9.5, -10, 19, 14, 5); ctx.fill();
      ctx.fillStyle = 'rgba(15,23,42,.35)'; ctx.fillRect(-9, -4, 18, 2.5); ctx.fillRect(-2, -10, 3, 14);
      // Head, cozy beard & red beanie
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -17, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(0, -14.5, 7.2, .15, Math.PI - .15); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-2.5, -18, 1.4, 0, 7); ctx.arc(3, -18, 1.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.arc(0, -20, 8.4, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(0, -29, 2.8, 0, 7); ctx.fill();
      // Swinging steel axe pointing toward trunk (-x because side=+1 stands on right facing left!)
      ctx.save(); ctx.translate(-6, -3); ctx.rotate(-.55 - swing * 1.1);
      ctx.fillStyle = '#92400e'; rr(ctx, -18, -2, 20, 3.6, 1.5); ctx.fill();
      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(-22, -9); ctx.quadraticCurveTo(-26, -1, -21, 5); ctx.lineTo(-15, 1); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.restore();
    },
    archer: function (ctx, x, y, r, o) {
      o = o || {}; var aim = o.aim || -.5, pow = o.pow || 0;
      ctx.save(); ctx.translate(x, y);
      if (FX) FX.shadow(ctx, 0, 18, 14, 4, .3);
      // Green ranger cloak & tunic
      ctx.fillStyle = '#15803d'; rr(ctx, -8, -4, 16, 18, 5); ctx.fill();
      ctx.fillStyle = '#78350f'; ctx.fillRect(-8, 4, 16, 3);
      // Chibi face & feathered hood cap
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -11, 7.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(2.5, -11.5, 1.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(-14, -22); ctx.lineTo(8, -15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.ellipse(-11, -21, 5, 2.2, -.5, 0, 7); ctx.fill();
      // Dynamic recurve bow rotating toward aim
      ctx.rotate(aim);
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(10, 0, 18, -1.15, 1.15); ctx.stroke();
      var pull = -pow * 12;
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(17, -16); ctx.lineTo(14 + pull, 0); ctx.lineTo(17, 16); ctx.stroke();
      if (o.charging) {
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(14 + pull, 0); ctx.lineTo(36 + pull, 0); ctx.stroke();
        ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.moveTo(39 + pull, 0); ctx.lineTo(33 + pull, -3.5); ctx.lineTo(33 + pull, 3.5); ctx.fill();
      }
      ctx.restore();
    },
    duck: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 16; var dir = (o.vx || 1) >= 0 ? 1 : -1, gold = !!o.gold, dead = !!o.dead;
      var fl = Math.sin(performance.now() * .022 + x * .05) * r * .55;
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); if (dead) ctx.rotate(.6);
      // Animated wing
      ctx.fillStyle = gold ? '#f59e0b' : '#78350f';
      ctx.beginPath(); ctx.moveTo(-r * .2, -r * .1); ctx.quadraticCurveTo(0, -r * 1.15 + fl, -r * .85, -r * .7 + fl); ctx.lineTo(-r * .5, r * .1); ctx.closePath(); ctx.fill();
      // Plump body + neck + glossy head
      ctx.fillStyle = gold ? '#facc15' : '#92400e'; ctx.beginPath(); ctx.ellipse(-r * .1, r * .1, r * .78, r * .46, -.12, 0, 7); ctx.fill();
      ctx.fillStyle = gold ? '#fef08a' : '#15803d'; ctx.beginPath(); ctx.arc(r * .58, -r * .22, r * .38, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(r * .22, -r * .04, r * .42, r * .12);
      // Orange duck bill & expressive eye
      ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(r * 1.02, -r * .16, r * .28, r * .13, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * .66, -r * .28, r * .14, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(r * .7, -r * .28, r * .07, 0, 7); ctx.fill();
      ctx.restore();
    },
    copter: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 14; var t = performance.now() * .04, tilt = Math.max(-.25, Math.min(.3, (o.vy || 0) / 550));
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
      if (FX) FX.shadow(ctx, 0, r + 5, r * 1.1, 3.8, .28);
      // Tail boom & spinning tail rotor
      ctx.fillStyle = '#0284c7'; rr(ctx, -r * 1.55, -r * .2, r * 1.1, r * .36, 3); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(-r * 1.55, -r * .1); ctx.lineTo(-r * 1.75, -r * .65); ctx.lineTo(-r * 1.25, -r * .1); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-r * 1.65, -r * .45 + Math.sin(t) * 3); ctx.lineTo(-r * 1.65, r * .15 - Math.sin(t) * 3); ctx.stroke();
      // Landing skids
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-r * .5, r * .6); ctx.lineTo(-r * .5, r * .92); ctx.moveTo(r * .45, r * .6); ctx.lineTo(r * .45, r * .92);
      ctx.moveTo(-r * .85, r * .92); ctx.lineTo(r * .9, r * .92); ctx.stroke();
      // Sleek fuselage & glass cockpit bubble
      var cg = ctx.createLinearGradient(0, -r * .7, 0, r * .7); cg.addColorStop(0, '#38bdf8'); cg.addColorStop(1, '#0369a1');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * .72, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.ellipse(r * .38, -r * .12, r * .55, r * .44, .1, -1.6, 1.3); ctx.fill();
      ctx.fillStyle = '#facc15'; ctx.fillRect(-r * .75, r * .05, r * .8, r * .16);
      // Spinning top rotor mast + motion-blurred blade
      ctx.fillStyle = '#475569'; ctx.fillRect(-2, -r * 1.05, 4, r * .42);
      var bw = r * (1.2 + Math.abs(Math.sin(t * 1.4)) * .9);
      ctx.fillStyle = 'rgba(248,250,252,.88)'; rr(ctx, -bw, -r * 1.12, bw * 2, 3.2, 2); ctx.fill();
      ctx.restore();
    },
    tank: function (ctx, x, y, s, o) {
      o = o || {}; var c = o.color || '#22c55e', dir = o.dir || 'up', isP = !!o.player, big = !!o.big;
      var ang = dir === 'right' ? Math.PI / 2 : dir === 'down' ? Math.PI : dir === 'left' ? -Math.PI / 2 : 0;
      ctx.save(); ctx.translate(x + s / 2, y + s / 2);
      if (FX) FX.shadow(ctx, 0, s * .42, s * .45, 4, .3);
      ctx.rotate(ang);
      var hs = s * .46, tw = s * .22;
      // Animated segmented treads
      ctx.fillStyle = '#1e293b'; rr(ctx, -hs, -hs, tw, s * .92, 3); rr(ctx, hs - tw, -hs, tw, s * .92, 3); ctx.fill();
      ctx.fillStyle = '#475569';
      for (var i = -hs + 3; i < hs - 3; i += 5) { ctx.fillRect(-hs + 1, i, tw - 2, 2); ctx.fillRect(hs - tw + 1, i, tw - 2, 2); }
      // Beveled armored hull
      var hg = ctx.createLinearGradient(-hs, 0, hs, 0); hg.addColorStop(0, shade(c, .25)); hg.addColorStop(1, shade(c, -.25));
      ctx.fillStyle = hg; rr(ctx, -hs + tw - 2, -hs * .82, s * .92 - tw * 2 + 4, hs * 1.64, 5); ctx.fill();
      // Cannon barrel(s)
      ctx.fillStyle = shade(c, .32);
      if (big) { rr(ctx, -s * .15, -hs * 1.32, s * .11, hs * 1.18, 2); rr(ctx, s * .04, -hs * 1.32, s * .11, hs * 1.18, 2); ctx.fill(); ctx.fillStyle = '#f8fafc'; ctx.fillRect(-s * .14, -hs * 1.32, s * .09, 2.5); ctx.fillRect(s * .05, -hs * 1.32, s * .09, 2.5); }
      else { rr(ctx, -s * .085, -hs * 1.28, s * .17, hs * 1.14, 2.5); ctx.fill(); ctx.fillStyle = '#f8fafc'; ctx.fillRect(-s * .075, -hs * 1.28, s * .15, 2.6); }
      // Turret dome + commander hatch / star
      ctx.fillStyle = shade(c, .15); ctx.beginPath(); ctx.arc(0, 0, s * .22, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      if (isP) { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(0, 0, s * .08, 0, 7); ctx.fill(); }
      ctx.restore();
    },
    cat: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 16; var col = o.color || '#fffbeb';
      ctx.save(); ctx.translate(x, y);
      if (FX) FX.shadow(ctx, 0, r * .72, r * .68, r * .22, .22);
      // Pointed ears with pink inner triangles
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-r * .75, -r * .18); ctx.lineTo(-r * .65, -r * .95); ctx.lineTo(-r * .15, -r * .58); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * .75, -r * .18); ctx.lineTo(r * .65, -r * .95); ctx.lineTo(r * .15, -r * .58); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.beginPath(); ctx.moveTo(-r * .62, -r * .28); ctx.lineTo(-r * .56, -r * .75); ctx.lineTo(-r * .25, -r * .52); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * .62, -r * .28); ctx.lineTo(r * .56, -r * .75); ctx.lineTo(r * .25, -r * .52); ctx.closePath(); ctx.fill();
      // Round kitty head + forehead stripes
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, r * .02, r * .82, r * .7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f59e0b'; rr(ctx, -r * .07, -r * .64, r * .14, r * .26, 2); ctx.fill();
      // Sparkling eyes, pink nose, cute "w" mouth & whiskers
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-r * .32, -r * .06, r * .14, 0, 7); ctx.arc(r * .32, -r * .06, r * .14, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * .27, -r * .11, r * .055, 0, 7); ctx.arc(r * .37, -r * .11, r * .055, 0, 7); ctx.fill();
      ctx.fillStyle = '#fb7185'; ctx.beginPath(); ctx.moveTo(-r * .1, r * .1); ctx.lineTo(r * .1, r * .1); ctx.lineTo(0, r * .22); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = Math.max(1, r * .07);
      ctx.beginPath(); ctx.moveTo(-r * .55, r * .06); ctx.lineTo(-r * .92, 0); ctx.moveTo(-r * .55, r * .2); ctx.lineTo(-r * .9, r * .26);
      ctx.moveTo(r * .55, r * .06); ctx.lineTo(r * .92, 0); ctx.moveTo(r * .55, r * .2); ctx.lineTo(r * .9, r * .26); ctx.stroke();
      ctx.restore();
    },
    runner: function (ctx, x, y, w, h, o) {
      o = o || {}; var face = o.face || 1, dash = !!o.dash, run = Math.abs(o.vx || 0) > 10 ? Math.sin(performance.now() * .024) * 5 : 0;
      ctx.save(); ctx.translate(x + w / 2, y + h); ctx.scale(face, 1);
      if (FX) FX.shadow(ctx, 0, 2, w * .55, 3.5, .32);
      // Glowing cyan scarf trail
      ctx.fillStyle = dash ? '#38bdf8' : '#f43f5e';
      ctx.beginPath(); ctx.moveTo(-4, -h * .62); ctx.quadraticCurveTo(-15, -h * .66 + run * .5, -19, -h * .46); ctx.lineTo(-6, -h * .48); ctx.fill();
      // Animated legs
      ctx.fillStyle = '#1e293b'; rr(ctx, -6 - run * .5, -8, 5, 8.5, 2.5); rr(ctx, 1 + run * .5, -8, 5, 8.5, 2.5); ctx.fill();
      // Sleek cyber jacket
      ctx.fillStyle = dash ? '#38bdf8' : '#ec4899'; rr(ctx, -7.5, -h * .68, 15, h * .45, 5); ctx.fill();
      // Helmet head + neon glowing visor
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, -h * .85, 8.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#38bdf8'; rr(ctx, -1, -h * .92, 9.5, 4.2, 2); ctx.fill();
      ctx.fillStyle = '#fff'; rr(ctx, 2, -h * .9, 5, 1.8, 1); ctx.fill();
      ctx.restore();
    },
    survivorCar: function (ctx, x, y, ang, o) {
      o = o || {};
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
      // Nitro flame plume
      if (o.nitro) {
        var fl = 14 + Math.sin(performance.now() * .04) * 6;
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(-28, -4); ctx.lineTo(-28 - fl, 0); ctx.lineTo(-28, 6); ctx.fill();
        ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.moveTo(-28, -2); ctx.lineTo(-28 - fl * .55, 1); ctx.lineTo(-28, 4); ctx.fill();
      }
      // Front spinning sawblade
      ctx.save(); ctx.translate(31, 4); ctx.rotate(performance.now() * .025);
      ctx.fillStyle = '#cbd5e1'; ctx.beginPath();
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a + .35) * 6, Math.sin(a + .35) * 6); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      // Armored chassis & roll cage
      var col = o.lowHp ? '#f43f5e' : '#f97316';
      ctx.fillStyle = col; rr(ctx, -28, -8, 56, 17, 5); ctx.fill();
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-7, -18); ctx.lineTo(10, -18); ctx.lineTo(18, -8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(9, -16); ctx.lineTo(15, -9); ctx.lineTo(0, -9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.fillRect(24, -5, 4, 5);
      // Rugged spinning tires
      [-17, 17].forEach(function (wx) {
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(wx, 10, 9.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(wx, 10, 4.5, 0, 7); ctx.fill();
      });
      ctx.restore();
    },
    zombie: function (ctx, x, y, o) {
      o = o || {}; var wob = Math.sin(performance.now() * .01 + x * .1) * .12;
      ctx.save(); ctx.translate(x, y); ctx.rotate(o.roll ? o.roll * 1.4 : wob);
      ctx.fillStyle = '#334155'; rr(ctx, -5, -4, 4, 11, 2); rr(ctx, 1, -4, 4, 11, 2); ctx.fill();
      ctx.fillStyle = '#475569'; rr(ctx, -6, -15, 12, 13, 3.5); ctx.fill();
      // Outstretched zombie arm facing left
      ctx.fillStyle = '#84cc16'; rr(ctx, -14, -13, 10, 3.5, 1.5); ctx.fill();
      // Green head + glowing amber eye
      ctx.fillStyle = '#84cc16'; ctx.beginPath(); ctx.arc(0, -21, 6.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(-2.5, -21.5, 1.8, 0, 7); ctx.fill();
      ctx.restore();
    },
    boulder: function (ctx, x, y, r) {
      r = r || 13;
      ctx.save(); ctx.translate(x, y);
      if (FX) FX.shadow(ctx, 0, r * .85, r * .85, r * .3, .3);
      var rg = ctx.createRadialGradient(-r * .3, -r * .35, 1, 0, 0, r); rg.addColorStop(0, '#cbd5e1'); rg.addColorStop(.55, '#64748b'); rg.addColorStop(1, '#334155');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.moveTo(-r * .85, -r * .15); ctx.lineTo(-r * .55, -r * .85); ctx.lineTo(r * .3, -r * .92); ctx.lineTo(r * .92, -r * .3); ctx.lineTo(r * .75, r * .65); ctx.lineTo(-r * .15, r * .92); ctx.lineTo(-r * .85, r * .55); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,.35)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-r * .35, -r * .3); ctx.lineTo(r * .08, 0); ctx.lineTo(-r * .08, r * .45); ctx.stroke();
      ctx.restore();
    },
    coin: function (ctx, x, y, r) {
      r = r || 9; var sx = Math.max(.28, Math.abs(Math.cos(performance.now() * .005 + x * .05)));
      ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
      var cg = ctx.createRadialGradient(-r * .3, -r * .3, 1, 0, 0, r); cg.addColorStop(0, '#fef9c3'); cg.addColorStop(.55, '#facc15'); cg.addColorStop(1, '#d97706');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = '#fef08a'; rr(ctx, -r * .18, -r * .42, r * .36, r * .84, 2); ctx.fill();
      ctx.restore();
    },
    shield: function (ctx, x, y, r) {
      r = r || 10;
      ctx.save(); ctx.translate(x, y);
      var sg = ctx.createLinearGradient(0, -r, 0, r); sg.addColorStop(0, '#6ee7b7'); sg.addColorStop(1, '#059669');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * .85, -r * .58); ctx.quadraticCurveTo(r * .8, r * .45, 0, r); ctx.quadraticCurveTo(-r * .8, r * .45, -r * .85, -r * .58); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ecfdf5'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    },
    boat: function (ctx, x, y, r) {
      r = r || 28;
      ctx.save(); ctx.translate(x, y);
      // Wooden hull with highlight plank
      var hg = ctx.createLinearGradient(0, -4, 0, 14); hg.addColorStop(0, '#b45309'); hg.addColorStop(1, '#78350f');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.moveTo(-r, -2); ctx.lineTo(r, -2); ctx.lineTo(r * .72, 12); ctx.lineTo(-r * .72, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d97706'; rr(ctx, -r * .98, -5, r * 1.96, 4.5, 2); ctx.fill();
      // Angler torso, head & straw hat
      ctx.fillStyle = '#0284c7'; rr(ctx, -8, -19, 14, 15, 4); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(-1, -24, 6.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(-1, -28, 12, 3.2, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-1, -29, 6.5, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.fillRect(-7.5, -29.5, 13, 2.2);
      // Bamboo rod curving out
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(4, -14); ctx.quadraticCurveTo(22, -32, 34, -16); ctx.stroke();
      ctx.restore();
    },
    fish: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 16; var dir = (o.vx || 1) >= 0 ? 1 : -1, t = performance.now() * .014 + x * .04;
      var wag = Math.sin(t) * r * .22;
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
      if (o.shark) {
        // Sleek great-white shark
        ctx.fillStyle = '#475569';
        ctx.beginPath(); ctx.moveTo(-r * .85, 0); ctx.lineTo(-r * 1.48, -r * .65 + wag); ctx.lineTo(-r * 1.18, 0); ctx.lineTo(-r * 1.45, r * .55 + wag); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-r * .15, -r * .4); ctx.lineTo(r * .05, -r * 1.05); ctx.lineTo(r * .38, -r * .38); ctx.closePath(); ctx.fill();
        var sg = ctx.createLinearGradient(0, -r * .55, 0, r * .55); sg.addColorStop(0, '#64748b'); sg.addColorStop(.62, '#94a3b8'); sg.addColorStop(.65, '#f1f5f9'); sg.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.08, r * .52, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(r * .58, -r * .12, Math.max(2, r * .11), 0, 7); ctx.fill();
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(r * .35, r * .22); ctx.lineTo(r * .85, r * .18); ctx.stroke();
      } else {
        var c1 = o.gold ? '#fef08a' : (o.color || '#38bdf8'), c2 = o.gold ? '#f59e0b' : shade(o.color || '#0284c7', -.25);
        ctx.fillStyle = c2;
        ctx.beginPath(); ctx.moveTo(-r * .68, 0); ctx.lineTo(-r * 1.28, -r * .55 + wag); ctx.lineTo(-r * 1.28, r * .55 + wag); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -r * .45, r * .4, r * .26, -.2, 0, 7); ctx.fill();
        var fg = ctx.createLinearGradient(0, -r * .55, 0, r * .55); fg.addColorStop(0, c1); fg.addColorStop(1, c2);
        ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(0, 0, r * .88, r * .56, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(r * .1, -r * .2, r * .45, r * .16, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * .44, -r * .1, Math.max(2.6, r * .18), 0, 7); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(r * .5, -r * .1, Math.max(1.4, r * .09), 0, 7); ctx.fill();
      }
      ctx.restore();
    },
    fruit: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 22; var k = o.kind || 0, half = o.half || 0;
      var pal = [
        ['#16a34a', '#ef4444', '#14532d'], // watermelon
        ['#ef4444', '#fee2e2', '#b91c1c'], // apple
        ['#f97316', '#ffedd5', '#ea580c'], // orange
        ['#facc15', '#fef9c3', '#ca8a04'], // lemon
        ['#65a30d', '#d9f99d', '#3f6212'], // kiwi
        ['#ec4899', '#fce7f3', '#be185d'], // peach/berry
        ['#8b5cf6', '#ede9fe', '#6d28d9']  // grape
      ][k % 7];
      ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
      if (half) { ctx.beginPath(); ctx.rect(half < 0 ? -r * 1.4 : 0, -r * 1.4, r * 1.4, r * 2.8); ctx.clip(); }
      var g = ctx.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r);
      g.addColorStop(0, shade(pal[0], .25)); g.addColorStop(1, pal[2]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      if (k % 7 === 0) {
        // Watermelon rind + juicy red flesh if sliced, stripes if whole
        if (half) {
          ctx.fillStyle = '#dcfce7'; ctx.beginPath(); ctx.arc(0, 0, r * .84, 0, 7); ctx.fill();
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, 0, r * .74, 0, 7); ctx.fill();
          ctx.fillStyle = '#1e293b';
          for (var a = 0; a < 6; a++) { var ang = a * 1.05; ctx.beginPath(); ctx.arc(Math.cos(ang) * r * .42, Math.sin(ang) * r * .42, 1.8, 0, 7); ctx.fill(); }
        } else {
          ctx.strokeStyle = '#14532d'; ctx.lineWidth = r * .16;
          for (var s = -.55; s <= .56; s += .55) { ctx.beginPath(); ctx.arc(s * r, 0, r * .88, -1.1, 1.1); ctx.stroke(); }
        }
      } else if (half) {
        ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.arc(0, 0, r * .8, 0, 7); ctx.fill();
        ctx.fillStyle = pal[0]; ctx.beginPath(); ctx.arc(0, 0, r * .22, 0, 7); ctx.fill();
      }
      // Glossy specular + leaf on top
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-r * .32, -r * .36, r * .28, r * .14, -.6, 0, 7); ctx.fill();
      if (!half) {
        ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(r * .2, -r * .95, r * .32, r * .15, -.35, 0, 7); ctx.fill();
      }
      ctx.restore();
    },
    bomb: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 22; var t = performance.now() * .03;
      ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
      var bg = ctx.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r); bg.addColorStop(0, '#475569'); bg.addColorStop(.55, '#1e293b'); bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r * .88, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * .88, 0, 7); ctx.stroke();
      // Danger X mark
      ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * .3, -r * .3); ctx.lineTo(r * .3, r * .3); ctx.moveTo(r * .3, -r * .3); ctx.lineTo(-r * .3, r * .3); ctx.stroke();
      // Fuse cap & sizzling spark
      ctx.fillStyle = '#64748b'; rr(ctx, -r * .22, -r * 1.05, r * .44, r * .28, 3); ctx.fill();
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -r * 1.02); ctx.quadraticCurveTo(r * .45, -r * 1.32, r * .6, -r * 1.05); ctx.stroke();
      var sr = 4.5 + Math.sin(t * 2) * 2;
      ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(r * .6, -r * 1.05, sr * 1.35, 0, 7); ctx.fill();
      ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(r * .6, -r * 1.05, sr * .7, 0, 7); ctx.fill();
      ctx.restore();
    },
    starfighter: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 16; var t = performance.now() * .03;
      ctx.save(); ctx.translate(x, y); ctx.rotate(o.a || 0);
      if (o.thrust) {
        var fl = r * (.85 + Math.sin(t * 2.5) * .35);
        [-r * .34, r * .34].forEach(function (ey) {
          ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-r * .65, ey - 3.5); ctx.lineTo(-r * .65 - fl, ey); ctx.lineTo(-r * .65, ey + 3.5); ctx.fill();
          ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.moveTo(-r * .65, ey - 1.8); ctx.lineTo(-r * .65 - fl * .55, ey); ctx.lineTo(-r * .65, ey + 1.8); ctx.fill();
        });
      }
      // Swept wings
      ctx.fillStyle = '#0284c7';
      ctx.beginPath(); ctx.moveTo(r * .35, 0); ctx.lineTo(-r * .82, -r * .95); ctx.lineTo(-r * .58, 0); ctx.lineTo(-r * .82, r * .95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-r * .68, -r * .78, r * .28, r * .18); ctx.fillRect(-r * .68, r * .6, r * .28, r * .18);
      // Fuselage
      var fg = ctx.createLinearGradient(0, -r * .4, 0, r * .4); fg.addColorStop(0, '#f8fafc'); fg.addColorStop(1, '#94a3b8');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(r * 1.15, 0); ctx.lineTo(-r * .5, -r * .42); ctx.lineTo(-r * .72, 0); ctx.lineTo(-r * .5, r * .42); ctx.closePath(); ctx.fill();
      // Glowing cyan canopy
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(r * .2, 0, r * .38, r * .19, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(r * .26, -r * .06, r * .16, r * .06, 0, 0, 7); ctx.fill();
      ctx.restore();
    },
    ufo: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 18; var t = performance.now() * .008, c = o.color || '#a855f7';
      ctx.save(); ctx.translate(x, y);
      // Glass dome
      var dg = ctx.createRadialGradient(-r * .18, -r * .38, 1, 0, -r * .2, r * .58); dg.addColorStop(0, '#e0f2fe'); dg.addColorStop(1, '#0284c7');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, -r * .18, r * .52, Math.PI, 0); ctx.fill();
      // Metallic saucer rim
      var sg = ctx.createLinearGradient(0, -r * .3, 0, r * .35); sg.addColorStop(0, shade(c, .3)); sg.addColorStop(1, shade(c, -.3));
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 0, r, r * .36, 0, 0, 7); ctx.fill();
      // Blinking rim lights
      for (var i = -2; i <= 2; i++) {
        ctx.fillStyle = ((Math.floor(t + i) & 1) ? '#fde047' : '#38bdf8');
        ctx.beginPath(); ctx.arc(i * r * .34, r * .06, Math.max(1.8, r * .1), 0, 7); ctx.fill();
      }
      ctx.restore();
    },
    bumperCar: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 20; var c = o.stun ? '#94a3b8' : (o.color || '#f43f5e'), ang = o.ang || 0;
      ctx.save(); ctx.translate(x, y);
      if (FX) FX.shadow(ctx, 0, r * .32, r * 1.05, r * .88, .3);
      ctx.rotate(ang);
      // Thick black rubber bumper ring with metallic trim
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r - 2.2, 0, 7); ctx.stroke();
      // Glossy chassis body
      var cg = ctx.createRadialGradient(-r * .25, -r * .25, 2, 0, 0, r * .82); cg.addColorStop(0, shade(c, .35)); cg.addColorStop(1, shade(c, -.22));
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r * .76, 0, 7); ctx.fill();
      // Racing stripe & twin headlights pointing right (+X)
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(-r * .65, -2, r * 1.32, 4);
      ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(r * .68, -r * .3, 3.2, 0, 7); ctx.arc(r * .68, r * .3, 3.2, 0, 7); ctx.fill();
      // Cockpit seat & helmeted driver
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(-r * .08, 0, r * .4, 0, 7); ctx.fill();
      ctx.fillStyle = o.player ? '#fef08a' : '#f8fafc'; ctx.beginPath(); ctx.arc(-r * .08, 0, r * .28, 0, 7); ctx.fill();
      ctx.fillStyle = '#0284c7'; rr(ctx, -r * .02, -r * .16, r * .2, r * .32, 2); ctx.fill();
      ctx.restore();
      if (o.stun) {
        var t = performance.now() * .008;
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#fde047';
        for (var k = 0; k < 3; k++) { var a = t + k * 2.1; ctx.beginPath(); ctx.arc(Math.cos(a) * r * .7, Math.sin(a) * r * .7 - r * .5, 3, 0, 7); ctx.fill(); }
        ctx.restore();
      }
    },
    dirtbike: function (ctx, x, y, ang, o) {
      o = o || {}; var t = performance.now() * .02;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
      // Exhaust flame when accelerating
      if (o.gas) {
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-22, 2); ctx.lineTo(-32 - Math.sin(t * 2) * 5, 4); ctx.lineTo(-22, 6); ctx.fill();
      }
      // Spoked wheels
      [-15, 16].forEach(function (wx) {
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(wx, 9, 8.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(wx, 9, 4.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(wx, 9, 1.8, 0, 7); ctx.fill();
      });
      // Forks & frame
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-15, 9); ctx.lineTo(-2, -3); ctx.lineTo(10, -7); ctx.lineTo(16, 9); ctx.stroke();
      // Fairing & racing number plate
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(2, -7); ctx.lineTo(18, -5); ctx.lineTo(12, 3); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ef4444'; rr(ctx, -6, -6, 12, 5, 2); ctx.fill();
      // Rider + fluttering scarf + motocross helmet
      ctx.fillStyle = '#38bdf8'; rr(ctx, -8, -20, 12, 13, 4); ctx.fill();
      ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.quadraticCurveTo(-18, -21 + Math.sin(t) * 3, -24, -14); ctx.lineTo(-8, -14); ctx.fill();
      ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(-1, -24, 6.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a'; rr(ctx, 0, -26, 6.5, 3.8, 1.5); ctx.fill();
      ctx.restore();
    },
    bowlingPin: function (ctx, x, y, r) {
      r = r || 9;
      ctx.save(); ctx.translate(x, y);
      if (FX) FX.shadow(ctx, 0, r * .85, r * .85, r * .35, .28);
      var pg = ctx.createRadialGradient(-r * .3, -r * .4, 1, 0, 0, r * 1.3); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(0, r * .15, r * .82, r * .95, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -r * .85, r * .46, 0, 7); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.fillRect(-r * .48, -r * .56, r * .96, 2.4); ctx.fillRect(-r * .52, -r * .32, r * 1.04, 2.4);
      ctx.restore();
    },
    bowlingBall: function (ctx, x, y, r) {
      r = r || 12;
      ctx.save(); ctx.translate(x, y);
      if (FX) FX.shadow(ctx, 0, r * .75, r * .95, r * .35, .35);
      var bg = ctx.createRadialGradient(-r * .35, -r * .35, 1.5, 0, 0, r); bg.addColorStop(0, '#6366f1'); bg.addColorStop(.55, '#312e81'); bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.arc(-3, -3.5, 1.8, 0, 7); ctx.arc(2.5, -4, 1.8, 0, 7); ctx.arc(0, .5, 2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * .38, -r * .36, r * .24, r * .12, -.6, 0, 7); ctx.fill();
      ctx.restore();
    },
    voidMage: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 28; var boss = !!o.boss, t = performance.now() * .004, bob = Math.sin(t) * 4;
      ctx.save(); ctx.translate(x, y + bob);
      // Orbiting arcane halo ring
      ctx.strokeStyle = boss ? 'rgba(251,113,133,.6)' : 'rgba(192,132,252,.55)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(0, r * .15, r * 1.25, r * .42, Math.sin(t * .7) * .2, 0, 7); ctx.stroke();
      // Cloaked shadow robe
      var rg = ctx.createLinearGradient(0, -r, 0, r); rg.addColorStop(0, boss ? '#be123c' : '#6d28d9'); rg.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.moveTo(0, -r * .95); ctx.quadraticCurveTo(r * .85, -r * .25, r * .72, r * .88);
      ctx.lineTo(r * .25, r * .65); ctx.lineTo(0, r * .92); ctx.lineTo(-r * .25, r * .65); ctx.lineTo(-r * .72, r * .88);
      ctx.quadraticCurveTo(-r * .85, -r * .25, 0, -r * .95); ctx.fill();
      // Dark hood interior & glowing eyes
      ctx.fillStyle = '#09061a'; ctx.beginPath(); ctx.ellipse(0, -r * .24, r * .42, r * .36, 0, 0, 7); ctx.fill();
      ctx.fillStyle = boss ? '#fde047' : '#38bdf8';
      ctx.beginPath(); ctx.ellipse(-r * .15, -r * .25, r * .11, r * .07, -.2, 0, 7); ctx.ellipse(r * .15, -r * .25, r * .11, r * .07, .2, 0, 7); ctx.fill();
      if (boss) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.moveTo(-r * .38, -r * .78); ctx.lineTo(-r * .44, -r * 1.18); ctx.lineTo(-r * .12, -r * .94); ctx.lineTo(0, -r * 1.26); ctx.lineTo(r * .12, -r * .94); ctx.lineTo(r * .44, -r * 1.18); ctx.lineTo(r * .38, -r * .78); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    rover: function (ctx, x, y, r, o) {
      o = o || {}; r = r || 11; var c = o.color || '#38bdf8', ang = o.ang || 0;
      ctx.save(); ctx.translate(x, y);
      if (FX) FX.shadow(ctx, 0, r * .65, r * .95, r * .4, .32);
      ctx.rotate(ang);
      var cg = ctx.createRadialGradient(-r * .25, -r * .25, 1, 0, 0, r); cg.addColorStop(0, shade(c, .35)); cg.addColorStop(1, shade(c, -.22));
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
      // Glowing directional visor + pointer nose
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(r * .28, 0, r * .34, r * .48, 0, 0, 7); ctx.fill();
      ctx.fillStyle = o.player ? '#fef08a' : '#fca5a5'; ctx.beginPath(); ctx.ellipse(r * .34, 0, r * .18, r * .32, 0, 0, 7); ctx.fill();
      if (o.player) {
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(r * 1.65, 0); ctx.lineTo(r * 1.05, -r * .48); ctx.lineTo(r * 1.05, r * .48); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    moleSvg: function (kind, helm) {
      if (kind === 'bomb') return '<svg viewBox="0 0 64 64" width="1em" height="1em" style="display:block"><defs><radialGradient id="mb" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="#64748b"/><stop offset="100%" stop-color="#0f172a"/></radialGradient></defs><path d="M36 14 Q46 4 54 12" stroke="#d97706" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="54" cy="12" r="6" fill="#f97316"/><circle cx="54" cy="12" r="3" fill="#fef08a"/><rect x="26" y="13" width="12" height="7" rx="2" fill="#475569"/><circle cx="32" cy="39" r="20" fill="url(#mb)" stroke="#ef4444" stroke-width="2.5"/><path d="M24 31 L40 47 M40 31 L24 47" stroke="#fca5a5" stroke-width="4" stroke-linecap="round"/></svg>';
      if (kind === 'bunny') return '<svg viewBox="0 0 64 64" width="1em" height="1em" style="display:block"><ellipse cx="22" cy="18" rx="6" ry="15" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><ellipse cx="42" cy="18" rx="6" ry="15" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><ellipse cx="22" cy="19" rx="3" ry="10" fill="#fda4af"/><ellipse cx="42" cy="19" rx="3" ry="10" fill="#fda4af"/><circle cx="32" cy="40" r="19" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/><circle cx="24" cy="38" r="3.4" fill="#0f172a"/><circle cx="40" cy="38" r="3.4" fill="#0f172a"/><circle cx="25" cy="36.8" r="1.2" fill="#fff"/><circle cx="41" cy="36.8" r="1.2" fill="#fff"/><ellipse cx="32" cy="44" rx="3.5" ry="2.4" fill="#fb7185"/><circle cx="19" cy="44" r="3.5" fill="rgba(251,113,133,.35)"/><circle cx="45" cy="44" r="3.5" fill="rgba(251,113,133,.35)"/></svg>';
      var body = kind === 'gold' ? '#f59e0b' : kind === 'ice' ? '#38bdf8' : kind === 'boss' ? '#9333ea' : '#92400e';
      var belly = kind === 'gold' ? '#fef08a' : kind === 'ice' ? '#e0f2fe' : kind === 'boss' ? '#e9d5ff' : '#fde68a';
      var hat = kind === 'boss' ? '<polygon points="16,22 14,7 25,15 32,4 39,15 50,7 48,22" fill="#facc15" stroke="#b45309" stroke-width="1.5"/>'
        : helm ? '<path d="M13 28 A19 16 0 0 1 51 28 Z" fill="#facc15" stroke="#ca8a04" stroke-width="2"/><rect x="11" y="26" width="42" height="5" rx="2.5" fill="#eab308"/><circle cx="32" cy="18" r="4" fill="#fef9c3"/>' : '';
      return '<svg viewBox="0 0 64 64" width="1em" height="1em" style="display:block"><ellipse cx="32" cy="42" rx="21" ry="20" fill="' + body + '"/><ellipse cx="32" cy="49" rx="13" ry="11" fill="' + belly + '"/>' + hat + '<circle cx="23" cy="36" r="3.5" fill="#0f172a"/><circle cx="41" cy="36" r="3.5" fill="#0f172a"/><circle cx="24" cy="34.8" r="1.2" fill="#fff"/><circle cx="42" cy="34.8" r="1.2" fill="#fff"/><ellipse cx="32" cy="42" rx="5.5" ry="3.8" fill="#fb7185"/><rect x="28.5" y="46" width="3.2" height="4.5" rx="1" fill="#fff"/><rect x="32.3" y="46" width="3.2" height="4.5" rx="1" fill="#fff"/></svg>';
    }
  };
  UI.sprites = S;
}());
