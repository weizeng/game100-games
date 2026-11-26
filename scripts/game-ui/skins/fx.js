// GameUI.fx: studio-lit canvas depth helpers (ceramic tiles, luminous orbs, atmospheric stages, sparkles).
// Shapes are pre-rendered into cached sprites so a frame costs one drawImage per piece,
// keeping low-end Android WebView at 60fps. Games call them only when GameUI.fx.on.
(function () {
  var root = document.documentElement, skin = root.dataset.skin || '';
  var cache = {}, size = 0;
  function rgb(h) {
    if (h.charAt(0) !== '#') return [120, 140, 170];
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); });
  }
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
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w * .5, h * .5));
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r);
    else g.rect(x, y, w, h);
  }
  function tileArt(g, w, h, color, r) {
    if (color.charAt(0) !== '#') {
      rr(g, 0, 0, w, h, r); g.fillStyle = color; g.fill();
      rr(g, .5, .5, w - 1, h - 1, r); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.stroke();
      return;
    }
    // Refined ceramic/gem bevel: soft ambient lift, smooth face gradient, delicate specular rim
    g.save();
    g.shadowColor = 'rgba(8,14,28,.28)'; g.shadowBlur = Math.max(3, Math.min(8, w * .18)); g.shadowOffsetY = Math.max(1.5, Math.min(3, h * .08));
    var body = g.createLinearGradient(0, 0, 0, h);
    body.addColorStop(0, shade(color, .28));
    body.addColorStop(.52, color);
    body.addColorStop(1, shade(color, -.24));
    rr(g, 0, 0, w, h, r); g.fillStyle = body; g.fill();
    g.restore();
    // Subtle inner depth & crisp upper sheen
    var gloss = g.createLinearGradient(0, 0, 0, h * .48);
    gloss.addColorStop(0, 'rgba(255,255,255,.36)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    rr(g, 1.2, 1.2, Math.max(0, w - 2.4), Math.max(0, h * .46), Math.max(0, r - 1));
    g.fillStyle = gloss; g.fill();
    // Delicate bottom anchor edge + luminous hairline rim
    rr(g, .6, .6, Math.max(0, w - 1.2), Math.max(0, h - 1.2), Math.max(0, r - .4));
    g.strokeStyle = 'rgba(255,255,255,.26)'; g.lineWidth = 1; g.stroke();
    if (h >= 10) {
      g.fillStyle = 'rgba(0,0,0,.16)';
      rr(g, 1.5, h - 2.5, Math.max(0, w - 3), 2, 1); g.fill();
    }
  }
  function orbArt(g, r, color) {
    var cx = r, cy = r;
    // Soft grounded contact shadow
    g.fillStyle = 'rgba(8,14,28,.22)';
    g.beginPath(); g.ellipse(cx, cy + r * .86, r * .76, r * .24, 0, 0, 7); g.fill();
    // Luminous studio-lit sphere
    var body = g.createRadialGradient(cx - r * .34, cy - r * .36, r * .06, cx, cy, r);
    body.addColorStop(0, shade(color, .72));
    body.addColorStop(.26, shade(color, .24));
    body.addColorStop(.74, color);
    body.addColorStop(1, shade(color, -.36));
    g.fillStyle = body; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    // Warm reflected bounce rim along bottom-right
    g.strokeStyle = 'rgba(255,255,255,.38)'; g.lineWidth = Math.max(1, r * .09);
    g.beginPath(); g.arc(cx, cy, r * .84, .18 * Math.PI, .72 * Math.PI); g.stroke();
    // Crisp specular pinpoint + soft glow dot
    g.fillStyle = 'rgba(255,255,255,.82)';
    g.beginPath(); g.ellipse(cx - r * .33, cy - r * .37, r * .2, r * .12, -.62, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)';
    g.beginPath(); g.arc(cx - r * .12, cy - r * .52, Math.max(.8, r * .07), 0, 7); g.fill();
  }
  var fx = {
    on: !!skin, skin: skin, shade: shade, rgba: rgba,
    tile: function (ctx, x, y, w, h, color, r) {
      if (w <= 0 || h <= 0) return;
      r = r == null ? Math.min(w, h) * .22 : r;
      var pad = Math.ceil(Math.min(10, w * .22)) + 2, s = scaleOf(ctx);
      ctx.drawImage(sprite('t' + color + (w | 0) + 'x' + (h | 0) + 'r' + (r | 0), w, h, pad, s, function (g) { tileArt(g, w, h, color, r); }), x - pad, y - pad, w + pad * 2, h + pad * 2);
    },
    orb: function (ctx, x, y, r, color) {
      if (r <= 0) return;
      var pad = Math.ceil(r * .38) + 2, s = scaleOf(ctx);
      ctx.drawImage(sprite('o' + color + (r | 0), r * 2, r * 2, pad, s, function (g) { orbArt(g, r, color); }), x - r - pad, y - r - pad, r * 2 + pad * 2, r * 2 + pad * 2);
    },
    // Soft elliptical contact shadow under any sprite (characters, pieces).
    shadow: function (ctx, x, y, rx, ry, a) {
      ctx.save(); ctx.fillStyle = 'rgba(8,14,28,' + (a == null ? .24 : a) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); ctx.restore();
    },
    // Atmospheric lit stage backdrop: rich vertical gradient + upper soft key-light + gentle depth vignette.
    stage: function (ctx, w, h, top, bottom) {
      var s = scaleOf(ctx);
      ctx.drawImage(sprite('s' + (w | 0) + 'x' + (h | 0) + top + bottom, w, h, 0, s, function (g) {
        var lg = g.createLinearGradient(0, 0, 0, h);
        lg.addColorStop(0, top); lg.addColorStop(1, bottom);
        g.fillStyle = lg; g.fillRect(0, 0, w, h);
        var key = g.createRadialGradient(w * .5, h * .22, 0, w * .5, h * .28, Math.max(w, h) * .72);
        key.addColorStop(0, 'rgba(255,255,255,.12)');
        key.addColorStop(.55, 'rgba(255,255,255,.02)');
        key.addColorStop(1, 'rgba(4,8,18,.24)');
        g.fillStyle = key; g.fillRect(0, 0, w, h);
      }), 0, 0, w, h);
    },
    // Glow is shadowBlur: cheap for a handful of shapes, never use it on every tile.
    glow: function (ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; },
    noGlow: function (ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; },
    // Crisp rendering on high-DPI phones without changing game coordinates.
    hidpi: function (cv, ctx, w, h) {
      var d = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0); return d;
    },
    // Crisp sparkly particle bursts (glint diamonds + glowing sparks).
    burst: function (list, x, y, color, n) {
      for (var i = 0; i < (n || 12); i++) {
        var a = Math.random() * 6.283, v = 1.2 + Math.random() * 2.8;
        list.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.1, life: 1, c: color, r: 1.6 + Math.random() * 2.4, star: i % 3 === 0 });
      }
    },
    drawBurst: function (ctx, list) {
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i]; p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy += .11; p.life -= .034;
        if (p.life <= 0) { list.splice(i, 1); continue; }
        var r = p.r * (.45 + p.life * .75);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.c;
        if (p.star) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - r * 1.6); ctx.lineTo(p.x + r * .55, p.y - r * .55);
          ctx.lineTo(p.x + r * 1.6, p.y); ctx.lineTo(p.x + r * .55, p.y + r * .55);
          ctx.lineTo(p.x, p.y + r * 1.6); ctx.lineTo(p.x - r * .55, p.y + r * .55);
          ctx.lineTo(p.x - r * 1.6, p.y); ctx.lineTo(p.x - r * .55, p.y - r * .55);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
          ctx.globalAlpha = p.life * .7; ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(p.x, p.y, r * .42, 0, 7); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  };
  window.GameUI.fx = fx;
}());
