// Visual skins layered on top of base.css. Colours are derived here (Node) rather than with
// CSS color-mix(), so Android WebView builds older than Chrome 111 render identically.
const fs = require('node:fs');
const path = require('node:path');
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const rgb = h => hex(h).join(',');
const DARK = new Set(['space', 'arcade', 'lab', 'ocean', 'magic']);
// WCAG 对比度：保证按钮/徽章/标题文字可读（大字 ≥3:1，小字 ≥4.5:1）。
const lum = h => { const c = hex(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// Darken (or lighten) fg step by step until it reaches the ratio against every background.
const ensure = (fg, bgs, ratio, toward = '#000000') => { let c = fg; for (let t = 0; t <= 1.0001; t += .05) { c = mix(fg, toward, t); if (bgs.every(b => contrast(c, b) >= ratio)) return c; } return c; };

// Refined Boutique Arcade palettes: [bgTop,bgBottom,panel,panelEdge,ink,muted,button,buttonEdge,glow]
const B = {
  wood:    ['#f5ead6','#e4d0b2','#fffdf9','#cbb18c','#2d2014','#6c5842','#2c9c5c','#1a6b3c','#f2d49b'],
  paper:   ['#eef3fc','#dbe5f6','#ffffff','#b7cae6','#17243d','#526482','#2b6ef2','#184bb8','#c7ddff'],
  garden:  ['#e4f4eb','#c4e6d4','#fafefc','#8fc6aa','#143625','#456b58','#1e9e64','#116b42','#b9f0d2'],
  candy:   ['#fae9f3','#ead8f6','#fffbfd','#d7b5e3','#3a1c42','#73527c','#e54887','#b0265e','#f8c6e0'],
  ice:     ['#e7f5fd','#c9e4f7','#fafdff','#9cc8e6','#102e47','#486a85','#0e89e3','#085ca0','#bfe8ff'],
  sky:     ['#e5f2ff','#c7dffb','#ffffff','#9fc1ec','#182b4d','#506587','#2472f2','#144eb5','#c5e2ff'],
  kitchen: ['#fdf0e5','#f4d6c0','#fffcf8','#deb290','#422114','#7d5240','#e3642d','#ae4114','#ffd7b8'],
  space:   ['#131a3a','#070b1a','#141c38','#4b66bd','#eef3ff','#9ba9cf','#22c4ed','#0e7da1','#6ecbff'],
  arcade:  ['#1b1433','#0b0817','#19132e','#7252cc','#f5f2ff','#a99fcb','#f54988','#b5245a','#5ce1e6'],
  ocean:   ['#0b2c3e','#05131e','#0d2536','#2b84a1','#e8f9fc','#8db8c7','#1bd1c2','#0d827c','#6ff2eb'],
  magic:   ['#21143e','#0d071e','#1c1234','#7f59cc','#f5f0ff','#b2a3d4','#9a6bff','#6238bd','#e0aaff'],
  lab:     ['#0f2438','#07111d','#102235','#2e7291','#eaf7ff','#8fb3c9','#1fd496','#0d875e','#56c8f5'],
};

function vars(skin, theme, palette) {
  const [page, surface, soft, ink, muted, accent, onAccent, line] = palette;
  const dark = DARK.has(theme);
  if (skin === 'a') {
    return {
      'accent-hi': mix(accent, '#ffffff', .28), 'accent-lo': mix(accent, '#000000', .25),
      'accent-rgb': rgb(accent), 'ink-rgb': rgb(ink), 'page-hi': mix(page, '#ffffff', dark ? .06 : .55),
      'page-lo': mix(page, accent, dark ? .10 : .12), 'tint': mix(page, accent, dark ? .28 : .22),
      'hl': dark ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.9)', 'sh-rgb': dark ? '0,0,0' : rgb(mix(ink, accent, .3)),
      'glass': dark ? 'rgba(' + rgb(surface) + ',.78)' : 'rgba(255,255,255,.72)',
    };
  }
  const [b1, b2, panel, pedge, bink, bmuted, btn, bedge, glow] = B[theme];
  const btnHi = mix(btn, '#ffffff', dark ? .22 : .24);
  // 主按钮：白字在按钮最亮处（渐变顶部）也要 ≥3:1（19px 粗体属大字），否则改用深色字。
  const whiteOk = contrast('#ffffff', btnHi) >= 3 && contrast('#ffffff', btn) >= 3;
  const btnInk = whiteOk ? '#ffffff' : ensure(mix(bedge, '#000000', .45), [btn, btnHi], 4.5);
  // 分数徽章字更小（≤16px），按 4.5:1 计算
  const coinInk = contrast('#ffffff', btnHi) >= 4.5 && contrast('#ffffff', btn) >= 4.5 ? '#ffffff' : ensure(mix(bedge, '#000000', .45), [btn, btnHi], 4.5);
  const keySurface = dark ? mix(panel, '#ffffff', .06) : '#ffffff';
  const keyLow = dark ? panel : mix(panel, pedge, .14);
  const bAccent = dark ? btn : ensure(mix(btn, '#000000', .14), [panel, keyLow], 4.5);
  const hintInk = dark ? ensure(mix(bink, '#ffffff', .15), [b1, b2], 4.5, '#ffffff') : ensure(bink, [b1, b2], 4.5, '#000000');
  return {
    // Remap the base palette so every base.css rule follows the refined modern look.
    page: b2, surface: panel, soft: dark ? mix(panel, '#ffffff', .07) : keyLow, ink: bink,
    muted: ensure(bmuted, [panel, keyLow], 4.5, dark ? '#ffffff' : '#000000'),
    accent: bAccent, 'on-accent': btnInk, line: pedge,
    'b-bg1': b1, 'b-bg2': b2, 'b-btn': btn, 'b-btn-hi': btnHi, 'b-edge': bedge,
    'b-glow': glow, 'b-glow-rgb': rgb(glow), 'b-pedge-rgb': rgb(pedge), 'b-btn-rgb': rgb(btn),
    'b-bg2-rgb': rgb(b2), 'b-surf-rgb': rgb(panel),
    'b-btn-ink': btnInk,
    'b-btn-tsh': btnInk === '#ffffff' ? '0 1px 2px rgba(0,0,0,.22)' : '0 1px 0 rgba(255,255,255,.35)',
    'b-coin-ink': coinInk, 'b-coin-tsh': coinInk === '#ffffff' ? '0 1px 1px rgba(0,0,0,.2)' : 'none',
    'b-key-ink': dark ? ensure(bink, [keySurface, panel], 4.5, '#ffffff') : ensure(bink, [keySurface, keyLow], 4.5, '#000000'),
    'b-title': dark ? '#ffffff' : ensure(bink, [panel, keyLow], 4.5, '#000000'),
    'b-hint-ink': hintInk,
  };
}
const css = skin => fs.readFileSync(path.join(__dirname, `skin-${skin}.css`), 'utf8');
const fx = () => fs.readFileSync(path.join(__dirname, 'fx.js'), 'utf8');
module.exports = { vars, css, fx, mix, DARK, contrast, B };
