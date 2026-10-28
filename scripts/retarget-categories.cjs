#!/usr/bin/env node
/**
 * 把 games/<id>/meta.json 的 category 分类允许列表（含金融益智，共 13 类）。
 * 用法：node scripts/retarget-categories.cjs [--dry]
 * 规则：科学实验/经典重温默认不动；其余按 OVERRIDE 表 + 启发式 + 旧类回退。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const GAMES = path.join(ROOT, 'games');
const ALLOWED = [
  '科学实验', '经典重温', '射击', '跑酷跳跃', '塔防策略', '卡牌构筑',
  '棋牌对战', '消除合成', '益智解谜', '休闲模拟', '街机动作', '节奏音乐', '金融益智',
];
const KEEP = new Set(['科学实验', '经典重温']);
const OLD_FALLBACK = {
  '街机动作': '街机动作',
  '益智解谜': '益智解谜',
  '休闲趣味': '休闲模拟',
  '科学实验': '科学实验',
  '经典重温': '经典重温',
};

/** 手写覆盖：题材明确的优先 */
const OVERRIDE = {
  // 卡牌构筑
  kingcard: '卡牌构筑', fatespire: '卡牌构筑', jokerpoker: '卡牌构筑',
  bagbrawl: '卡牌构筑', alchemy: '益智解谜', blackjack: '棋牌对战', drawpoker: '棋牌对战',
  landlord: '棋牌对战', solitaire: '棋牌对战',
  // 塔防策略 / 自走
  surgetd: '塔防策略', neontd: '塔防策略', towerdef: '塔防策略',
  gardenguard: '塔防策略', autochess: '塔防策略', mergelegion: '塔防策略',
  starconquest: '塔防策略', swarmcmd: '塔防策略', mechbreach: '塔防策略',
  hexwar: '塔防策略', hexduel: '塔防策略', hexrealm: '塔防策略',
  islelord: '塔防策略',
  // 棋牌对战
  goai: '棋牌对战', gomoku: '棋牌对战', xiangqi: '棋牌对战',
  checkers: '棋牌对战', reversi: '棋牌对战', ludo: '棋牌对战',
  yahtzee: '棋牌对战', connectfour: '棋牌对战', chesslord: '棋牌对战',
  battleship: '棋牌对战', colorlines: '棋牌对战', dotsboxes: '棋牌对战',
  horseshoe: '棋牌对战',
  // 消除合成
  jewel: '消除合成', zuma: '消除合成', collapse: '消除合成',
  fruitmerge: '消除合成', link: '消除合成', bubble: '消除合成',
  goodssort: '消除合成', columns: '消除合成', gemquest: '消除合成',
  gemhero: '消除合成', blockgrid: '消除合成', sortcandy: '消除合成',
  watersort: '消除合成', tenpair: '消除合成',
  // 节奏音乐
  rhythm: '节奏音乐', piano: '节奏音乐', beatraid: '节奏音乐',
  beatblade: '节奏音乐', simon: '节奏音乐',
  // 射击
  invaders: '射击', plane: '射击', balloon: '射击', duckhunt: '射击',
  missile: '射击', archery: '射击', arrowrogue: '射击', gunslinger: '射击',
  snowball: '射击', shieldguard: '射击', asteroid: '射击', seacannon: '射击',
  jellyzap: '射击', inkspray: '射击', bomber: '射击', cannon: '射击',
  catapult: '射击', knifehit: '射击', orbquest: '射击', starswarm: '射击',
  // 跑酷跳跃
  dino: '跑酷跳跃', flappy: '跑酷跳跃', doodle: '跑酷跳跃', jump: '跑酷跳跃',
  parachute: '跑酷跳跃', neonrunner: '跑酷跳跃', ninja: '跑酷跳跃',
  jetpack: '跑酷跳跃', frogger: '跑酷跳跃', volcano: '跑酷跳跃',
  ascent: '跑酷跳跃', gravityflip: '跑酷跳跃', plumpile: '跑酷跳跃',
  broomrace: '跑酷跳跃', copter: '跑酷跳跃', ski: '跑酷跳跃', yeti: '跑酷跳跃',
  trapeze: '跑酷跳跃', lumber: '跑酷跳跃', mooncrawl: '跑酷跳跃',
  neodrone: '跑酷跳跃', neoncourier: '跑酷跳跃', hillclimb: '跑酷跳跃',
  racing: '跑酷跳跃',  
   
  // 休闲模拟
  neoncity: '休闲模拟', cityskyline: '休闲模拟', farm: '休闲模拟',
  cookrush: '休闲模拟', teahouse: '休闲模拟', neonfish: '休闲模拟',
  factoryline: '休闲模拟', railtycoon: '休闲模拟', cactus: '休闲模拟',
  dragonegg: '休闲模拟', pottery: '休闲模拟', waiter: '休闲模拟',
  wandshop: '休闲模拟', goldrush: '休闲模拟', busqueue: '休闲模拟',
  hotpot: '休闲模拟', grill: '休闲模拟', noodle: '休闲模拟',
  wokflip: '休闲模拟', sushigo: '休闲模拟', claw: '休闲模拟',
  dig: '休闲模拟', fishing: '休闲模拟', bowling: '休闲模拟',
  hoop: '休闲模拟', golf: '休闲模拟', paperfly: '休闲模拟',
  firework: '休闲模拟', frost: '休闲模拟', moonphase: '休闲模拟',
  snowman: '休闲模拟', sleigh: '休闲模拟', shellswap: '休闲模拟',
  spacelevator: '休闲模拟', levitate: '休闲模拟', aurora: '休闲模拟',
  catch: '休闲模拟', cutrope: '休闲模拟', darts: '休闲模拟',
  debrisweep: '休闲模拟', draw: '休闲模拟', pearlcatch: '休闲模拟',
  penalty: '休闲模拟', pop: '休闲模拟', rocket: '休闲模拟',
  seahorse: '休闲模拟', shuttle: '休闲模拟', slice: '休闲模拟',
  slot: '休闲模拟', stack: '休闲模拟', airhockey: '休闲模拟',
  bubbletea: '休闲模拟', bumpercar: '休闲模拟', icecurl: '休闲模拟',
  curlingduel: '休闲模拟', doughfly: '休闲模拟', neonmirror: '休闲模拟',
  // 益智（从街机/休闲明确偏谜题的）
  gearbox: '益智解谜', marblerun: '益智解谜', cryptops: '益智解谜',
  neohack: '益智解谜', shadowgo: '益智解谜', turncrawl: '益智解谜',
  abysscrawl: '益智解谜', dungeonkey: '益智解谜',
  // 街机动作（明确街机）
  pinball: '街机动作', pong: '街机动作', tank: '街机动作',
  tetris: '经典重温',
  bomberman: '经典重温',
  minesweeper: '经典重温',
  spintop: '经典重温',
  shellgame: '经典重温',
  // 更多射击/动作细分
  spellcraft: '街机动作', spelldraw: '街机动作', swordlane: '街机动作',
  swordparry: '街机动作', tugwar: '街机动作', whackamole: '街机动作',
  docking: '街机动作', deepdive: '街机动作', orbit: '街机动作',
  magrail: '街机动作', snowplow: '街机动作', laser: '街机动作',
  lasso: '街机动作', hexduel_keep: '塔防策略',
};

