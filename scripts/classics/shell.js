const $ = id => document.getElementById(id);
const expert = GameUI.expert;
const ui = {
  running:false, paused:false, score:0, best:0, sound:true, audio:null,
  init() {
    try { this.best = Number(GameUI.storageGet('classic-best-'+GAME_ID)) || 0; this.sound = GameUI.storageGet('g100_sound') !== '0'; } catch (_) {}
    this.hud();
    $('soundBtn').textContent = this.sound ? '♪' : '♩';
    $('soundBtn').setAttribute('aria-pressed',String(this.sound));
    $('startBtn').onclick = $('againBtn').onclick = $('restartBtn').onclick = () => this.start();
    $('pauseBtn').onclick = () => this.pause(true);
    $('resumeBtn').onclick = () => this.pause(false);
    $('menuBtn').onclick = () => { this.running=false; this.hideScreens(); $('startScreen').classList.remove('hidden'); $('pauseBtn').disabled=true; };
    $('soundBtn').onclick = () => { this.sound=!this.sound; $('soundBtn').textContent=this.sound?'♪':'♩'; $('soundBtn').setAttribute('aria-pressed',String(this.sound)); try { GameUI.storageSet('g100_sound',this.sound?'1':'0'); } catch (_) {} this.tone(); };
    document.addEventListener('visibilitychange', () => { if(document.hidden && this.running && !this.paused) this.pause(true); });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.running) { e.preventDefault(); this.pause(!this.paused); return; }
      if (this.running && !this.paused && game.key) game.key(e);
    });
    game.preview?.();
  },
  hideScreens() { document.querySelectorAll('.overlay').forEach(el=>el.classList.add('hidden')); },
  start() { this.hideScreens(); this.running=true; this.paused=false; this.score=0; $('pauseBtn').disabled=false; this.hud(); this.tone(); game.start(); },
  pause(on) { if(!this.running || game.locked) return; this.paused=on; $('pauseScreen').classList.toggle('hidden',!on); if(!on) this.tone(); game.cancelHold?.(); },
  hud(extra) { $('scoreV').textContent=this.score; $('bestV').textContent=this.best; if(extra!==undefined) $('extraV').textContent=extra; },
  say(text) { $('status').textContent=text; },
  add(points) { this.score+=points; this.hud(); $('scoreV').classList.remove('result-flash'); requestAnimationFrame(()=>$('scoreV').classList.add('result-flash')); },
  save() { if(this.score>this.best) { this.best=this.score; try { GameUI.storageSet('classic-best-'+GAME_ID,String(this.best)); } catch (_) {} this.hud(); } },
  finish(title, text) { if(!this.running) return; this.running=false; this.paused=false; this.save(); $('pauseBtn').disabled=true; this.hideScreens(); $('endTitle').textContent=title; $('endText').textContent=text+' · 本局 '+this.score+' 分'; $('endScreen').classList.remove('hidden'); game.cancelHold?.(); this.tone(520); },
  active() { return this.running && !this.paused; },
  tone(frequency=360) { if(!this.sound) return; try { if(!this.audio) this.audio=new (window.AudioContext||window.webkitAudioContext)(); this.audio.resume().catch(()=>{}); const o=this.audio.createOscillator(),g=this.audio.createGain(); o.type='sine'; o.frequency.value=frequency; g.gain.setValueAtTime(.035,this.audio.currentTime); g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.08); o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+.09); } catch (_) {} }
};
