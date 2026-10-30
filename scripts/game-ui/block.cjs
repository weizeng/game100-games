// Builds the inlined GAME UI block (palette vars + base.css + skin + runtime) shared by
// sync-game-ui.cjs and build-classic-games.cjs so both produce byte-identical output.
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('./catalog.cjs');
const challenges = require('./challenges.cjs');
const custom = require('./custom.cjs');
const skins = require('./skins/index.cjs');
const css = fs.readFileSync(path.join(__dirname, 'base.css'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, 'runtime.js'), 'utf8');
// 默认皮肤：B「霓虹糖果」（2026-10-20 起）。传 'none' 可生成无皮肤版本做对比。
const DEFAULT_SKIN = 'b';
function uiBlock(id, meta, skinArg) {
  const skin = skinArg === 'none' ? '' : (skinArg || DEFAULT_SKIN);
  const { theme, palette } = catalog[id];
  let vars = ['page','surface','soft','ink','muted','accent','on-accent','line','stage'].map((v,i) => `--${v}:${palette[i]}`).join(';');
  if (skin) vars += ';' + Object.entries(skins.vars(skin, theme, palette)).map(([k, v]) => `--${k}:${v}`).join(';');
  // 没有进阶规则的游戏（如科学实验）也接入皮肤，只是不显示模式切换。
  const config = { id, name: meta.name, theme, icon: meta.icon, challenge: challenges[id] ? challenges[id].text : null };
  if (skin) config.skin = skin;
  const script = runtime.replace('__GAME_UI_CONFIG__', () => JSON.stringify(config)) + (skin ? '\n' + skins.fx() : '');
  return `\n<!-- GAME UI BEGIN -->\n<style>\n:root{${vars}}\n${css}\n${custom[id] || ''}\n${skin ? skins.css(skin) + '\n' : ''}</style>\n<script>\n${script}\n</script>\n<!-- GAME UI END -->\n`.replace(/\r\n/g, '\n');
}
module.exports = { uiBlock, DEFAULT_SKIN };
