// Real browser input + deterministic board fixtures for the production engines.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const server = http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'application/json');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  fs.mkdirSync(path.join(root,'.artifacts/classics'),{recursive:true});
  try{
    for(const mode of ['classic','expert'])for(const id of ['connectfour','colorlines','yahtzee','columns','pyramid']){
      const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(({id,mode})=>{sessionStorage.setItem('game100-mode-'+id,mode);localStorage.setItem('g100_sound','0');},{id,mode});
      await page.goto(`http://127.0.0.1:${server.address().port}/games/${id}/index.html`);
      assert.equal(await page.locator('.ui-mode').count(),1);
      await page.screenshot({path:path.join(root,'.artifacts/classics',id+'-'+mode+'-menu.png')});
      await page.locator('#startBtn').tap();
      assert.equal(await page.evaluate(()=>expert),mode==='expert');
      if(id==='connectfour'){
        const result=await page.evaluate(()=>{
          const b=game.empty();b[5][0]=b[5][1]=b[5][2]=2;const before=JSON.stringify(b),win=game.chooseMove(b,4),unchanged=before===JSON.stringify(b);
          b[5][0]=b[5][1]=b[5][2]=1;const block=game.chooseMove(b,4);
          const diagonal=game.empty();for(let i=0;i<4;i++)diagonal[5-i][i]=1;
          return {win,block,unchanged,diagonal:game.line(diagonal).player};
        });
        assert.deepEqual(result,{win:3,block:3,unchanged:true,diagonal:1});
        await page.locator('.four-column').nth(3).click();
        await page.locator('#pauseBtn').click();
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(()=>game.board.flat().filter(Boolean).length),1,'Paused AI must wait');
        await page.locator('#resumeBtn').click();
        await page.waitForFunction(()=>game.turn===1&&game.moves===2);
        const draw=await page.evaluate(()=>{game.board=Array.from({length:6},(_,r)=>[1,1,2,2,1,1,2].map(v=>r%2?3-v:v));return {win:game.line(game.board),legal:game.legal(game.board),choice:game.chooseMove(game.board,4)};});
        assert.deepEqual(draw,{win:null,legal:[],choice:null});
        await page.evaluate(()=>game.checkEnd());assert.equal(await page.locator('#endTitle').textContent(),'势均力敌，和棋！');
        await page.locator('#againBtn').click();
        await page.evaluate(()=>{game.board[5][0]=game.board[5][1]=game.board[5][2]=1;game.drop(3);});
        assert.equal(await page.locator('#endTitle').textContent(),'四子连线，你赢了！');
      }
      if(id==='colorlines'){
        assert.deepEqual(await page.evaluate(()=>{let b=Array(81).fill(0);b[0]=1;b[1]=2;const detour=game.path(0,2,b);b[9]=2;const blocked=game.path(0,2,b);b=Array(81).fill(0);for(let i=2;i<=6;i++){b[4*9+i]=1;b[i*9+4]=1;}return {detour:detour.length,blocked,cross:game.lines(b).length};}),{detour:5,blocked:null,cross:9});
        await page.evaluate(()=>{game.board=Array(81).fill(0);for(let i=0;i<4;i++)game.board[i]=1;game.board[13]=1;game.next=Array(expert?4:3).fill(2);game.render();});
        await page.locator('[data-cell="13"]').click();await page.locator('[data-cell="4"]').click();
        assert.deepEqual(await page.evaluate(()=>({filled:game.board.filter(Boolean).length,score:ui.score,moves:game.moves,next:game.next.length})),{filled:0,score:50,moves:1,next:mode==='expert'?4:3});
        const added=await page.evaluate(()=>{game.board=Array(81).fill(0);game.board[0]=1;game.selected=0;const rng=Math.random;Math.random=()=>0;game.tap(1);Math.random=rng;return game.board.filter(Boolean).length;});
        assert.equal(added,mode==='expert'?5:4);
        await page.evaluate(()=>{game.board=Array.from({length:81},(_,i)=>(Math.floor(i/9)*2+i%9)%7+1);game.board[80]=0;game.selected=79;game.next=[2,3,4];game.tap(80);});
        assert.equal(await page.locator('#endTitle').textContent(),'棋盘已满');
      }
      if(id==='yahtzee'){
        assert.deepEqual(await page.evaluate(()=>[scoreDice([2,2,2,3,3],'house'),scoreDice([2,2,2,3,3],'three'),scoreDice([2,2,2,3,3],'four'),scoreDice([1,2,2,3,4],'small'),scoreDice([1,2,2,3,4],'large'),scoreDice([2,3,4,5,6],'large'),scoreDice([6,6,6,6,6],'five')]),[25,12,0,30,0,40,50]);
        await page.evaluate(()=>{window.originalRandom=Math.random;let i=0;Math.random=()=>[0,.2,.4,.6,.8][i++%5];});
        await page.locator('#rollBtn').click();await page.locator('.die').first().click();
        await page.evaluate(()=>Math.random=()=>.99);await page.locator('#rollBtn').click();
        if(mode==='classic')await page.locator('#rollBtn').click();
        assert.deepEqual(await page.evaluate(()=>game.dice),[1,6,6,6,6]);
        assert.equal(await page.locator('#rollBtn').isDisabled(),true);
        await page.evaluate(()=>{game.roll();Math.random=window.originalRandom;});
        await page.locator('[data-category="four"]').click();
        assert.deepEqual(await page.evaluate(()=>{game.choose('four');game.choose('chance');return {scores:game.scores,round:game.round,rolls:game.rolls};}),{scores:{four:25},round:2,rolls:0});
        await page.evaluate(()=>{game.scores=Object.fromEntries(scoreCategories.filter(c=>c[0]!=='chance').map(([key],i)=>[key,i<6?(i+1)*3:0]));game.dice=[1,2,3,4,5];game.rolls=1;game.round=13;game.choose('chance');});
        assert.equal(await page.evaluate(()=>ui.score),113,'63 upper + 35 bonus + 15 chance');
        assert.equal(await page.locator('#endTitle').textContent(),'十三轮，记分完成！');
      }
      if(id==='columns'){
        const cascade=await page.evaluate(()=>{game.board=Array.from({length:13},()=>Array(6).fill(0));for(let c=0;c<3;c++)game.board[12][c]=1;game.board[11][0]=game.board[9][1]=game.board[10][2]=2;return {...game.resolve(),score:ui.score,remaining:game.board.flat().filter(Boolean).length};});
        assert.deepEqual(cascade,{chain:2,total:6,score:90,remaining:0});
        const diagonal=await page.evaluate(()=>{game.board=Array.from({length:13},()=>Array(6).fill(0));game.board[10][0]=game.board[11][1]=game.board[12][2]=4;return game.matches().length;});assert.equal(diagonal,3);
        await page.evaluate(()=>{ui.start();game.piece.colors=[1,2,3];game.next=[4,5,6];game.render();});
        await page.locator('#rotateBtn').click();assert.deepEqual(await page.evaluate(()=>game.piece.colors),[3,1,2]);
        await page.locator('#rightBtn').tap();assert.equal(await page.evaluate(()=>game.piece.x),3);
        await page.locator('#hardBtn').click();assert.deepEqual(await page.evaluate(()=>game.board.slice(10).map(row=>row[3])),[3,1,2]);
        await page.locator('#pauseBtn').click();const y=await page.evaluate(()=>game.piece.y);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>game.piece.y),y);await page.locator('#resumeBtn').click();
        await page.evaluate(()=>{game.board[0][2]=1;game.spawn();});assert.equal(await page.locator('#endScreen').isVisible(),true);
      }
      if(id==='pyramid'){
        await page.locator('[data-step="dl"]').click();assert.deepEqual(await page.evaluate(()=>game.player),{r:1,c:0});
        await page.locator('#pauseBtn').click();const before=await page.evaluate(()=>JSON.stringify({player:game.player,clock:game.clock}));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify({player:game.player,clock:game.clock})),before);await page.locator('#resumeBtn').click();
        const lives=await page.evaluate(()=>{game.player={r:0,c:0};game.lastMove=-Infinity;game.move('ul');return game.lives;});assert.equal(lives,mode==='expert'?1:2);
        await page.evaluate(()=>{game.tiles=Array.from({length:7},(_,r)=>Array(r+1).fill(expert?2:1));game.tiles[6][3]--;game.player={r:5,c:2};game.lastMove=-Infinity;game.move('dr');});
        assert.equal(await page.locator('#levelScreen').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>ui.paused),true,'Level screen cannot be bypassed');
        await page.locator('#nextLevelBtn').click();assert.equal(await page.evaluate(()=>game.level),2);assert.equal(await page.evaluate(()=>game.locked),false);
        await page.locator('#rescueBtn').click();await page.locator('#rescueBtn').click();assert.equal(await page.locator('#rescueBtn').isDisabled(),true);
        await page.evaluate(()=>{game.grace=0;game.lives=1;game.enemies=[{...game.player}];game.collision();});assert.equal(await page.locator('#endScreen').isVisible(),true);
      }
      await page.locator('#againBtn').click();
      await page.screenshot({path:path.join(root,'.artifacts/classics',id+'-'+mode+'-play.png')});
      for(const size of [{width:320,height:640},{width:1280,height:800}]){
        await page.setViewportSize(size);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow: '+id+' '+size.width);
      }
      await page.locator('#pauseBtn').click();await page.locator('#restartBtn').click();
      assert.equal(await page.evaluate(()=>ui.active()),true);assert.equal(await page.evaluate(()=>ui.score),0);
      assert.deepEqual(errors,[],id+' runtime errors');
      console.log('PASS '+id+' '+mode);await context.close();
    }
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
