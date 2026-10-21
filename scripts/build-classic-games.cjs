// Source for these five standalone packages lives in scripts/classics/.
// Embed every asset: the Android downloader only needs index.html and meta.json.
const fs = require('node:fs');
const CLASSIC_VERSION = 3;
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('./game-ui/catalog.cjs');
const challenges = require('./game-ui/challenges.cjs');
const { uiBlock } = require('./game-ui/block.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const css = read('classics/shell.css');
const common = read('classics/shell.js');
const uiCss = read('game-ui/base.css');
const runtime = read('game-ui/runtime.js');
const check = process.argv.includes('--check');
for (const id of ['connectfour','colorlines','yahtzee','columns','pyramid']) {
  const g = require('./classics/' + id + '.cjs');
  const {theme, palette} = catalog[id];
  const vars = ['page','surface','soft','ink','muted','accent','on-accent','line','stage'].map((key,i) => `--${key}:${palette[i]}`).join(';');
  const config = {id, name:g.meta.name, theme, icon:g.meta.icon, challenge:challenges[id].text};
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${g.meta.name}</title><style>${css}\n${g.css || ''}
@media(max-height:700px){.columns-frame #cv{height:42svh}.pyramid-stage canvas{max-height:33svh}}
</style>${uiBlock(id, g.meta)}</head><body>
<main class="wrap">
<header class="topbar"><div><span class="edition">经典游乐场</span><h1>${g.meta.name}</h1></div><div class="tools"><button id="soundBtn" class="iconbtn" aria-label="切换音效">♪</button><button id="pauseBtn" class="iconbtn" aria-label="暂停游戏" disabled>Ⅱ</button></div></header>
<div class="stats"><div><span>得分</span><b id="scoreV">0</b></div><div><span>最佳纪录</span><b id="bestV">0</b></div><div><span id="extraLabel">${g.extraLabel}</span><b id="extraV">—</b></div></div>
<p id="status" class="status" role="status">${g.tagline}</p>
${g.board}
<div class="controls">${g.controls || ''}</div>
<p class="hint">${g.hint}</p>
</main>
<section id="startScreen" class="overlay"><h2>${g.meta.name}</h2><p>${g.rules}</p><button id="startBtn" class="btn">开始游戏</button></section>
<section id="pauseScreen" class="overlay hidden"><h2>休息一下</h2><p>进度已暂停，准备好再继续。</p><button id="resumeBtn" class="btn">继续游戏</button><button id="restartBtn" class="ghost">重新开始</button></section>
<section id="endScreen" class="overlay hidden"><h2 id="endTitle">本局结束</h2><p id="endText"></p><button id="againBtn" class="btn">再玩一局</button><button id="menuBtn" class="ghost">返回菜单</button></section>
${g.extraHtml || ''}
<script>
const GAME_ID=${JSON.stringify(id)};
${common}
${g.script}
ui.init();
</script></body></html>
`;
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(m[1], {filename:id});
  const dir = path.join(root,'games',id);
  // 发布已有经典游戏的改动时递增此版本号（2026-10-20 热修：共用界面遮罩修复 → 2；同日皮肤 B 霓虹糖果 → 3）
  const meta = JSON.stringify({...g.meta, id, version:CLASSIC_VERSION, category:'经典重温', studio:'Muse'},null,2)+'\n'; // 五款经典由 Muse 制作（见 docs/studio-audit-2026-10-21.md）
  if (check) {
    if (!fs.existsSync(path.join(dir,'index.html')) || fs.readFileSync(path.join(dir,'index.html'),'utf8').replace(/\r\n/g,'\n') !== html || fs.readFileSync(path.join(dir,'meta.json'),'utf8').replace(/\r\n/g,'\n') !== meta) throw new Error(`Regenerate ${id}: node scripts/build-classic-games.cjs`);
  } else {
    fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,'index.html'),html); fs.writeFileSync(path.join(dir,'meta.json'),meta);
  }
  console.log(`${check?'Verified':'Built'} ${id}`);
}
