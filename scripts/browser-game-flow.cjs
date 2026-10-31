// Follow the same first-run tutorial and level selection as a new player.
const START = '#startBtn,#btnStart,.startbtn,#bStart,#playBtn,#btnPlay,#start,#startGame,#start-btn,#btn-start,#s-start .lvl';
async function enterGame(page) {
  const start = page.locator(START).filter({ visible: true }).first();
  if (!await start.count()) throw new Error('找不到开始按钮');
  await start.tap({ timeout: 3000 });
  for (let step = 0; step < 6; step++) {
    const skip = page.locator('#tutSkip');
    // Playwright filter({visible:true}).count() can be 1 for display:none children; use isVisible().
    if (await skip.isVisible().catch(() => false)) { await skip.tap({ timeout: 3000 }); continue; }
    const level = page.locator('button.lvl:not(:disabled):not(.locked)').filter({ visible: true }).first();
    if (await level.count() && await level.isVisible().catch(() => false)) { await level.tap({ timeout: 3000 }); continue; }
    const room = page.locator('#mapC button').filter({visible:true}).first();
    if(await room.count() && await room.isVisible().catch(()=>false)){await room.tap({timeout:3000});continue;}
    break;
  }
  await page.waitForTimeout(150);
  if (await start.isVisible()) throw new Error('点击开始后仍停留在开始面板');
}
module.exports = { enterGame, START };
