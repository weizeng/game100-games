const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('./game-ui/catalog.cjs');
const challenges = require('./game-ui/challenges.cjs');
const custom = require('./game-ui/custom.cjs');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(__dirname, 'game-ui/base.css'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, 'game-ui/runtime.js'), 'utf8');
const check = process.argv.includes('--check');
const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
let processed = 0;
let stale = [], changed = 0;
const unregistered = [];
const strict = process.argv.includes('--strict');
for (const id of fs.readdirSync(path.join(root, 'games'))) {
  if (only && !only.has(id)) continue;
  processed++;
  // 未登记的游戏（尚未接入共用界面）跳过并汇总提示；--strict 时视为失败。
  if (!catalog[id] || !challenges[id]) { if (only) throw new Error(`Missing game configuration: ${id}`); unregistered.push(id); processed--; continue; }
  const file = path.join(root, 'games', id, 'index.html');
  const original = fs.readFileSync(file, 'utf8');
  let html = original.replace(/\r\n/g, '\n').replace(/\n<!-- GAME UI BEGIN -->[\s\S]*?<!-- GAME UI END -->\n/g, '\n');
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'games', id, 'meta.json'), 'utf8'));
  const { theme, palette } = catalog[id];
  const vars = ['page','surface','soft','ink','muted','accent','on-accent','line','stage'].map((v,i) => `--${v}:${palette[i]}`).join(';');
  const config = { id, name: meta.name, theme, icon: meta.icon, challenge: challenges[id].text };
  const script = runtime.replace('__GAME_UI_CONFIG__', JSON.stringify(config));
  const block = `\n<!-- GAME UI BEGIN -->\n<style>\n:root{${vars}}\n${css}\n${custom[id] || ''}\n</style>\n<script>\n${script}\n</script>\n<!-- GAME UI END -->\n`;
  html = html.replace(/\n*<\/head>/, block + '</head>');
  // Syntax validation catches mistakes in both source and injected scripts.
  for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1], { filename: id });
  if (html !== original.replace(/\r\n/g, '\n')) {
    stale.push(id); if (!check) { fs.writeFileSync(file, html); changed++; }
  }
}
if (unregistered.length) {
  console.warn(`Skipped ${unregistered.length} games without scripts/game-ui catalog/challenges entries: ${unregistered.sort().join(', ')}`);
  if (strict) process.exitCode = 1;
}
if (check && stale.length) { console.error('Run node scripts/sync-game-ui.cjs:', stale.join(', ')); process.exitCode = 1; }
else console.log(`${check ? 'Verified' : 'Updated'} ${check ? processed : changed} standalone game interfaces.`);