function heuristic(id, name, desc, oldCat) {
  // 手写覆盖优先（含明确要进棋牌对战的经典棋类）
  if (OVERRIDE[id]) return OVERRIDE[id];
  // 其余科学实验 / 经典重温保持不动
  if (KEEP.has(oldCat)) return oldCat;
  const t = `${id} ${name} ${desc}`;
  const has = (...ks) => ks.some(k => t.includes(k));
  if (has('节拍', '节奏', '音游', '钢琴', 'beat', 'rhythm', 'piano')) return '节奏音乐';
  if (has('塔防', '自走', '守塔', '防线', '虫群指挥', '星域征服', '机甲防线')) return '塔防策略';
  if (has('卡牌', '牌组', '小丑牌', '构筑')) return '卡牌构筑';
  if (has('三消', '消消', '合成', '祖玛', '连连看', '2048', '水果合成')) return '消除合成';
  if (has('射击', '打飞机', '打鸭子', '导弹', '侵略者', '飞刀', '弓手', '枪手')) return '射击';
  if (has('跑酷', '跳跃', '笨鸟', '涂鸦跳', '跳伞', '飞人', '重力翻转')) return '跑酷跳跃';
  if (has('围棋', '象棋', '五子', '跳棋', '黑白棋', '飞行棋', '四子', '斗地主', '21点', '骰子', '纸牌')) return '棋牌对战';
  if (has('城建', '农场', '经营', '产线', '茶馆', '鱼缸', '料理', '拉霸')) return '休闲模拟';
  return OLD_FALLBACK[oldCat] || '街机动作';
}

const dry = process.argv.includes('--dry');
const counts = Object.fromEntries(ALLOWED.map(c => [c, 0]));
const changes = [];
let unchanged = 0;

for (const id of fs.readdirSync(GAMES).sort()) {
  const metaPath = path.join(GAMES, id, 'meta.json');
  if (!fs.existsSync(metaPath)) continue;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const old = meta.category || '';
  let next = heuristic(id, meta.name || '', meta.desc || '', old);
  if (!ALLOWED.includes(next)) next = '街机动作';
  counts[next]++;
  if (next === old) { unchanged++; continue; }
  changes.push({ id, old, next, name: meta.name });
  if (!dry) {
    meta.category = next;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  }
}

console.log(dry ? '=== DRY RUN ===' : '=== APPLIED ===');
console.log('changed', changes.length, 'unchanged', unchanged);
console.log('\nCounts:');
for (const c of ALLOWED) console.log(`  ${String(counts[c]).padStart(3)}  ${c}`);
const empty = ALLOWED.filter(c => counts[c] === 0);
if (empty.length) {
  console.error('\nEMPTY CATEGORIES:', empty.join(', '));
  process.exit(1);
}
if (dry) {
  console.log('\nSample changes (first 40):');
  for (const c of changes.slice(0, 40)) console.log(`  ${c.id}: ${c.old} → ${c.next}`);
}
