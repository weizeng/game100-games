// Focused checks for new mechanics and backwards-compatible classic rules.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + req.url.split('?')[0]);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let passed = 0;
  async function game(id, mode, test) {
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(({ id, mode }) => sessionStorage.setItem('game100-mode-' + id, mode), { id, mode });
    await page.goto(`http://127.0.0.1:${server.address().port}/games/${id}/index.html`);
    await page.locator('#startBtn,#btnStart').first().click();
    await test(page); assert.deepEqual(errors, [], `${id} runtime errors`);
    await page.close(); console.log(`PASS ${id} ${mode}`); passed++;
  }
  try {
    for (const mode of ['classic', 'expert']) {
      const expert = mode === 'expert';
      await game('game2048', mode, async p => {
        assert.deepEqual(await p.evaluate(() => slideLine([2,2,4,4])), { line: [4,8,0,0], moved: true, gain: 12 });
        assert.deepEqual(await p.evaluate(() => slideLine([2,2,2,2]).line), [4,4,0,0]);
        assert.equal(await p.evaluate(() => grid.flat().filter(Boolean).length), 2);
        const value = await p.evaluate(() => { const rng=Math.random;Math.random=()=>.8;grid=Array.from({length:4},()=>[0,0,0,0]);addRandom();Math.random=rng;return grid.flat().find(Boolean); });
        assert.equal(value, expert ? 4 : 2);
        await p.evaluate(() => { GameUI.storageSet('audit-record','42'); GameUI.storageSet('g100_sound','0'); });
        assert.equal(await p.evaluate(() => localStorage.getItem('g100_sound')), '0');
        assert.equal(await p.evaluate(() => localStorage.getItem(GameUI.expert?'expert:audit-record':'audit-record')), '42');
      });
      await game('snake', mode, async p => {
        const result=await p.evaluate(() => { for(let i=0;i<100;i++){placeFood();if(obstacles.some(p=>p[0]===food.x&&p[1]===food.y))return {bad:true};}return {bad:false,obstacles:obstacles.length}; });
        assert.deepEqual(result, { bad:false, obstacles:expert?8:0 });
      });
      await game('tetris', mode, async p => assert.equal(await p.evaluate(() => board.flat().filter(Boolean).length), expert?27:0));
      await game('breakout', mode, async p => {
        assert.deepEqual(await p.evaluate(() => ({width:paddle.w,hp:bricks[0].hp,count:bricks.length})), {width:expert?60:80,hp:expert?2:1,count:48});
      });
      await game('minesweeper', mode, async p => {
        await p.locator('#grid .cell').first().click();
        assert.deepEqual(await p.evaluate(() => ({count:mines.size,safe:!mines.has(0)})), { count:expert?14:10,safe:true });
      });
      await game('solitaire', mode, async p => {
        await p.locator('#stockPile').click();
        assert.deepEqual(await p.evaluate(() => ({waste:S.waste.length,stock:S.stock.length})), {waste:expert?3:1,stock:expert?21:23});
      });
      await game('simon', mode, async p => assert.equal(Number(await p.locator('#roundV').textContent()), expert?2:1));
      await game('towerdef', mode, async p => {
        const result=await p.evaluate(() => { wave=3;spawnLeft=3;spawnEnemy();const e=enemies[enemies.length-1];return {armored:e.armored,reward:e.reward}; });
        assert.deepEqual(result,{armored:expert,reward:expert?28:14});
      });
    }
    await game('gomoku','expert',async p => {
      const r=await p.evaluate(() => { grid=Array.from({length:SZ},()=>Array(SZ).fill(0));over=false;for(let x=4;x<8;x++)grid[7][x]=2;aiMove();return over; });
      assert.equal(r,true,'AI should complete its winning five');
    });
    await game('xiangqi','expert',async p => {
      const r=await p.evaluate(() => { const b=newBoard(),t=performance.now(),m=aiBestMove(b);return {legal:genAllLegal(b,'b').some(x=>JSON.stringify(x)===JSON.stringify(m)),ms:performance.now()-t}; });
      assert.equal(r.legal,true); console.log('Xiangqi AI', Math.round(r.ms),'ms');
    });
    await game('sudoku','expert',async p => {
      const before=await p.locator('#board .given').count();
      await p.locator('#hintTopBtn').click();
      const first=await p.locator('#board .given').count();
      await p.locator('#hintTopBtn').click();
      const second=await p.locator('#board .given').count();
      // Hints can be filled as non-given cells; the visible resource cap must still be enforced.
      assert.equal(second,first); assert.ok(first>=before);
      assert.match(await p.locator('#ui-assist-toast').textContent(), /已用完/);
    });
    for(const [id, overlay] of [['link','#lineCv'],['frost','#frost'],['moonphase','#confetti']]) {
      await game(id,'classic',async p => assert.equal(await p.locator(overlay).evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','Effect canvas must not hide the game underneath'));
    }
    console.log(`Passed ${passed} targeted gameplay checks.`);
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
})().catch(e => { console.error(e); server.close(); process.exitCode=1; });
