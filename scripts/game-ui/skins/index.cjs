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

// Direction B uses its own bold per-theme palette: [bgTop,bgBottom,panel,panelEdge,ink,muted,button,buttonEdge,glow]
const B = {
  wood:    ['#ffcf6b','#f0803c','#fff7e6','#f1a54f','#4a2a12','#86603d','#3fc163','#22863d','#ffe08a'],
  paper:   ['#72cbff','#3b62ef','#ffffff','#9cc2ff','#1d2d5a','#5a6b93','#ffb21e','#d97a00','#bfe6ff'],
  garden:  ['#93e46c','#16a37a','#f6fff0','#7fd06b','#1b4a2c','#4f7a5b','#ffcc29','#d48a00','#d8ffb0'],
  candy:   ['#ff8ac6','#8d58ff','#fff4fb','#ff9fd0','#5a1f55','#91517f','#ffcf33','#e08600','#ffd6f0'],
  ice:     ['#8fe6ff','#4c86ff','#f4fdff','#9fe1ff','#123c63','#4f7193','#ff9f2e','#d8650a','#d6f7ff'],
  sky:     ['#86d8ff','#5875ff','#ffffff','#a7c8ff','#1f2f66','#56679a','#ffd02e','#d98b00','#e0f2ff'],
  kitchen: ['#ffb58a','#ff5f6d','#fff6ee','#ffad8a','#5a2318','#8e5446','#ffd34d','#d98a00','#ffe2c4'],
  space:   ['#2a1166','#05051a','#1a1446','#7a5cff','#f2f0ff','#b6b0e6','#00d9ff','#0077b8','#7a5cff'],
  arcade:  ['#3a0d5e','#0b0620','#211040','#ff3d9a','#fff3fb','#d4b6dd','#ff3d9a','#a3124f','#00e5ff'],
  ocean:   ['#0b4a6e','#03121f','#0c2a40','#2ee6d6','#e8fbff','#a6cfd8','#2ee6d6','#0c8a8a','#7af5ff'],
  magic:   ['#4a1a7a','#0d0620','#22113f','#b26bff','#f6eeff','#c9b6e6','#b26bff','#5a22a8','#ff8af0'],
  lab:     ['#0f3256','#03101f','#0f2742','#33e1a0','#eafffb','#a6c7cf','#33e1a0','#0f8a5a','#4fc3f7'],
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
  const btnHi = mix(btn, '#ffffff', .35);
  // 主按钮：白字在按钮最亮处（渐变顶部）也要 ≥3:1（19px 粗体属大字），否则改用深色字。
  const whiteOk = contrast('#ffffff', btnHi) >= 3 && contrast('#ffffff', btn) >= 3;
  const btnInk = whiteOk ? '#ffffff' : ensure(mix(bedge, '#000000', .45), [btn, btnHi], 4.5);
  // 分数徽章字更小（≤16px），按 4.5:1 计算
  const coinInk = contrast('#ffffff', btnHi) >= 4.5 && contrast('#ffffff', btn) >= 4.5 ? '#ffffff' : ensure(mix(bedge, '#000000', .45), [btn, btnHi], 4.5);
  const keySurface = dark ? panel : '#ffffff', keyLow = dark ? panel : mix(panel, pedge, .25);
  const bAccent = dark ? btn : ensure(mix(btn, '#000000', .18), [panel, keyLow], 4.5);
  return {
    // Remap the base palette so every base.css rule follows the new look.
    page: b2, surface: panel, soft: dark ? mix(panel, '#ffffff', .08) : keyLow, ink: bink, muted: ensure(bmuted, [panel, keyLow], 4.5, dark ? '#ffffff' : '#000000'),
    accent: bAccent, 'on-accent': dark ? '#0b0620' : '#ffffff', line: pedge,
    'b-bg1': b1, 'b-bg2': b2, 'b-btn': btn, 'b-btn-hi': btnHi, 'b-edge': bedge,
    'b-glow': glow, 'b-glow-rgb': rgb(glow), 'b-pedge-rgb': rgb(pedge),
    'b-btn-ink': btnInk,
    'b-btn-tsh': btnInk === '#ffffff' ? `0 2px 0 ${bedge},1px 0 0 ${bedge},-1px 0 0 ${bedge},0 -1px 0 ${bedge}` : '0 1px 0 rgba(255,255,255,.45)',
    'b-coin-ink': coinInk, 'b-coin-tsh': coinInk === '#ffffff' ? `0 1px 0 ${bedge}` : 'none',
    'b-key-ink': dark ? ensure(glow, [panel], 4.5, '#ffffff') : ensure(bAccent, [keySurface, keyLow], 4.5),
    'b-title': dark ? '#ffffff' : ensure(mix(bedge, '#000000', .15), [panel, keyLow], 4.5),
  };
}
const css = skin => fs.readFileSync(path.join(__dirname, `skin-${skin}.css`), 'utf8');
const fx = () => fs.readFileSync(path.join(__dirname, 'fx.js'), 'utf8');
module.exports = { vars, css, fx, mix, DARK, contrast, B };
