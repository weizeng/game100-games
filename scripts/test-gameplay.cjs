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
        // 2026-10-21 可玩性升级后：关卡制（__T.kit.go），棋盘 B 为 16 格对象数组，含石块/万能块
        await p.evaluate(() => __T.kit.go(0));
        assert.equal(await p.evaluate(() => B.filter(Boolean).length), 2);
        assert.equal(await p.evaluate(() => __T.state().L.p4), expert ? 0.25 : 0.1);
        const slide = arr => p.evaluate(arr => { B = Array(16).fill(null); arr.forEach((v, i) => { B[i] = v === 'R' ? { rock: 1 } : v ? { v } : null; }); const r = slideLine([0,1,2,3]); return { line: r.res.map(t => !t ? 0 : t.rock ? 'R' : t.v), moved: r.moved, gain: r.gain }; }, arr);
        assert.deepEqual(await slide([2,2,4,4]), { line: [4,8,0,0], moved: true, gain: 12 });
        assert.deepEqual((await slide([2,2,2,2])).line, [4,4,0,0]);
        assert.deepEqual((await slide([2,'R',2,2])).line, [2,'R',4,0], 'rock blocks sliding');
        assert.deepEqual(await slide(['W',8,0,0]), { line: [16,0,0,0], moved: true, gain: 16 }, 'wild tile merges with any number');
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
        // 2026-10-22 可玩性升级后：15 关，第 1 关 3 排×8 块；进阶挡板更窄、球更快；第 5 关是首领
        await p.evaluate(() => __T.kit.go(0));
        assert.deepEqual(await p.evaluate(() => ({ width: __T.state().paddle.w, count: bricks.length, hp: bricks[0].hp, spd: Math.round(LP.spd) })), { width: expert ? 64 : 80, count: 24, hp: 1, spd: expert ? 336 : 300 });
        assert.equal(await p.evaluate(() => { __T.kit.go(4); return __T.state().boss; }), 22);
      });
      await game('minesweeper', mode, async p => {
        // 关卡制：第 1 关 8×8、8 雷（进阶 ×1.12 → 9 雷），首点及其邻格必无雷
        await p.evaluate(() => { __T.kit.go(0); __T.act(0, false); });
        assert.deepEqual(await p.evaluate(() => ({ count: cells.filter(c => c.mine).length, safe: !cells[0].mine && nbr(0).every(k => !cells[k].mine), open: cells[0].open })), { count: expert ? 9 : 8, safe: true, open: true });
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
    for (const mode of ['classic', 'expert']) await game('gomoku', mode, async p => {
      // 关卡制对手：AI 执白（2），有四连必成五；对手失误率进阶减半
      const r = await p.evaluate(() => { __T.kit.go(0); grid = Array.from({length:SZ}, () => Array(SZ).fill(0)); ended = false; for (let x = 4; x < 8; x++) grid[7][x] = 2;
        const m = think(2, { bl: 0, top: 1, dw: 1, ply: 1 }); place(m.x, m.y, 2); return { y: m.y, x: m.x, ended, bl: lvParam(0).bl }; });
      assert.equal(r.ended, true, 'AI should complete its winning five'); assert.equal(r.y, 7); assert.ok(r.x === 3 || r.x === 8);
      assert.equal(r.bl, mode === 'expert' ? 0.225 : 0.45);
      const block = await p.evaluate(() => { __T.kit.go(0); grid = Array.from({length:SZ}, () => Array(SZ).fill(0)); for (let y = 3; y < 7; y++) grid[y][2] = 1; grid[2][2] = 2; return think(2, { bl: 0, top: 1, dw: 1, ply: 1 }); });
      assert.deepEqual({ x: block.x, y: block.y }, { x: 2, y: 7 }, 'AI must block an open four');
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
