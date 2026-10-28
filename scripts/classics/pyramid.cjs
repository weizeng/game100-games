module.exports={
  meta:{name:'跳格金字塔',icon:'🔶',color:'#DA9442',desc:'沿金字塔斜向跳跃，踩亮每一块方格。避开追逐球，借助传送盘回到顶端，挑战不断升级的关卡。'},
  extraLabel:'生命 / 关卡',tagline:'一步一块，点亮整座金字塔。',
  rules:'沿四个斜方向跳跃，把全部方格踩亮。跳出边界或碰到追逐球会失去一条命。每关有两次传送机会，回到顶点脱险。踩亮整座金字塔即可进入下一关。',
  hint:'↖ ↗ ↙ ↘ 跳跃 · 键盘 Q E Z C 或方向键 · 空格传送',
  board:'<div class="stage pyramid-stage"><canvas id="cv" width="420" height="365" aria-label="七层金字塔跳跃棋盘"></canvas><div class="pyramid-legend"><span>◆ 踩亮方格</span><span>● 避开追逐球</span></div></div>',
  controls:'<div class="jump-pad"><button data-step="ul" aria-label="向左上跳">↖</button><button data-step="ur" aria-label="向右上跳">↗</button><button data-step="dl" aria-label="向左下跳">↙</button><button data-step="dr" aria-label="向右下跳">↘</button></div><button id="rescueBtn">传送回顶点 · 2</button>',
  extraHtml:'<section id="levelScreen" class="overlay hidden"><h2>整座金字塔亮起来了！</h2><p id="levelText"></p><button id="nextLevelBtn" class="btn">进入下一关</button></section>',
  css:'.pyramid-stage{padding:8px 8px 12px;background:#dce9f7}.pyramid-stage canvas{max-height:43svh;width:auto;max-width:100%;margin:auto}.pyramid-legend{display:flex;justify-content:space-around;font-size:11px;color:#506e93}.jump-pad{display:grid;grid-template-columns:repeat(2,68px);gap:6px}.jump-pad button{font-size:23px;min-height:46px}.game-ui[data-game=pyramid] .controls{align-items:center;gap:16px}.game-ui[data-game=pyramid] #rescueBtn{max-width:130px;font-size:13px;line-height:1.6}.game-ui[data-game=pyramid] body>.wrap{gap:10px}',
  script:String.raw`
const jumps={ul:[-1,-1],ur:[-1,0],dl:[1,0],dr:[1,1]};
const game={
  tiles:[],player:{r:0,c:0},enemies:[],lives:3,level:1,discs:2,clock:0,enemyClock:0,spawnClock:0,last:0,lastMove:0,grace:0,locked:false,
  valid(r,c){return r>=0&&r<7&&c>=0&&c<=r;},
  start(){this.level=1;this.lives=expert?2:3;this.locked=false;this.setup();},
  setup(){this.tiles=Array.from({length:7},(_,r)=>Array(r+1).fill(0));this.player={r:0,c:0};this.tiles[0][0]=1;this.enemies=[];this.discs=2;this.clock=0;this.enemyClock=0;this.spawnClock=0;this.grace=1300;this.lastMove=0;ui.say(expert?'每块方格需要踩亮两次，留意下一步的退路。':'把每块方格踩成金色，追逐球很快就会来了。');this.render();},
  preview(){this.tiles=Array.from({length:7},(_,r)=>Array(r+1).fill(0));this.render();},
  completed(){return this.tiles.every(row=>row.every(v=>v>=(expert?2:1)));},
  paint(){const {r,c}=this.player;if(this.tiles[r][c]<(expert?2:1)){this.tiles[r][c]++;ui.add(10);}if(this.completed()){ui.add(this.level*100);ui.save();this.locked=true;ui.paused=true;$('pauseBtn').disabled=true;$('levelText').textContent='第 '+this.level+' 关完成，奖励 '+this.level*100+' 分。下一关追逐球会更快。';$('levelScreen').classList.remove('hidden');ui.tone(700);}},
  move(direction){
    if(!ui.active()||!jumps[direction])return;
    const now=performance.now();if(now-this.lastMove<130)return;this.lastMove=now;
    const [dy,dx]=jumps[direction],r=this.player.r+dy,c=this.player.c+dx;
    if(!this.valid(r,c)){this.hurt('跳出了边界，回到顶点重新找路线。');return;}
    this.player={r,c};ui.tone(280+r*35);this.paint();if(!this.locked)this.collision();this.render();
  },
  hurt(reason){if(!ui.active())return;this.lives--;if(!this.lives){this.render();ui.finish('这次冒险到这里','已到达第 '+this.level+' 关，试着把传送留给险境');return;}this.player={r:0,c:0};this.enemies=[];this.grace=1600;this.spawnClock=0;ui.say(reason+' 还剩 '+this.lives+' 条命。');ui.tone(150);this.render();},
  collision(){if(this.grace<=0&&this.enemies.some(e=>e.r===this.player.r&&e.c===this.player.c))this.hurt('碰到追逐球了。');},
  rescue(){if(!ui.active()||!this.discs)return;this.discs--;this.player={r:0,c:0};this.grace=1400;this.paint();ui.say('传送成功！观察追逐球的位置再出发。');ui.tone(580);this.render();},
  distance(a,b){return Math.abs(a.c-b.c)+Math.abs((a.r-a.c)-(b.r-b.c));},
  advanceEnemies(){for(const enemy of this.enemies){const options=Object.values(jumps).map(([dy,dx])=>({r:enemy.r+dy,c:enemy.c+dx})).filter(p=>this.valid(p.r,p.c));options.sort((a,b)=>this.distance(a,this.player)-this.distance(b,this.player));if(options.length)Object.assign(enemy,options[0]);}this.collision();},
  nextLevel(){if(!this.locked)return;this.level++;this.locked=false;ui.paused=false;$('levelScreen').classList.add('hidden');$('pauseBtn').disabled=false;this.setup();},
  render(){
    const ctx=$('cv').getContext('2d');
    /* ART T2-4 */var FX=window.GameUI&&GameUI.fx&&GameUI.fx.on?GameUI.fx:null;
    if(!this._pyBg){const c=document.createElement('canvas');c.width=420;c.height=365;const g=c.getContext('2d');if(FX)FX.stage(g,420,365,'#e8f2fc','#c7d9ec');else{g.fillStyle='#dce9f7';g.fillRect(0,0,420,365);}this._pyBg=c;}
    ctx.drawImage(this._pyBg,0,0);
    if(FX){FX.shadow(ctx,210,330,165,13,.25);}else{ctx.fillStyle='#c7d9ec';ctx.beginPath();ctx.ellipse(210,330,165,13,0,0,Math.PI*2);ctx.fill();}
    const pos=(r,c)=>({x:210+(c-r/2)*48,y:42+r*43});
    for(let r=0;r<7;r++)for(let c=0;c<=r;c++){const {x,y}=pos(r,c),v=this.tiles[r]?.[c]||0;ctx.fillStyle=v>=(expert?2:1)?'#cd9142':v?'#5a9b9e':'#7993b4';ctx.beginPath();ctx.moveTo(x-24,y);ctx.lineTo(x,y+13);ctx.lineTo(x,y+31);ctx.lineTo(x-24,y+18);ctx.closePath();ctx.fill();ctx.fillStyle=v>=(expert?2:1)?'#b77c35':v?'#43888d':'#56769f';ctx.beginPath();ctx.moveTo(x,y+13);ctx.lineTo(x+24,y);ctx.lineTo(x+24,y+18);ctx.lineTo(x,y+31);ctx.closePath();ctx.fill();ctx.fillStyle=v>=(expert?2:1)?'#ffc66b':v?'#8bd0c2':'#aac0da';ctx.beginPath();ctx.moveTo(x,y-13);ctx.lineTo(x+24,y);ctx.lineTo(x,y+13);ctx.lineTo(x-24,y);ctx.closePath();ctx.fill();ctx.strokeStyle='#dce9f7';ctx.lineWidth=1.5;ctx.stroke();if(expert&&v===1){ctx.fillStyle='#366b71';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('1/2',x,y+3);}}
    for(const e of this.enemies){const {x,y}=pos(e.r,e.c);if(FX){FX.glow(ctx,'#584774',8);FX.orb(ctx,x|0,(y-15)|0,11,'#584774');FX.noGlow(ctx);}else{ctx.fillStyle='#584774';ctx.beginPath();ctx.arc(x,y-15,11,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff';ctx.fillRect(x-6,y-19,4,4);ctx.fillRect(x+2,y-19,4,4);ctx.fillStyle='#ffb17c';ctx.fillRect(x-5,y-14,3,2);ctx.fillRect(x+3,y-14,3,2);}
    const {x,y}=pos(this.player.r,this.player.c);ctx.globalAlpha=this.grace>0?.72:1;if(FX){FX.tile(ctx,(x-11)|0,(y-29)|0,22,23,'#e48339',6);FX.tile(ctx,(x-11)|0,(y-29)|0,22,5,'#ffe0a1',3);}else{ctx.fillStyle='#e48339';ctx.fillRect(x-11,y-29,22,23);ctx.fillStyle='#ffe0a1';ctx.fillRect(x-11,y-29,22,5);}ctx.fillStyle='#fff';ctx.fillRect(x-7,y-21,5,6);ctx.fillRect(x+2,y-21,5,6);ctx.fillStyle='#293f67';ctx.fillRect(x-5,y-19,3,3);ctx.fillRect(x+2,y-19,3,3);ctx.fillStyle='#c9672a';ctx.fillRect(x-12,y-7,9,4);ctx.fillRect(x+3,y-7,9,4);ctx.globalAlpha=1;
    $('rescueBtn').textContent='传送回顶点 · '+this.discs;$('rescueBtn').disabled=!this.discs;ui.hud(this.lives+' / '+this.level);
  },
  tick(t){const dt=this.last?Math.min(100,t-this.last):0;this.last=t;if(ui.active()){this.clock+=dt;this.grace=Math.max(0,this.grace-dt);this.enemyClock+=dt;this.spawnClock+=dt;if(this.spawnClock>=3800&&this.enemies.length<Math.min(3,1+Math.floor(this.level/2))){this.spawnClock=0;this.enemies.push({r:6,c:Math.floor(Math.random()*7)});ui.say('追逐球出现了！留好回到顶点的传送。');}if(this.enemyClock>=Math.max(430,1250-this.level*90)){this.enemyClock=0;this.advanceEnemies();}this.render();}requestAnimationFrame(t=>this.tick(t));},
  key(e){const map={q:'ul',e:'ur',z:'dl',c:'dr',ArrowLeft:'ul',ArrowUp:'ur',ArrowDown:'dl',ArrowRight:'dr'};if(map[e.key]){e.preventDefault();this.move(map[e.key]);}if(e.code==='Space'){e.preventDefault();this.rescue();}}
};
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>game.move(b.dataset.step));$('rescueBtn').onclick=()=>game.rescue();$('nextLevelBtn').onclick=()=>game.nextLevel();requestAnimationFrame(t=>game.tick(t));
`
};
