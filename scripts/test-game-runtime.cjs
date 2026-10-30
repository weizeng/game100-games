// Real input at startup and during play, plus production level fixtures where
// available. Fixed randomness makes a runtime error reproducible by game id.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const {enterGame} = require('./browser-game-flow.cjs');
const root = path.resolve(__dirname, '..');
const ids = process.argv[2] ? process.argv[2].split(',') : fs.readdirSync(path.join(root,'games'));
const server = http.createServer((q,r)=>{
  const f=path.resolve(root,'.'+q.url.split('?')[0]);
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return r.writeHead(404).end();
  r.setHeader('Content-Type','text/html; charset=utf-8');r.end(fs.readFileSync(f));
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
  const results=[];let next=0;
  async function worker(){while(next<ids.length){
    const id=ids[next++],errors=[],record={id,errors,fixtures:[]};
    const context=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:2.5,hasTouch:true,isMobile:true});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.addInitScript(({id,mode})=>{
        let seed=0x12345678;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
        sessionStorage.setItem('game100-mode-'+id,mode);
        localStorage.setItem('g100_mute','1');localStorage.setItem('g100_sound','0');
      },{id,mode:process.env.GAME_MODE||'classic'});
      await page.goto(`http://127.0.0.1:${server.address().port}/games/${id}/index.html`);
      await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
      for(const key of ['ArrowRight','ArrowDown'])await page.keyboard.press(key);
      await enterGame(page);
      for(const key of ['ArrowRight','ArrowUp','ArrowLeft','ArrowDown',' '])await page.keyboard.press(key);
      const canvas=page.locator('canvas#cv,canvas#game,canvas.game').filter({visible:true}).first();
      if(await canvas.count()){
        const b=await canvas.boundingBox();
        if(b.width&&b.height){
          await page.mouse.move(b.x+b.width*.4,b.y+b.height*.6);await page.mouse.down();
          await page.mouse.move(b.x+b.width*.65,b.y+b.height*.35,{steps:5});await page.mouse.up();
          await page.touchscreen.tap(b.x+b.width*.5,b.y+b.height*.5);
        }
      }
      await page.waitForTimeout(1200);
      if(await page.evaluate(()=>!!(window.__T&&__T.kit&&__T.kit.go))){
        await page.evaluate(()=>__T.kit.go(4));record.fixtures.push('level5');
        await page.waitForTimeout(1000);
        await page.evaluate(()=>__T.kit.go(0));record.fixtures.push('restart');
        await page.waitForTimeout(300);
        if(await page.evaluate(()=>typeof __T.cheatWin==='function')){
          await page.evaluate(()=>__T.cheatWin());await page.waitForTimeout(550);
          const again=page.locator('#againBtn').filter({visible:true});
          if(await again.count()){await again.tap();record.fixtures.push('result-replay');}
        }
      }
      await page.waitForTimeout(700);
    }catch(e){record.failure=e.message.split('\n')[0];}
    finally{await context.close();}
    record.errors=[...new Set(errors)];results.push(record);
    console.log(`${record.failure||record.errors.length?'FAIL':'PASS'} ${id}${record.failure?' '+record.failure:''}${record.errors.length?' '+record.errors.join(' | '):''}`);
  }}
  try{await Promise.all(Array.from({length:6},worker));}
  finally{await browser.close();await new Promise(r=>server.close(r));}
  fs.mkdirSync(path.join(root,'.artifacts'),{recursive:true});
  fs.writeFileSync(path.join(root,'.artifacts',process.env.GAME_MODE==='expert'?'runtime-expert-results.json':'runtime-results.json'),JSON.stringify(results.sort((a,b)=>a.id.localeCompare(b.id)),null,2)+'\n');
  const failed=results.filter(r=>r.failure||r.errors.length);
  console.log(`Runtime checked ${results.length} games; ${failed.length} failures.`);process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
