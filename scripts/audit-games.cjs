// Browser smoke/visual audit. NODE_PATH may point at the bundled dependencies.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || '.artifacts/audit');
const filter = process.argv[3];
const ids = fs.readdirSync(path.join(root, 'games')).filter(id => !filter || filter.split(',').includes(id));
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  let next = 0;
  const results = [];
  async function worker() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    if (process.env.GAME_MODE === 'expert') await context.addInitScript(() => {
      const id = location.pathname.split('/')[2];
      if (id) sessionStorage.setItem('game100-mode-' + id, 'expert');
    });
    while (next < ids.length) {
      const id = ids[next++];
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const record = { id, mode: process.env.GAME_MODE || 'classic', errors };
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/games/${id}/index.html`);
        await page.waitForTimeout(100);
        record.modeControls = await page.locator('.ui-mode').filter({ visible: true }).count();
        await page.screenshot({ path: path.join(out, `${id}-start.png`) });
        const start = page.locator('#startBtn, #btnStart, #start, #startGame, #goBtn, .startbtn').filter({ visible: true }).first();
        let button = start;
        if (!await button.count()) button = page.getByRole('button', { name: /开始|开局|开张|开战|起飞|出发|开球|开弓|开吃|点燃|出海|开砍|折好|进入发射台|保卫|升空/ }).first();
        record.started = await button.count() > 0;
        if (record.started) await button.click({ timeout: 1500 });
        const level = page.locator('button.lvl:not(.locked)').filter({ visible: true }).first();
        if (await level.count()) { await level.click({ timeout: 1500 }); record.started = true; }
        await page.waitForTimeout(180);
        record.mobile = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, mode: document.documentElement.dataset.mode }));
        await page.screenshot({ path: path.join(out, `${id}-play.png`) });
        // Pause before arbitrary play gestures: some games correctly end on a wrong click.
        const pause = page.locator('#pauseBtn, #btnPause, #pause, #btnP').filter({ visible: true }).first();
        record.pause = await pause.count() > 0;
        if (record.pause) {
          try {
            await pause.click({ trial: true, timeout: 200 });
            await pause.click({ timeout: 1000 });
            const resume = page.getByRole('button', { name: /继续|恢复/ }).filter({ visible: true }).first();
            record.resumed = await resume.count() > 0;
            if (record.resumed) await resume.click({ timeout: 1000 });
          } catch (_) { record.pauseCovered = true; }
        }
        // A real pointer gesture and key input exercise the mounted game.
        const canvas = page.locator('canvas:not(#fx):not(#winFx)').first();
        if (await canvas.count() && await canvas.isVisible()) {
          const b = await canvas.boundingBox();
          await page.mouse.move(b.x + b.width * .5, b.y + b.height * .6);
          await page.mouse.down();
          await page.mouse.move(b.x + b.width * .6, b.y + b.height * .5, { steps: 3 });
          await page.mouse.up();
        }
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(80);
        await page.setViewportSize({ width: 320, height: 640 });
        await page.waitForTimeout(80);
        record.small = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(80);
        record.desktop = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      } catch (e) { record.failure = e.message; }
      results.push(record);
      await page.close();
      if (results.length % 20 === 0) console.log(`Audited ${results.length}/${ids.length}`);
    }
    await context.close();
  }
  await Promise.all([worker(), worker(), worker()]);
  results.sort((a,b) => a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  for (const state of ['start', 'play']) {
    for (let offset = 0; offset < ids.length; offset += 20) {
      const group = ids.slice(offset, offset + 20);
      const tiles = [];
      for (let i = 0; i < group.length; i++) {
        const file = path.join(out, `${group[i]}-${state}.png`);
        if (!fs.existsSync(file)) continue;
        const label = Buffer.from(`<svg width="195" height="24"><rect width="195" height="24" fill="#fff"/><text x="8" y="17" font-size="13" font-family="sans-serif" fill="#222">${group[i]}</text></svg>`);
        tiles.push({ input: label, top: Math.floor(i / 5) * 446, left: i % 5 * 195 });
        tiles.push({ input: await sharp(file).resize(195, 422).png().toBuffer(), top: Math.floor(i / 5) * 446 + 24, left: i % 5 * 195 });
      }
      await sharp({ create: { width: 975, height: Math.ceil(group.length / 5) * 446, channels: 3, background: '#fff' } }).composite(tiles).png().toFile(path.join(out, `sheet-${state}-${offset / 20 + 1}.png`));
    }
  }
  console.log(JSON.stringify({ total: results.length, notStarted: results.filter(r => !r.started).map(r => r.id), errors: results.filter(r => r.errors.length || r.failure), overflow: results.filter(r => r.mobile?.scroll > 390 || r.small?.scroll > 320) }, null, 2));
  await browser.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
