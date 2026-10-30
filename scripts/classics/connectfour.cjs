module.exports = {
  meta:{name:'四子棋',icon:'🔴',color:'#C84A44',desc:'红金双人落子，与电脑争先连成四子。支持横竖斜线获胜、满盘和棋与六层搜索进阶挑战。'},
  extraLabel:'落子步数',tagline:'先连成四颗，就能赢下这一局。',
  rules:'你执红棋，电脑执金棋。点击一列，让棋子落到最下方。横、竖或斜向率先连成四颗获胜，棋盘填满则和棋。',
  hint:'点按棋盘的一列落子 · ← → 选择列，空格 / 回车确认',
  board:'<div class="players"><span><i class="red-dot"></i>你执红棋</span><span><i class="gold-dot"></i>电脑执金棋</span></div><div id="board" class="four-board" role="group" aria-label="四子棋棋盘"></div>',
  controls:'<button id="leftBtn" aria-label="选择左列">←</button><button id="dropBtn">落子</button><button id="rightBtn" aria-label="选择右列">→</button>',
  css:'.players{display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}.players span{display:flex;align-items:center;gap:6px}.red-dot,.gold-dot{width:12px;height:12px;border-radius:50%;background:#c84a44}.gold-dot{background:#e3b242}.four-board{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;background:#405c4c;border:5px solid #405c4c;border-radius:18px;padding:2px;box-shadow:0 7px 0 #293f33}.four-column{display:grid;grid-template-rows:repeat(6,1fr);gap:5px;min-width:0;border:0;background:none;padding:3px;border-radius:9px}.four-column.selected{background:#ffffff24}.hole{display:grid;place-items:center;aspect-ratio:1;border-radius:50%;background:#263d31;box-shadow:inset 0 3px 4px #0005;color:#fff;font-size:clamp(12px,4vw,20px)}.hole.red{background:#c84a44;box-shadow:inset 0 0 0 4px #ffffff20,0 2px 0 #852e2a}.hole.gold{background:#e3b242;color:#44350e;box-shadow:inset 0 0 0 4px #ffffff30,0 2px 0 #987724}.hole.win{outline:3px solid white;outline-offset:-3px}',
  script:String.raw`
const game = {
  board:[], turn:1, moves:0, selected:3, timer:null, winning:[],
  empty() { return Array.from({length:6},()=>Array(7).fill(0)); },
  start() { clearTimeout(this.timer); this.board=this.empty();this.turn=1;this.moves=0;this.selected=3;this.winning=[];ui.say('轮到你了：选择一列，落下红棋。');this.render(); },
  preview() { this.board=this.empty();this.render(); },
  legal(b) { return [3,2,4,1,5,0,6].filter(c=>b[0][c]===0); },
  put(b,c,p) { for(let r=5;r>=0;r--) if(!b[r][c]) { b[r][c]=p;return r; } return -1; },
  line(b) {
    for(let r=0;r<6;r++) for(let c=0;c<7;c++) if(b[r][c]) for(const [dy,dx] of [[0,1],[1,0],[1,1],[1,-1]]) {
      const cells=[]; for(let k=0;k<4;k++) { const y=r+dy*k,x=c+dx*k;if(y<0||y>=6||x<0||x>=7||b[y][x]!==b[r][c]) break;cells.push([y,x]); }
      if(cells.length===4) return {player:b[r][c],cells};
    }
    return null;
  },
  evaluate(b) {
    let score=0;
    for(let r=0;r<6;r++) score+=b[r][3]===2?6:b[r][3]===1?-6:0;
    for(let r=0;r<6;r++) for(let c=0;c<7;c++) for(const [dy,dx] of [[0,1],[1,0],[1,1],[1,-1]]) {
      let ai=0,human=0,valid=true;
      for(let k=0;k<4;k++) { const y=r+dy*k,x=c+dx*k;if(y<0||y>=6||x<0||x>=7){valid=false;break;} if(b[y][x]===2)ai++;if(b[y][x]===1)human++; }
      if(valid && !human) score += [0,1,9,70,10000][ai];
      if(valid && !ai) score -= [0,1,12,95,10000][human];
    }
    return score;
  },
  search(b,depth,player,alpha,beta) {
    const win=this.line(b); if(win) return win.player===2?100000+depth:-100000-depth;
    const cols=this.legal(b);if(!cols.length)return 0;if(!depth)return this.evaluate(b);
    let best=player===2?-Infinity:Infinity;
    for(const c of cols){const r=this.put(b,c,player);const val=this.search(b,depth-1,3-player,alpha,beta);b[r][c]=0;
      if(player===2){best=Math.max(best,val);alpha=Math.max(alpha,best);}else{best=Math.min(best,val);beta=Math.min(beta,best);}if(beta<=alpha)break;
    }return best;
  },
  chooseMove(b,depth) {
    let best=-Infinity,chosen=null;
    for(const c of this.legal(b)) { const r=this.put(b,c,2);const value=this.search(b,depth-1,1,-Infinity,Infinity);b[r][c]=0;if(value>best){best=value;chosen=c;} }
    return chosen;
  },
  checkEnd() {
    const win=this.line(this.board);
    if(win){this.winning=win.cells;this.render();if(win.player===1)ui.add(100);ui.finish(win.player===1?'四子连线，你赢了！':'电脑连成了四子',win.player===1?'漂亮的布局，再挑战一局吧':'留意电脑的两头威胁，下次再来');return true;}
    if(!this.legal(this.board).length){ui.finish('势均力敌，和棋！','棋盘已满，双方都没有四子连线');return true;}return false;
  },
  drop(c) {
    if(!ui.active()||this.turn!==1||this.board[0][c])return;
    this.put(this.board,c,1);this.moves++;this.selected=c;ui.add(5);ui.tone(330);this.render();if(this.checkEnd())return;
    this.turn=2;ui.say('电脑正在思考…');this.render();this.scheduleAI();
  },
  scheduleAI() { clearTimeout(this.timer);this.timer=setTimeout(()=>{if(!ui.running||this.turn!==2)return;if(ui.paused){this.scheduleAI();return;}const col=this.chooseMove(this.board,expert?6:4);if(col===null)return;this.put(this.board,col,2);this.moves++;this.turn=1;this.render();if(!this.checkEnd())ui.say('轮到你了：红棋先连成四颗。');},220); },
  render() {
    const board=$('board');board.replaceChildren();
    for(let c=0;c<7;c++){const col=document.createElement('button');col.className='four-column'+(c===this.selected?' selected':'');col.setAttribute('aria-label','第'+(c+1)+'列'+(this.board[0][c]?'，已满':'，落子'));col.disabled=!!this.board[0][c]||this.turn===2;col.onclick=()=>this.drop(c);
      for(let r=0;r<6;r++){const disc=document.createElement('span');disc.className='hole'+(this.board[r][c]===1?' red':this.board[r][c]===2?' gold':'')+(this.winning.some(p=>p[0]===r&&p[1]===c)?' win':'');disc.textContent=this.board[r][c]===1?'●':this.board[r][c]===2?'◆':'';col.append(disc);}board.append(col);
    }ui.hud(this.moves);
  },
  key(e){if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')this.selected=(this.selected+6)%7;else if(e.key==='ArrowRight')this.selected=(this.selected+1)%7;else this.drop(this.selected);this.render();}}
};
$('leftBtn').onclick=()=>{if(ui.active()){game.selected=(game.selected+6)%7;game.render();}};
$('rightBtn').onclick=()=>{if(ui.active()){game.selected=(game.selected+1)%7;game.render();}};
$('dropBtn').onclick=()=>game.drop(game.selected);
`
};
