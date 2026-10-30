module.exports = {
  meta:{name:'彩色连珠',icon:'🟣',color:'#AD3F78',desc:'经典九宫彩珠棋：沿空格移动彩珠，横竖斜连成五颗消除。预览下一批彩珠，规划路线挑战高分。'},
  extraLabel:'移动次数',tagline:'给彩珠让条路，把五颗连成线。',
  rules:'点击一颗彩珠，再点空格。只有沿上下左右空格能到达的位置才能移动。横、竖或斜向连成五颗同色彩珠即可消除；没有消除时新增三颗。棋盘填满则结束。',
  hint:'选择彩珠，再选空格 · 同色五连可横、竖或斜向消除',
  board:'<div class="preview" id="nextColors" aria-label="下一批彩珠"></div><div class="lines-board" id="board" role="group" aria-label="九乘九彩色连珠棋盘"></div>',
  css:'.lines-board{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:2px;padding:4px;background:var(--soft);border:1px solid var(--line);border-radius:18px}.lines-cell{aspect-ratio:1;min-height:44px;min-width:0;display:grid;place-items:center;border:0;background:var(--surface);border-radius:7px;padding:2px}.ball{height:90%;width:90%;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:clamp(9px,3vw,14px);font-weight:800;box-shadow:inset -3px -4px 0 #0002,inset 3px 3px 0 #fff3;text-shadow:0 1px 2px #0006}.lines-cell.selected{outline:3px solid var(--accent);outline-offset:-2px}.lines-cell.selected .ball{transform:scale(.85)}.lines-cell:focus-visible{outline-offset:0}.preview{min-height:27px}.preview .token{box-shadow:inset -2px -2px 0 #0002}',
  script:String.raw`
const ballColors=['#d94763','#257bc0','#249575','#a768cf','#bb791b','#c24722','#4a55ae'];
const ballMarks=['●','◆','▲','★','■','✚','✦'];
const game={
  board:Array(81).fill(0),selected:-1,next:[],moves:0,
  color(){return 1+Math.floor(Math.random()*7);},
  empty(){return this.board.flatMap((v,i)=>v?[]:[i]);},
  start(){this.board=Array(81).fill(0);this.selected=-1;this.moves=0;this.next=Array.from({length:5},()=>this.color());this.spawn();this.next=Array.from({length:expert?4:3},()=>this.color());this.render();ui.say('先选一颗彩珠，再选它能到达的空格。');},
  preview(){this.render();},
  path(from,to,b=this.board){
    if(from<0||to<0||b[to])return null;const queue=[from],prev=new Map([[from,-1]]);
    for(let k=0;k<queue.length;k++){const at=queue[k];if(at===to){const route=[];let cur=to;while(cur!==-1){route.unshift(cur);cur=prev.get(cur);}return route;}
      const r=Math.floor(at/9),c=at%9;for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){const y=r+dy,x=c+dx;if(y<0||y>=9||x<0||x>=9)continue;const i=y*9+x;if(!b[i]&&!prev.has(i)){prev.set(i,at);queue.push(i);}}
    }return null;
  },
  lines(b=this.board){
    const found=new Set();for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(b[r*9+c])for(const [dy,dx]of [[0,1],[1,0],[1,1],[1,-1]]){const cells=[];let y=r,x=c;while(y>=0&&y<9&&x>=0&&x<9&&b[y*9+x]===b[r*9+c]){cells.push(y*9+x);y+=dy;x+=dx;}if(cells.length>=5)cells.forEach(i=>found.add(i));}return [...found];
  },
  clear(){const found=this.lines();if(!found.length)return 0;found.forEach(i=>this.board[i]=0);ui.add(found.length*10);ui.tone(620);ui.say('消除 '+found.length+' 颗！保留下一批彩珠，继续布局。');return found.length;},
  spawn(){const added=[];for(const value of this.next){const spaces=this.empty();if(!spaces.length)break;const index=spaces[Math.floor(Math.random()*spaces.length)];this.board[index]=value;added.push(index);}this.clear();return added;},
  tap(i){
    if(!ui.active())return;
    if(this.board[i]){this.selected=this.selected===i?-1:i;this.render();return;}
    if(this.selected<0){ui.say('先点一颗彩珠，再选择空格。');return;}
    const route=this.path(this.selected,i);if(!route){ui.say('这条路被挡住了，试试其他空格。');ui.tone(170);return;}
    this.board[i]=this.board[this.selected];this.board[this.selected]=0;this.selected=-1;this.moves++;ui.tone();
    if(!this.clear()){this.spawn();this.next=Array.from({length:expert?4:3},()=>this.color());ui.say('新增了 '+(expert?4:3)+' 颗彩珠，寻找下一条五连。');}
    this.render();if(!this.empty().length)ui.finish('棋盘已满','下次试着给彩珠留出更宽的通路');
  },
  render(){
    $('nextColors').replaceChildren();const label=document.createElement('span');label.textContent='下一批';$('nextColors').append(label);for(const value of this.next){const token=document.createElement('span');token.className='token';token.style.background=ballColors[value-1];token.textContent=ballMarks[value-1];$('nextColors').append(token);}
    const old=Number(document.activeElement?.dataset.cell);$('board').replaceChildren();for(let i=0;i<81;i++){const b=document.createElement('button');b.className='lines-cell'+(this.selected===i?' selected':'');b.dataset.cell=i;b.setAttribute('aria-label','第'+(Math.floor(i/9)+1)+'行第'+(i%9+1)+'列，'+(this.board[i]?'彩珠'+this.board[i]:'空格'));b.setAttribute('aria-pressed',String(this.selected===i));b.onclick=()=>this.tap(i);if(this.board[i]){const ball=document.createElement('span');ball.className='ball';ball.style.background=ballColors[this.board[i]-1];ball.textContent=ballMarks[this.board[i]-1];b.append(ball);}$('board').append(b);}if(Number.isInteger(old))$('board').children[old]?.focus({preventScroll:true});ui.hud(this.moves);
  },
  key(e){if(!e.key.startsWith('Arrow'))return;const at=Number(document.activeElement?.dataset.cell);if(!Number.isInteger(at))return;e.preventDefault();const r=Math.floor(at/9),c=at%9;let next=at;if(e.key==='ArrowLeft'&&c>0)next--;if(e.key==='ArrowRight'&&c<8)next++;if(e.key==='ArrowUp'&&r>0)next-=9;if(e.key==='ArrowDown'&&r<8)next+=9;$('board').children[next].focus();}
};
`
};
