#!/usr/bin/env node
// 清洗 games/*/meta.json 中的玩家向简介（desc）：
// 1. 清除开发者日志注记（如 "v8（Gemini 优化：...）"、"【v6 Gemini优化：...】"）
// 2. 清除冗长模板套话（如 "随时随地来一局，放松心情，打发碎片时间的最佳选择。"）
// 3. 为超短简介（<18字）优先结合游戏 #startScr 真实说明补全，不虚构玩法
// 4. 仅当 desc 实际变化时，将 meta.json 的 version + 1（遵守 AGENTS.md 规则 3）
//
// 用法：
//   node scripts/clean-meta-desc.cjs --dry-run   预览改动
//   node scripts/clean-meta-desc.cjs             正式写回

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const GAMES_DIR = path.join(ROOT, 'games');
const DRY = process.argv.includes('--dry-run');

const DEV_NOTE_RE = /Gemini|(?<![a-zA-Z])v\d+\s*[（(]|【\s*v\d+|优化[：:]|修复高刷|加宽移动端判定/;

function stripDevNotes(raw) {
  let s = String(raw || '').trim();
  // Remove bracketed/parenthesized dev logs anywhere in string
  s = s.replace(/\s*[·•\-—]?\s*【[^】]*(?:v\d+|Gemini|优化|修复|重构|升级)[^】]*】\s*/gi, ' ');
  s = s.replace(/\s*[·•\-—]?\s*(?<![a-zA-Z])v\d+\s*[（(][^）)]*[）)]\s*/gi, ' ');
  s = s.replace(/\s*[·•\-—]?\s*[（(][^）)]*(?:Gemini|优化[：:]|修复|开战单位)[^）)]*[）)]\s*/gi, ' ');
  s = s.replace(/\s*[·•\-—]\s*v\d+\b\s*/gi, ' ');

  // Remove verbose generic AI wrapper prefixes & filler suffixes (after dev notes are stripped)
  s = s.replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/^(?:快节奏街机动作|轻松休闲小|益智解谜|经典益智|动作射击|策略塔防|休闲模拟|科普科学实验|热门经典|趣味街机)游戏[「“][^」”]+[」”][：:]\s*/u, '');
  s = s.replace(/随时随地来一局[，,]放松心情[，,]打发碎片时间的最佳选择[。！!]?/g, '');
  s = s.replace(/操作简单易上手[，,]节奏刺激爽快[，,]来挑战你的反应极限[！!]?/g, '');
  s = s.replace(/精心设计的关卡层层递进[，,]越玩越上头[，,]考验你的逻辑思维和空间想象力[。！!]?/g, '');
  s = s.replace(/单手就能畅玩[，,]随时随地挑战更高纪录[。！!]?/g, '');

  // Clean dangling punctuation & excess spaces
  s = s.replace(/([。！？!；;，,])\s*[，,]+/g, '$1');
  s = s.replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/^[·•\-—，,。；;：:\s]+/, '').replace(/[·•\-—，,；;：:\s]+$/, '');
  s = s.replace(/[。]{2,}/g, '。').replace(/[！]{2,}/g, '！');
  return s.trim();
}

