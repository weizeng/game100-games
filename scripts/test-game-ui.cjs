const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { enterGame } = require('./browser-game-flow.cjs');
const root = path.resolve(__dirname, '..');
const server = http.createServer((q,r) => {
  const f = path.resolve(root, '.'+q.url.split('?')[0]);
  if (!f.startsWith(root+path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return r.writeHead(404).end();
  r.setHeader('Content-Type','text/html; charset=utf-8'); r.end(fs.readFileSync(f));
});
(async () => {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || undefined});
  let failures=0;
  async function test(name,id,setup,run) {
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try {
      if(setup)await page.addInitScript(setup);
      await page.goto(`http://127.0.0.1:${server.address().port}/games/${id}/index.html`);
      await run(page);assert.deepEqual(errors,[]);console.log('PASS '+name);
    } catch(e) {failures++;console.error('FAIL '+name+': '+e.message);}
    finally {await context.close();}
  }
  try {
    await test('orbit simulation advances and renders after starting','tiltorbit',null,async p=>{
      await enterGame(p);
      const result=await p.evaluate(()=>{
        const before=theta;step(.02);renderer.render(scene,camera);
        return {advanced:theta>before,rotation:[sat.rotation.x,sat.rotation.y,sat.rotation.z].every(Number.isFinite),webgl:!!renderer.getContext()};
      });
      assert.deepEqual(result,{advanced:true,rotation:true,webgl:true});
    });
    await test('chemistry experiment can pause in prediction and pouring phases','chemreact',null,async p=>{
      await enterGame(p);await p.locator('#pause-btn').tap();
      assert.equal(await p.evaluate(()=>paused),true);
      await p.locator('#resume-btn').tap();assert.equal(await p.evaluate(()=>paused),false);
    });
    await test('ninja survives resizing during a run','ninja',null,async p=>{
      await enterGame(p);await p.setViewportSize({width:320,height:640});
      await p.evaluate(()=>{resize();draw();});
    });
    await test('snake ignores controls before a level exists','snake',null,async p=>{
      await p.keyboard.press('ArrowRight');
    });
    await test('storage denied still permits playing and session records','snake',()=>{
      for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw new DOMException('Storage denied','SecurityError');};
    },async p=>{
      await enterGame(p);
      assert.equal(await p.evaluate(()=>__T.kit.state),'play');
      assert.equal(await p.evaluate(()=>{GameUI.storageSet('record','17');return GameUI.storageGet('record');}),'17');
      assert.equal(await p.evaluate(()=>{GameUI.storageRemove('record');return GameUI.storageGet('record');}),null);
    });
    await test('keyboard/programmatic hints cannot bypass expert cap','sudoku',()=>sessionStorage.setItem('game100-mode-sudoku','expert'),async p=>{
      await enterGame(p);
      const result=await p.evaluate(()=>{let n=0;const b=document.getElementById('hintTopBtn');b.addEventListener('click',()=>n++);b.click();b.click();return n;});
      assert.equal(result,1,'only the first click may reach the hint handler');
    });
    await test('backgrounding pauses tower defense and preserves manual pause','towerdef',null,async p=>{
      await enterGame(p);
      await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal(await p.evaluate(()=>state),'paused');
      await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      assert.equal(await p.evaluate(()=>state),'paused');
    });
    await test('pointer-only replay resets the per-game hint allowance','sudoku',()=>sessionStorage.setItem('game100-mode-sudoku','expert'),async p=>{
      await enterGame(p);
      const result=await p.evaluate(()=>{
        const hint=document.getElementById('hintTopBtn');let calls=0;hint.addEventListener('click',()=>calls++);hint.click();
        const replay=document.createElement('button');replay.id='retryBtn';
        replay.addEventListener('pointerdown',e=>e.preventDefault());document.body.appendChild(replay);
        replay.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
        hint.click();hint.click();return calls;
      });
      assert.equal(result,2);
    });
  }finally{await browser.close();await new Promise(r=>server.close(r));}
  process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
