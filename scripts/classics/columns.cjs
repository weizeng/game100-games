module.exports={
  meta:{name:'宝石列柱',icon:'💎',color:'#6B78CE',desc:'三颗宝石成列落下，循环换色、横移摆放。横竖斜三连消除，利用重力制造多重连锁。'},
  extraLabel:'等级',tagline:'换个顺序，落下一整串连锁。',
  rules:'每次落下一列三颗宝石。左右移动，换色调整三颗的顺序；横、竖或斜向至少三颗同色就会消除。消除后的宝石继续下落，可触发连锁。堆到顶端则结束。',
  hint:'← → 移动 · ↑ 换色 · ↓ 加速 · 空格直落；也可点按 / 滑动棋盘',
  board:'<div class="stage columns-frame"><canvas id="cv" width="240" height="520" tabindex="0" aria-label="六列十三行宝石列柱棋盘"></canvas><aside><p>下一组</p><div id="nextGems"></div><p>已消除</p><b id="clearedV">0</b><p id="chainV">等待连锁</p></aside></div>',
  controls:'<button id="leftBtn" aria-label="向左移动">←</button><button id="rotateBtn">换色</button><button id="downBtn" aria-label="加速下落">↓</button><button id="rightBtn" aria-label="向右移动">→</button><button id="hardBtn">直落</button>',
  css:'.columns-frame{display:flex;justify-content:center;gap:14px;padding:12px}.columns-frame #cv{height:min(52svh,460px);width:auto;max-width:calc(100% - 60px);border-radius:6px}.columns-frame aside{width:44px;flex-shrink:0;text-align:center;color:#b1c6d9;font-size:11px}.columns-frame aside p{line-height:1.6;margin:4px 0 12px}.columns-frame aside b{font-size:23px;color:#f0bc74}.columns-frame #nextGems{display:flex;flex-direction:column;align-items:center;gap:5px;margin-bottom:20px}.next-gem{width:30px;height:30px;display:grid;place-items:center;border-radius:7px;font-size:20px;color:#fff}.game-ui[data-game=columns] .controls{gap:6px}.game-ui[data-game=columns] .controls button{min-width:44px;padding:8px 11px;font-size:15px}.game-ui[data-game=columns] body>.wrap{gap:10px}',
  script:String.raw`
const gemColors=['#e35c79','#63b9ed','#65c596','#d5ad5d','#a890e2','#e58c5f','#69c7cb'];
const gemMarks=['●','◆','▲','★','■','✚','✦'];
const game={
  board:Array.from({length:13},()=>Array(6).fill(0)),piece:null,next:[],cleared:0,level:1,elapsed:0,last:0,holdTimer:null,holdDelay:null,
  random(){return 1+Math.floor(Math.random()*(expert?7:6));},
  trio(){return [this.random(),this.random(),this.random()];},
  start(){this.cancelHold();this.board=Array.from({length:13},()=>Array(6).fill(0));this.cleared=0;this.level=1;this.elapsed=0;this.next=this.trio();$('chainV').textContent='等待连锁';this.spawn();ui.say('三颗成列，横、竖、斜向三连都能消除。');this.render();},
  preview(){this.render();},
  valid(x,y,colors=this.piece?.colors){return !!colors&&colors.every((_,i)=>x>=0&&x<6&&y+i<13&&(y+i<0||!this.board[y+i][x]));},
  spawn(){this.piece={x:2,y:-2,colors:this.next};this.next=this.trio();this.elapsed=0;if(!this.valid(2,-2))ui.finish('宝石堆到顶端了','试着沿斜线留出连锁空间');},
  matches(b=this.board){
    const found=new Set();for(let r=0;r<13;r++)for(let c=0;c<6;c++)if(b[r][c])for(const [dy,dx] of [[0,1],[1,0],[1,1],[1,-1]]){let cells=[],y=r,x=c;while(y>=0&&y<13&&x>=0&&x<6&&b[y][x]===b[r][c]){cells.push(y*6+x);y+=dy;x+=dx;}if(cells.length>=3)cells.forEach(i=>found.add(i));}return [...found];
  },
  gravity(){for(let c=0;c<6;c++){const values=this.board.map(row=>row[c]).filter(Boolean);for(let r=12;r>=0;r--)this.board[r][c]=values.pop()||0;}},
  resolve(){let chain=0,total=0;while(true){const cells=this.matches();if(!cells.length)break;chain++;total+=cells.length;cells.forEach(i=>this.board[Math.floor(i/6)][i%6]=0);this.gravity();ui.add(cells.length*10*chain);}this.cleared+=total;this.level=1+Math.floor(this.cleared/24);if(chain){$('chainV').textContent=chain+' 连锁！';ui.say('消除 '+total+' 颗宝石，打出 '+chain+' 连锁！');ui.tone(520+chain*70);}return {chain,total};},
  lock(){if(!this.piece)return;if(this.piece.y<0){ui.finish('没有落脚空间了','三颗宝石需要完整进入棋盘');return;}this.piece.colors.forEach((v,k)=>this.board[this.piece.y+k][this.piece.x]=v);this.resolve();this.spawn();this.render();},
  move(dx){if(!ui.active()||!this.piece)return;if(this.valid(this.piece.x+dx,this.piece.y)){this.piece.x+=dx;this.render();}},
  rotate(){if(!ui.active()||!this.piece)return;this.piece.colors=[this.piece.colors[2],this.piece.colors[0],this.piece.colors[1]];ui.tone(410);this.render();},
  down(soft=false){if(!ui.active()||!this.piece)return;if(this.valid(this.piece.x,this.piece.y+1)){this.piece.y++;if(soft)ui.add(1);}else this.lock();this.render();},
  hard(){if(!ui.active()||!this.piece)return;let distance=0;while(this.valid(this.piece.x,this.piece.y+1)){this.piece.y++;distance++;}ui.add(distance*2);this.lock();ui.tone(260);},
  render(){
    const ctx=$('cv').getContext('2d');ctx.fillStyle='#142438';ctx.fillRect(0,0,240,520);ctx.strokeStyle='#294056';ctx.lineWidth=1;for(let r=0;r<=13;r++){ctx.beginPath();ctx.moveTo(0,r*40);ctx.lineTo(240,r*40);ctx.stroke();}for(let c=0;c<=6;c++){ctx.beginPath();ctx.moveTo(c*40,0);ctx.lineTo(c*40,520);ctx.stroke();}
    const gem=(r,c,v,alpha=1)=>{if(r<0||r>=13)return;ctx.globalAlpha=alpha;ctx.fillStyle=gemColors[v-1];ctx.beginPath();ctx.roundRect(c*40+4,r*40+4,32,32,7);ctx.fill();ctx.fillStyle='#ffffff30';ctx.fillRect(c*40+9,r*40+7,22,3);ctx.fillStyle='#fff';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(gemMarks[v-1],c*40+20,r*40+21);ctx.globalAlpha=1;};
    this.board.forEach((row,r)=>row.forEach((v,c)=>{if(v)gem(r,c,v);}));
    if(this.piece&&ui.running){let landing=this.piece.y;while(this.valid(this.piece.x,landing+1))landing++;this.piece.colors.forEach((v,i)=>gem(landing+i,this.piece.x,v,.18));this.piece.colors.forEach((v,i)=>gem(this.piece.y+i,this.piece.x,v));}
    $('nextGems').replaceChildren();for(const v of this.next){const s=document.createElement('span');s.className='next-gem';s.style.background=gemColors[v-1];s.textContent=gemMarks[v-1];$('nextGems').append(s);}$('clearedV').textContent=this.cleared;ui.hud(this.level);
  },
  tick(t){const dt=this.last?Math.min(100,t-this.last):0;this.last=t;if(ui.active()){this.elapsed+=dt;const interval=Math.max(130,(expert?590:820)-(this.level-1)*55);if(this.elapsed>=interval){this.elapsed=0;this.down();}}requestAnimationFrame(t=>this.tick(t));},
  cancelHold(){clearTimeout(this.holdDelay);clearInterval(this.holdTimer);},
  key(e){const actions={ArrowLeft:()=>this.move(-1),ArrowRight:()=>this.move(1),ArrowDown:()=>this.down(true),ArrowUp:()=>this.rotate(),' ':()=>this.hard()};if(actions[e.key]){e.preventDefault();actions[e.key]();}}
};
for(const [id,action]of [['leftBtn',()=>game.move(-1)],['rightBtn',()=>game.move(1)],['downBtn',()=>game.down(true)]]){const b=$(id);b.onpointerdown=e=>{e.preventDefault();if(!ui.active())return;b.setPointerCapture(e.pointerId);game.cancelHold();action();game.holdDelay=setTimeout(()=>game.holdTimer=setInterval(action,90),240);};b.onpointerup=b.onpointercancel=()=>game.cancelHold();b.onclick=e=>{if(e.detail===0)action();};}
$('rotateBtn').onclick=()=>game.rotate();$('hardBtn').onclick=()=>game.hard();
let touch=null;$('cv').onpointerdown=e=>{e.preventDefault();touch={x:e.clientX,y:e.clientY};$('cv').setPointerCapture(e.pointerId);};$('cv').onpointercancel=()=>touch=null;$('cv').onpointerup=e=>{if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.abs(dy)>35&&dy>Math.abs(dx))game.hard();else if(Math.abs(dx)>20)game.move(dx>0?1:-1);else game.rotate();};
requestAnimationFrame(t=>game.tick(t));
`
};
