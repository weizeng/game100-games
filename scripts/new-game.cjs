// 新建游戏脚手架：node scripts/new-game.cjs <id> <theme> "<名称>" <分类> <图标> <出品方>
// 例：node scripts/new-game.cjs starcatch candy "接星星" 休闲模拟 ⭐ Grok
// 出品方必填：Muse 做的写 Muse，Grok 做的写 Grok；也可用环境变量 GAME100_STUDIO 指定。
// 复制 scripts/templates/starter → games/<id>，写好 meta.json，并把 id 登记到 catalog 对应主题组。
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const [id, theme, name, category, icon, studioArg] = process.argv.slice(2);
const STUDIOS = ['Muse', 'Grok'];
const studio = STUDIOS.find(s => s.toLowerCase() === String(studioArg || process.env.GAME100_STUDIO || '').trim().toLowerCase());
const CATS = ['科学实验', '经典重温', '射击', '跑酷跳跃', '塔防策略', '卡牌构筑', '棋牌对战', '消除合成', '益智解谜', '休闲模拟', '街机动作', '节奏音乐', '金融益智', '3D 空间'];
if (!id || !/^[a-z][a-z0-9]{1,19}$/.test(id)) throw new Error('id 需为 2–20 位小写字母/数字，且以字母开头');
if (fs.existsSync(path.join(root, 'games', id))) throw new Error('games/' + id + ' 已存在');
if (!CATS.includes(category)) throw new Error('分类必须是：' + CATS.join(' / '));
if (!studio) throw new Error('请指定出品方（第 6 个参数或环境变量 GAME100_STUDIO）：' + STUDIOS.join(' / '));
const catFile = path.join(__dirname, 'game-ui/catalog.cjs');
let cat = fs.readFileSync(catFile, 'utf8');
const re = new RegExp(`(\\n  ${theme}: ')([^']*)'`);
if (!re.test(cat)) throw new Error('未知主题 ' + theme + '（见 scripts/game-ui/catalog.cjs 的 groups）');
cat = cat.replace(re, (m, a, b) => `${a}${b} ${id}'`);
const dir = path.join(root, 'games', id);
fs.mkdirSync(dir, { recursive: true });
const tpl = path.join(__dirname, 'templates/starter');
fs.writeFileSync(path.join(dir, 'index.html'), fs.readFileSync(path.join(tpl, 'index.html'), 'utf8').replace(/<title>[^<]*<\/title>/, () => `<title>${name}</title>`).replace(/starter-/g, id + '-'));
const meta = { ...JSON.parse(fs.readFileSync(path.join(tpl, 'meta.json'), 'utf8')), id, name, category, icon: icon || '🎮', version: 1, desc: '请改成 18–40 字：一句玩法 + 一句卖点', studio };
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
fs.writeFileSync(catFile, cat);
console.log(`已创建 games/${id}（主题 ${theme}）。下一步：改玩法 → node scripts/sync-game-ui.cjs --only=${id} → node scripts/check-game.cjs ${id}`);
