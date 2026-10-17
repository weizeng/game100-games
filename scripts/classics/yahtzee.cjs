module.exports={
  meta:{name:'快艇骰子',icon:'🎲',color:'#AB5938',desc:'五颗骰子、十三轮抉择。保留好骰再重掷，收集顺子、葫芦与五同，上区满63分再奖35分。'},
  extraLabel:'轮次',tagline:'掷出好手气，更要选对计分格。',
  rules:'每轮最多掷三次，点击骰子保留，再把结果记入一个未用的计分格。十三格各用一次；上区合计至少63分奖励35分。本作不计额外五同奖励。',
  hint:'点骰子可保留 · R / 空格掷骰，数字 1—5 切换保留',
  board:'<div class="dice-tray"><div class="dice-row" id="diceRow"></div><p id="rollNote"></p><button class="btn" id="rollBtn">掷骰子</button></div><div class="sheet-heading"><strong>本轮记在哪一格？</strong><span id="bonusNote">上区 0 / 63</span></div><div class="score-sheet" id="scoreSheet"></div>',
  css:'.dice-tray{background:#694332;border:1px solid #80553d;border-radius:22px;padding:18px 12px;text-align:center;color:#fff3e3;box-shadow:inset 0 0 0 5px #ffffff07}.dice-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.die{border:2px solid transparent;padding:5px 2px;border-radius:12px;background:#fff8ee;color:#573c2a;aspect-ratio:.82;min-width:0;box-shadow:0 4px 0 #3d281e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}.die[aria-pressed=true]{border-color:#ffc977;box-shadow:0 0 0 2px #ffc977;background:#fff0c9}.die small{font-size:10px;height:12px}.die-face{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:30px;height:30px;gap:3px}.pip{border-radius:50%;background:#573c2a}.dice-tray p{font-size:12px;margin:16px 0 12px}.dice-tray .btn{width:100%;max-width:260px}.sheet-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px}.sheet-heading span{font-size:11px;color:var(--muted)}.score-sheet{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.score-choice{display:flex;justify-content:space-between;align-items:center;min-height:48px;padding:9px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);text-align:left;gap:6px}.score-choice span{font-size:12px}.score-choice b{font-size:19px;color:var(--accent)}.score-choice.used{background:var(--soft);opacity:1}.score-choice.used b{color:var(--muted)}.dice-tray .die:disabled{opacity:1}',
  script:String.raw`
const scoreCategories=[['ones','一点'],['twos','二点'],['threes','三点'],['fours','四点'],['fives','五点'],['sixes','六点'],['three','三条'],['four','四条'],['house','葫芦'],['small','小顺子'],['large','大顺子'],['five','五同'],['chance','全选']];
function scoreDice(dice,key){
  const counts=Array(7).fill(0);dice.forEach(v=>counts[v]++);const total=dice.reduce((a,b)=>a+b,0),upper=['ones','twos','threes','fours','fives','sixes'].indexOf(key);
  if(upper>=0)return counts[upper+1]*(upper+1);
  const has=n=>counts.some(c=>c>=n),straight=n=>{for(let start=1;start<=7-n;start++){let ok=true;for(let j=0;j<n;j++)if(!counts[start+j])ok=false;if(ok)return true;}return false;};
  if(key==='three')return has(3)?total:0;if(key==='four')return has(4)?total:0;
  if(key==='house')return counts.includes(3)&&counts.includes(2)?25:0;
  if(key==='small')return straight(4)?30:0;if(key==='large')return straight(5)?40:0;
  if(key==='five')return has(5)?50:0;if(key==='chance')return total;return 0;
}
const pipPlaces={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const game={
  dice:[0,0,0,0,0],held:[false,false,false,false,false],scores:{},rolls:0,round:1,
  start(){this.dice=[0,0,0,0,0];this.held=Array(5).fill(false);this.scores={};this.rolls=0;this.round=1;ui.say('先掷骰子，再点击想保留的骰子。');this.render();},
  preview(){this.render();},
  upper(){return scoreCategories.slice(0,6).reduce((sum,[key])=>sum+(this.scores[key]||0),0);},
  total(){return Object.values(this.scores).reduce((sum,v)=>sum+v,0)+(this.upper()>=63?35:0);},
  roll(){if(!ui.active()||this.rolls>=(expert?2:3))return;for(let i=0;i<5;i++)if(!this.held[i])this.dice[i]=1+Math.floor(Math.random()*6);this.rolls++;ui.tone(420);ui.say(this.rolls===(expert?2:3)?'掷骰次数用完了，选择一格记分。':'点击骰子保留，或现在就选择一格记分。');this.render();},
  hold(i){if(!ui.active()||!this.rolls)return;this.held[i]=!this.held[i];ui.tone(290);this.render();},
  choose(key){if(!ui.active()||!this.rolls||Object.hasOwn(this.scores,key)||!scoreCategories.some(c=>c[0]===key))return;const points=scoreDice(this.dice,key);this.scores[key]=points;ui.score=this.total();ui.tone(points?620:210);
    if(Object.keys(this.scores).length===13){this.render();ui.finish('十三轮，记分完成！','上区 '+this.upper()+' 分'+(this.upper()>=63?'，获得35分奖励':'，未达到上区奖励'));return;}
    this.round++;this.rolls=0;this.dice=Array(5).fill(0);this.held=Array(5).fill(false);ui.say('已记入 '+points+' 分。新一轮，试试新的组合。');this.render();
  },
  render(){
    $('diceRow').replaceChildren();for(let i=0;i<5;i++){const b=document.createElement('button');b.className='die';b.setAttribute('aria-pressed',String(this.held[i]));b.setAttribute('aria-label','骰子'+(i+1)+'，'+(this.dice[i]||'未掷')+'点，'+(this.held[i]?'已保留':'未保留'));b.disabled=!this.rolls;b.onclick=()=>this.hold(i);const face=document.createElement('span');face.className='die-face';if(this.dice[i]){for(let j=0;j<9;j++){const dot=document.createElement('span');if(pipPlaces[this.dice[i]].includes(j))dot.className='pip';face.append(dot);}}else{face.textContent='?';face.style.display='block';face.style.fontSize='25px';}const mark=document.createElement('small');mark.textContent=this.held[i]?'已保留':'点按保留';b.append(face,mark);$('diceRow').append(b);}
    $('rollNote').textContent='第 '+this.round+' / 13 轮 · 还可掷 '+((expert?2:3)-this.rolls)+' 次';$('rollBtn').disabled=this.rolls>=(expert?2:3);$('rollBtn').textContent=this.rolls?'重掷未保留骰子':'掷骰子';$('bonusNote').textContent='上区 '+this.upper()+' / 63'+(this.upper()>=63?' · 奖励 +35':'');
    $('scoreSheet').replaceChildren();for(const [key,name]of scoreCategories){const used=Object.hasOwn(this.scores,key),b=document.createElement('button');b.className='score-choice'+(used?' used':'');b.dataset.category=key;b.disabled=used||!this.rolls;const n=document.createElement('span');n.textContent=name+(used?' ✓':'');const v=document.createElement('b');v.textContent=used?this.scores[key]:this.rolls?scoreDice(this.dice,key):'—';b.append(n,v);b.onclick=()=>this.choose(key);$('scoreSheet').append(b);}ui.hud(this.round+'/13');
  },
  key(e){if(e.key.toLowerCase()==='r'||(e.code==='Space'&&(!(e.target instanceof HTMLButtonElement)||e.target.id==='rollBtn'))){e.preventDefault();this.roll();}if(/^[1-5]$/.test(e.key)){e.preventDefault();this.hold(Number(e.key)-1);}}
};
$('rollBtn').onclick=()=>game.roll();
`
};
