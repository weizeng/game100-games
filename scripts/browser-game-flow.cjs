// Follow the same first-run tutorial and level selection as a new player.
const START = '#startBtn,#btnStart,.startbtn,#bStart,#playBtn,#btnPlay,#start,#startGame,#start-btn,#btn-start,#s-start .lvl';
async function enterGame(page) {
  const start = page.locator(START).filter({ visible: true }).first();
  if (!await start.count()) throw new Error('找不到开始按钮');
  await start.tap({ timeout: 3000 });
  for (let step = 0; step < 6; step++) {
    const skip = page.locator('#tutSkip').filter({ visible: true });
    if (await skip.count()) { await skip.tap(); continue; }
    const level = page.locator('button.lvl:not(:disabled):not(.locked)').filter({ visible: true }).first();
    if (await level.count()) { await level.tap(); continue; }
    const room = page.locator('#mapC button').filter({visible:true}).first();
    if(await room.count()){await room.tap();continue;}
    break;
  }
  await page.waitForTimeout(150);
  if (await start.isVisible()) throw new Error('点击开始后仍停留在开始面板');
}
module.exports = { enterGame, START };
