// Browser design-reference checks, plus the native XML contract in check-android-ui.
// This does not build or run Android; native rendering still needs device verification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const games = fs.readdirSync(path.join(root, 'games')).flatMap(id => {
    const meta = path.join(root, 'games', id, 'meta.json');
    return fs.existsSync(meta) ? [JSON.parse(fs.readFileSync(meta, 'utf8'))] : [];
  });
  const experiments = games.filter(g => g.category === '科学实验');
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({reducedMotion: 'reduce'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({width, height: 1100});
      await page.goto(pathToFileURL(path.join(root, 'docs/app-ui-preview.html')).href);
      assert.equal(await page.locator('.game-row').count(), games.length);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const before = await page.locator('#science-entry').boundingBox();
      const toolbarBefore = await page.locator('#home .toolbar').boundingBox();
      await page.locator('#home-scroll').evaluate(el => { el.scrollTop = 500; });
      const after = await page.locator('#science-entry').boundingBox();
      const toolbarAfter = await page.locator('#home .toolbar').boundingBox();
      assert.equal(Math.round(before.y - after.y), 500, 'Science entry must move with the list');
      assert.equal(toolbarBefore.y, toolbarAfter.y, 'Toolbar stays available');
      assert.ok(after.y + after.height < toolbarAfter.y + toolbarAfter.height, 'Banner leaves the visible content');

      await page.locator('#home-scroll').evaluate(el => { el.scrollTop = 0; });
      await page.locator('#science-entry').click();
      assert.equal(await page.locator('#home').isVisible(), false);
      assert.equal(await page.locator('.experiment').count(), experiments.length);
      let subjectTotal = 0;
      for (const subject of ['物理', '化学', '生物']) {
        await page.locator('#subject-tabs').getByRole('button', {name: subject, exact: true}).click();
        const n = await page.locator('.experiment').count();
        assert.ok(n > 0);
        subjectTotal += n;
        assert.equal(await page.locator('#science-count').textContent(), subject + '实验 · ' + n + ' 个');
      }
      assert.equal(subjectTotal, experiments.length, 'Every experiment belongs to one subject');
      await page.locator('#subject-tabs').getByRole('button', {name: '全部', exact: true}).click();
      await page.locator('.experiment').first().click();
      const detailName = await page.locator('#detail-name').textContent();
      assert.ok(experiments.some(g => g.name === detailName), 'Experiment opens its detail view');
      await page.locator('#lab-back').click();
      assert.equal(await page.locator('#home').isVisible(), true);

      await page.locator('#more-featured').click();
      assert.equal(await page.locator('#list-title').textContent(), '精品');
      assert.equal(await page.locator('.game-row').count(), games.filter(g => g.premium).length);
      assert.equal(await page.locator('#discovery').isVisible(), false);
      await page.locator('#home-scroll').evaluate(el => { el.scrollTop = 0; });
      await page.locator('#chips').getByRole('button', {name: '全部', exact: true}).click();
      await page.locator('#query').fill('zz-no-result');
      assert.equal(await page.locator('#science-entry').isVisible(), false);
      await page.getByRole('button', {name: '查看全部游戏', exact: true}).click();
      assert.equal(await page.locator('.game-row').count(), games.length);
      await page.locator('#home-scroll').evaluate(el => { el.scrollTop = 0; });
      if (width === 390) {
        fs.mkdirSync(path.join(root, '.artifacts'), {recursive: true});
        await page.locator('#home').screenshot({path: path.join(root, '.artifacts/home-v43-mobile.png')});
        await page.locator('#science-entry').click();
        await page.locator('#lab').screenshot({path: path.join(root, '.artifacts/science-v43-mobile.png')});
      }
    }
    assert.deepEqual(errors, []);
    console.log(`Passed: scrolling discovery, full recommendations, ${experiments.length} experiments, subject filters, return, search/reset at 320/390/1280. No Android build.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
