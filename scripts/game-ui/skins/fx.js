// GameUI.fx: tiny canvas depth helpers (bevelled tiles, glossy orbs, contact shadows).
// Shapes are pre-rendered into cached sprites so a frame costs one drawImage per piece,
// which keeps low-end Android WebView at 60fps. Games call them only when GameUI.fx.on.
(function () {
  var root = document.documentElement, skin = root.dataset.skin || '';
  var cache = {}, size = 0;
  function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join(''); return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function shade(h, t) { // t>0 lightens towards white, t<0 darkens towards black
    if (h.charAt(0) !== '#') return h;
    var c = rgb(h), e = t > 0 ? 255 : 0, a = Math.abs(t);
    return 'rgb(' + c.map(function (v) { return Math.round(v + (e - v) * a); }).join(',') + ')';
  }
  function rgba(h, a) { var c = rgb(h); return 'rgba(' + c.join(',') + ',' + a + ')'; }
  function scaleOf(ctx) { var m = ctx.getTransform ? ctx.getTransform() : null; return m ? Math.max(1, Math.abs(m.a)) : 1; }
  function sprite(key, w, h, pad, s, paint) {
    key += '|' + s; var c = cache[key];
    if (!c) {
      if (size > 400) { cache = {}; size = 0; }
      c = document.createElement('canvas');
      c.width = Math.ceil((w + pad * 2) * s); c.height = Math.ceil((h + pad * 2) * s);
      var g = c.getContext('2d'); g.scale(s, s); g.translate(pad, pad); paint(g);
      cache[key] = c; size++;
    }
    return c;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function tileArt(g, w, h, color, r) {
    if (skin === 'b') { // candy bevel: dark rim, light top-left facet, glossy face
      rr(g, 0, 2, w, h, r); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
      rr(g, 0, 0, w, h, r); g.fillStyle = shade(color, -.42); g.fill();
      var bev = g.createLinearGradient(0, 0, w, h); bev.addColorStop(0, shade(color, .55)); bev.addColorStop(.5, color); bev.addColorStop(1, shade(color, -.3));
      rr(g, 1, 1, w - 2, h - 2, r * .9); g.fillStyle = bev; g.fill();
      var i = Math.max(2, w * .14), face = g.createLinearGradient(0, i, 0, h - i);
      face.addColorStop(0, shade(color, .22)); face.addColorStop(1, shade(color, -.08));
      rr(g, i, i, w - i * 2, h - i * 2, r * .6); g.fillStyle = face; g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(w * .3, h * .27, w * .13, h * .07, -.5, 0, 7); g.fill();
    } else { // soft 3D: drop shadow, vertical light falloff, top gloss band
      g.shadowColor = 'rgba(0,0,0,.32)'; g.shadowBlur = Math.max(2, w * .18); g.shadowOffsetY = Math.max(1, h * .08);
      var body = g.createLinearGradient(0, 0, 0, h); body.addColorStop(0, shade(color, .28)); body.addColorStop(.55, color); body.addColorStop(1, shade(color, -.22));
      rr(g, 0, 0, w, h, r); g.fillStyle = body; g.fill(); g.shadowColor = 'transparent';
      var gloss = g.createLinearGradient(0, 0, 0, h * .5); gloss.addColorStop(0, 'rgba(255,255,255,.45)'); gloss.addColorStop(1, 'rgba(255,255,255,0)');
      rr(g, w * .08, h * .06, w * .84, h * .42, r * .7); g.fillStyle = gloss; g.fill();
      rr(g, .5, .5, w - 1, h - 1, r); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1; g.stroke();
    }
  }
  function orbArt(g, r, color, pad) {
    var cx = r, cy = r;
    g.fillStyle = 'rgba(0,0,0,' + (skin === 'b' ? .34 : .26) + ')'; g.beginPath(); g.ellipse(cx + r * .12, cy + r * .78, r * .82, r * .32, 0, 0, 7); g.fill();
    var body = g.createRadialGradient(cx - r * .38, cy - r * .42, r * .08, cx, cy, r);
    body.addColorStop(0, shade(color, .75)); body.addColorStop(.28, shade(color, .18)); body.addColorStop(.75, color); body.addColorStop(1, shade(color, -.45));
    g.fillStyle = body; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    if (skin === 'b') { // rim light + crisp specular for the candy look
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1, r * .1); g.beginPath(); g.arc(cx, cy, r * .82, .35 * Math.PI, .75 * Math.PI); g.stroke();
      g.strokeStyle = shade(color, -.55); g.lineWidth = Math.max(1, r * .08); g.beginPath(); g.arc(cx, cy, r - g.lineWidth / 2, 0, 7); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(cx - r * .35, cy - r * .42, r * .22, r * .14, -.6, 0, 7); g.fill();
  }
  var fx = {
    on: !!skin, skin: skin, shade: shade, rgba: rgba,
    tile: function (ctx, x, y, w, h, color, r) {
      r = r == null ? Math.min(w, h) * (skin === 'b' ? .24 : .2) : r;
      var pad = Math.ceil(w * .25) + 2, s = scaleOf(ctx);
      ctx.drawImage(sprite('t' + color + w + 'x' + h + 'r' + r, w, h, pad, s, function (g) { tileArt(g, w, h, color, r); }), x - pad, y - pad, w + pad * 2, h + pad * 2);
    },
    orb: function (ctx, x, y, r, color) {
      var pad = Math.ceil(r * .5) + 2, s = scaleOf(ctx);
      ctx.drawImage(sprite('o' + color + r, r * 2, r * 2, pad, s, function (g) { orbArt(g, r, color, pad); }), x - r - pad, y - r - pad, r * 2 + pad * 2, r * 2 + pad * 2);
    },
    // Soft elliptical contact shadow under any sprite (emoji, characters, pieces).
    shadow: function (ctx, x, y, rx, ry, a) {
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,' + (a == null ? .28 : a) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); ctx.restore();
    },
    // Lit stage background: vertical gradient plus a vignette. Cached per size/colours.
    stage: function (ctx, w, h, top, bottom) {
      var s = scaleOf(ctx);
      ctx.drawImage(sprite('s' + w + 'x' + h + top + bottom, w, h, 0, s, function (g) {
        var lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, top); lg.addColorStop(1, bottom); g.fillStyle = lg; g.fillRect(0, 0, w, h);
        var v = g.createRadialGradient(w / 2, h * .35, Math.min(w, h) * .2, w / 2, h / 2, Math.max(w, h) * .75);
        v.addColorStop(0, 'rgba(255,255,255,' + (skin === 'b' ? .10 : .07) + ')'); v.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
      }), 0, 0, w, h);
    },
    // Glow is shadowBlur: cheap for a handful of shapes, never use it on every tile.
    glow: function (ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; },
    noGlow: function (ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; },
    // Crisp rendering on high-DPI phones without changing game coordinates.
    // Only safe where input code converts with getBoundingClientRect + logical W/H, not cv.width.
    hidpi: function (cv, ctx, w, h) {
      var d = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
      cv.width = Math.round(w * d); cv.height = Math.round(h * d); // intrinsic ratio stays w:h, so CSS sizing is unchanged
      ctx.setTransform(d, 0, 0, d, 0, 0); return d;
    },
    // Lightweight particle bursts (pooled array, no allocations per frame beyond the burst).
    burst: function (list, x, y, color, n) {
      for (var i = 0; i < (n || 12); i++) { var a = Math.random() * 6.283, v = 1 + Math.random() * 2.6; list.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, c: color, r: 1.5 + Math.random() * 2.5 }); }
    },
    drawBurst: function (ctx, list) {
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i]; p.x += p.vx; p.y += p.vy; p.vy += .12; p.life -= .035;
        if (p.life <= 0) { list.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (skin === 'b' ? 1.2 : 1), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };
  window.GameUI.fx = fx;
}());
