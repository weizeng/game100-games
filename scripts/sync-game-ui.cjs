const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('./game-ui/catalog.cjs');
const { uiBlock } = require('./game-ui/block.cjs');
const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
// --skin=b|a|none 指定皮肤（默认 b）；--out=DIR 输出到其他目录（预览/对比用，不改仓库）。
const skinArg = (process.argv.find(arg => arg.startsWith('--skin=')) || '').slice(7) || undefined;
const outArg = process.argv.find(arg => arg.startsWith('--out='));
const outRoot = outArg ? path.resolve(outArg.slice(6)) : null;
let processed = 0;
let stale = [], changed = 0;
const unregistered = [];
const strict = process.argv.includes('--strict');
for (const id of fs.readdirSync(path.join(root, 'games'))) {
  if (only && !only.has(id)) continue;
  processed++;
  // 未登记 catalog 的游戏跳过并汇总提示；--strict 时视为失败。进阶规则（challenges）可选。
  if (!catalog[id]) { if (only) throw new Error(`Missing game configuration: ${id}`); unregistered.push(id); processed--; continue; }
  const file = path.join(root, 'games', id, 'index.html');
  const original = fs.readFileSync(file, 'utf8');
  let html = original.replace(/\r\n/g, '\n').replace(/\n<!-- GAME UI BEGIN -->[\s\S]*?<!-- GAME UI END -->\n/g, '\n');
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'games', id, 'meta.json'), 'utf8'));
  const block = uiBlock(id, meta, skinArg);
  html = html.replace(/\n*<\/head>/, () => block + '</head>');
  // Syntax validation catches mistakes in both source and injected scripts.
  for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1], { filename: id });
  if (outRoot || html !== original.replace(/\r\n/g, '\n')) {
    stale.push(id);
    if (!check) {
      const dest = outRoot ? path.join(outRoot, 'games', id, 'index.html') : file;
      fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, html); changed++;
      if (outRoot) fs.copyFileSync(path.join(root, 'games', id, 'meta.json'), path.join(path.dirname(dest), 'meta.json'));
    }
  }
}
if (unregistered.length) {
  console.warn(`Skipped ${unregistered.length} games without scripts/game-ui catalog entries: ${unregistered.sort().join(', ')}`);
  if (strict) process.exitCode = 1;
}
if (check && stale.length) { console.error('Run node scripts/sync-game-ui.cjs:', stale.join(', ')); process.exitCode = 1; }
else console.log(`${check ? 'Verified' : 'Updated'} ${check ? processed : changed} standalone game interfaces.`);