function extractStartHint(html) {
  const m = html.match(/id=["']startScr["'][\s\S]{0,900}?<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return '';
  let text = m[1]
    .replace(/<br\s*\/?>/gi, '，')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  // Strip noisy control keys or version badges if any
  text = stripDevNotes(text);
  if (text.length > 72) {
    const cut = text.slice(0, 72);
    const idx = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('！'), cut.lastIndexOf('；'), cut.lastIndexOf('，'));
    text = (idx >= 24 ? cut.slice(0, idx + 1) : cut).trim();
  }
  return text;
}

function enrichShortDesc(desc, meta, html) {
  let base = desc;
  const startHint = extractStartHint(html);

  // Prefer genuine #startScr description if it's informative and clean
  if (startHint && startHint.length >= 18 && !DEV_NOTE_RE.test(startHint) && !/点击开始|开始游戏|按任意键/.test(startHint)) {
    if (!base || startHint.includes(base.replace(/[。！!]+$/, ''))) {
      return startHint;
    }
    if ((base.length + startHint.length) <= 68) {
      const sep = /[。！？!]$/.test(base) ? '' : '：';
      return `${base}${sep}${startHint}`;
    }
    return startHint;
  }

  if (base.length >= 18) return base;

  // Tailored, truthful category enrichment without inventing fake features
  const cleanBase = base.replace(/[。！？!]+$/, '');
  switch (meta.category) {
    case '科学实验':
      return `互动科学实验：${cleanBase}，动手调节条件并实时观察实验现象与规律。`;
    case '金融益智':
      return `${cleanBase}，在模拟行情与风控推演中锤炼决策直觉。`;
    case '棋牌对战':
      return `${cleanBase}，离线随时开局，一步步推演布局赢得对局。`;
    case '益智解谜':
      return `${cleanBase}，观察规律巧解谜题，层层递进挑战脑力。`;
    case '塔防策略':
      return `${cleanBase}，合理布置防线与资源节奏，抵御不断升级的攻势。`;
    case '卡牌构筑':
      return `${cleanBase}，搭配手牌与策略组合，突破重重关卡挑战。`;
    case '消除合成':
      return `${cleanBase}，连消合成触发连锁高分，轻松解压停不下来。`;
    case '节奏音乐':
      return `${cleanBase}，踩准节拍打出连击，体验爽快音乐律动。`;
    case '射击':
      return `${cleanBase}，精准瞄准与灵活走位，爽快突破重重弹幕。`;
    case '跑酷跳跃':
      return `${cleanBase}，把握起跳与闪避时机，不断刷新冲刺纪录。`;
    case '经典重温':
      return `${cleanBase}，还原经典手感与核心规则，随时重温怀旧乐趣。`;
    case '3D 空间':
      return `${cleanBase}，在立体空间视角下考验操作精度与空间判断。`;
    case '街机动作':
      return `${cleanBase}，快节奏街机手感，考验瞬间反应与连续操作。`;
    default:
      return `${cleanBase}，上手轻松、节奏明快，随时随地离线畅玩一局。`;
  }
}

const ids = fs.readdirSync(GAMES_DIR).filter(id =>
  fs.existsSync(path.join(GAMES_DIR, id, 'meta.json'))
).sort();

let changed = 0;
let devFixed = 0;
let shortEnriched = 0;
let remainingDev = [];
let remainingShort = [];
const samples = [];

for (const id of ids) {
  const mp = path.join(GAMES_DIR, id, 'meta.json');
  const hp = path.join(GAMES_DIR, id, 'index.html');
  const meta = JSON.parse(fs.readFileSync(mp, 'utf8'));
  const html = fs.existsSync(hp) ? fs.readFileSync(hp, 'utf8') : '';
  const orig = meta.desc || '';
  const hadDev = DEV_NOTE_RE.test(orig);
  const wasShort = orig.length < 18;

  let next = stripDevNotes(orig);
  if (next.length < 18) {
    next = enrichShortDesc(next, meta, html);
  }
  // Ensure clean ending and reasonable length
  if (next.length > 96) {
    const cut = next.slice(0, 96);
    const idx = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('！'), cut.lastIndexOf('；'), cut.lastIndexOf('，'));
    next = (idx >= 30 ? cut.slice(0, idx + 1) : cut).trim();
  }

  if (DEV_NOTE_RE.test(next)) remainingDev.push([id, next]);
  if (next.length < 18) remainingShort.push([id, next]);

  if (next !== orig) {
    changed++;
    if (hadDev) devFixed++;
    if (wasShort) shortEnriched++;
    if (samples.length < 25) samples.push(`${id}: "${orig}"\n  -> "${next}"`);
    if (!DRY) {
      meta.desc = next;
      meta.version = (Number.isInteger(meta.version) ? meta.version : 1) + 1;
      fs.writeFileSync(mp, JSON.stringify(meta, null, 2) + '\n', 'utf8');
    }
  }
}

console.log(`${DRY ? '[DRY-RUN] ' : ''}Total: ${ids.length}, Changed: ${changed}, DevNotesFixed: ${devFixed}, ShortEnriched: ${shortEnriched}`);
console.log(`Remaining dev notes: ${remainingDev.length}, Remaining short (<18): ${remainingShort.length}`);
if (remainingDev.length) console.log('REMAINING DEV:\n' + remainingDev.map(x => x.join(' | ')).join('\n'));
if (remainingShort.length) console.log('REMAINING SHORT:\n' + remainingShort.map(x => x.join(' | ')).join('\n'));
console.log('\n--- SAMPLES ---\n' + samples.join('\n'));
