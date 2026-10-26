// 单款/多款游戏的上线前浏览器检查：node scripts/check-game.cjs <id>[,<id>...]
// 在 390×844 与 360×640 两种竖屏下：无脚本报错、开始按钮在视口内且可点、点开始后能进入游戏、页面无横向/纵向溢出、可点按钮 ≥44px。
// 需要 Playwright（npm i -D playwright 或设置 NODE_PATH），可用 CHROME_PATH 指定 Chrome。
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const ids = (process.argv[2] || '').split(',').filter(Boolean);
if (!ids.length) { console.error('用法：node scripts/check-game.cjs <id>[,<id>]'); process.exit(2); }
const server = http.createServer((q, r) => { const f = path.resolve(root, '.' + decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404).end(); return; } r.setHeader('Content-Type', 'text/html; charset=utf-8'); r.end(fs.readFileSync(f)); });
const STUDIOS = ['Muse', 'Grok'];
const SEL = '#startBtn,#btnStart,.startbtn,#bStart,#playBtn,#btnPlay';
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  let fail = 0;
  for (const id of ids) for (const [w, h] of [[390, 844], [360, 640]]) {
    const problems = [];
    const meta = JSON.parse(fs.readFileSync(path.join(root, 'games', id, 'meta.json'), 'utf8'));
    if (!['科学实验', '经典重温', '射击', '跑酷跳跃', '塔防策略', '卡牌构筑', '棋牌对战', '消除合成', '益智解谜', '休闲模拟', '街机动作', '节奏音乐'].includes(meta.category)) problems.push('meta.category 非法');
    if (!Number.isInteger(meta.version) || meta.version < 1) problems.push('meta.version 必须是正整数');
    if (meta.id !== id) problems.push('meta.id 与目录名不一致');
    // 出品方必填：Muse 做的写 "Muse"，Grok 做的写 "Grok"（新增出品方时把名字加进 STUDIOS）
    if (!STUDIOS.includes(meta.studio)) problems.push(`meta.studio 必填，且只能是 ${STUDIOS.join(' / ')}（当前：${JSON.stringify(meta.studio)}）`);
    const html = fs.readFileSync(path.join(root, 'games', id, 'index.html'), 'utf8');
    if (!html.includes('<!-- GAME UI BEGIN -->')) problems.push('未注入共用界面：先 node scripts/sync-game-ui.cjs --only=' + id);
    if (/(src|href)=["']https?:\/\//.test(html)) problems.push('有外链资源（需离线可用）');
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push('资源加载失败 ' + r.status() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '')); });
    await page.goto(`http://127.0.0.1:${server.address().port}/games/${id}/index.html`); await page.waitForTimeout(600);
    const m = await page.evaluate(SEL => { const d = document.documentElement, b = [...document.querySelectorAll(SEL)].find(e => e.getBoundingClientRect().width > 0);
      let reach = false; if (b) { const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); reach = r.top >= 0 && r.bottom <= innerHeight + 1 && !!hit && (hit === b || b.contains(hit)); }
      const small = [...document.querySelectorAll('button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).map(e => e.id || e.textContent.trim().slice(0, 6));
      return { has: !!b, reach, small, ox: d.scrollWidth - innerWidth, oy: d.scrollHeight - innerHeight }; }, SEL);
    if (!m.has) problems.push('找不到开始按钮（#startBtn）'); else if (!m.reach) problems.push('开始按钮不在视口内或被遮挡');
    if (m.small.length) problems.push('按钮小于 44px：' + m.small.join(','));
    if (m.ox > 0 || m.oy > 0) problems.push(`页面溢出 x${m.ox} y${m.oy}`);
    if (m.has) { await page.locator(SEL).filter({ visible: true }).first().tap(); await page.waitForTimeout(300);
      for (let i = 0; i < 6; i++) { await page.touchscreen.tap(w / 2 + (i % 3 - 1) * 60, h * .6); await page.waitForTimeout(120); }
      await page.waitForTimeout(800); }
    if (errors.length) problems.push('脚本报错：' + [...new Set(errors)].join(' | '));
    console.log(`${problems.length ? 'FAIL' : 'PASS'} ${id} ${w}x${h}${problems.length ? '\n  - ' + problems.join('\n  - ') : ''}`);
    if (problems.length) fail++;
    await ctx.close();
  }
  await browser.close(); server.close(); process.exitCode = fail ? 1 : 0;
})();
