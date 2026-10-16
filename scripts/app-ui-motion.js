// Browser reference for UiMotion and ArcadeBackdropView. No network or App data access.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  function animate(el, frames, options = {}) {
    active.get(el)?.cancel();
    if (reduced.matches || !el) return;
    const animation = el.animate(frames, {duration:380,easing:'cubic-bezier(.2,.8,.2,1)',...options});
    active.set(el,animation);
    const clean = () => { if(active.get(el) === animation) active.delete(el); };
    animation.onfinish = clean;
    animation.oncancel = clean;
    return animation;
  }
  function enter(el, delay = 0) {
    animate(el,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{delay,fill:'backwards'});
  }
  function pop(el, delay = 0) {
    animate(el,[{transform:'scale(.72)'},{transform:'scale(1.18)',offset:.55},{transform:'scale(1)'}],{duration:440,delay,fill:'backwards'});
  }
  const hero = document.getElementById('featured');
  const fx = document.createElement('span');
  fx.className = 'stage-fx';
  fx.setAttribute('aria-hidden','true');
  fx.innerHTML = '<span class="orbit"></span><span class="orbit outer"></span>';
  const shine = document.createElement('span');
  shine.className = 'stage-shine';
  shine.setAttribute('aria-hidden','true');
  hero.prepend(fx);
  hero.append(shine);
  let heroVisible = false;
  function updateStage() { hero.classList.toggle('stage-visible',heroVisible && !document.hidden && !reduced.matches); }
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) { heroVisible = entry.isIntersecting; updateStage(); }
  });
  visibility.observe(hero);
  document.addEventListener('visibilitychange',updateStage);
  reduced.addEventListener('change',() => {
    release(true);
    if (reduced.matches) { for (const animation of active.values()) animation.cancel(); active.clear(); }
    updateStage();
  });

  // Let nested buttons keep their own click and focus behavior; pointer cancellation settles immediately.
  let pressed = null;
  let pressAnimation = null;
  let pointerId = null;
  function release(cancelled = false) {
    if (!pressed) return;
    const el = pressed;
    pressed = null;
    pointerId = null;
    pressAnimation?.cancel();
    pressAnimation = null;
    if (!cancelled) animate(el,[{transform:'scale(.96)'},{transform:'scale(1.025)',offset:.6},{transform:'scale(1)'}],{duration:320});
  }
  document.addEventListener('pointerdown',event => {
    if (!event.isPrimary || event.button !== 0) return;
    release(true);
    pressed = event.target.closest('button,.game-row');
    pointerId = event.pointerId;
    if (pressed && !pressed.disabled) {
      let transform = 'scale(.96)';
      if(pressed === hero) {
        const box = hero.getBoundingClientRect();
        const x = Math.max(-.5,Math.min(.5,(event.clientX-box.x)/box.width-.5));
        const y = Math.max(-.5,Math.min(.5,(event.clientY-box.y)/box.height-.5));
        transform = 'perspective(800px) rotateX('+(-y*8)+'deg) rotateY('+(x*8)+'deg) scale(.97)';
      }
      pressAnimation = animate(pressed,[{transform:'scale(1)'},{transform}],{duration:90,fill:'forwards'});
    }
  });
  document.addEventListener('pointerup',event => { if(event.pointerId === pointerId) release(); });
  document.addEventListener('pointercancel',() => release(true));
  window.addEventListener('blur',() => release(true));
  // Scrolling is never treated as a click, and no pointer capture blocks the scroll surface.
  document.addEventListener('scroll',() => release(true),true);

  const list = document.getElementById('list');
  new MutationObserver(() => {
    for(const [index,row] of [...list.children].slice(0,6).entries()) enter(row,index * 35);
  }).observe(list,{childList:true});
  new MutationObserver(() => {
    enter(document.querySelector('#detail .identity'));
    enter(document.getElementById('detail-desc'),45);
  }).observe(document.getElementById('detail-name'),{childList:true});

  document.addEventListener('click',event => {
    const chip = event.target.closest('#chips button');
    const star = event.composedPath().some(el => el instanceof Element && el.id === 'rating');
    const favoriteClick = event.target.closest('#favorite');
    if(chip) pop(chip);
    // renderRating replaces the clicked node synchronously; animate the new selected stars.
    if(star) document.querySelectorAll('#rating button').forEach((el,index) => {
      if(el.textContent === '★') pop(el,index*45);
    });
    if(favoriteClick && document.getElementById('favorite').getAttribute('aria-pressed') === 'true') {
      const favorite = document.getElementById('favorite');
      pop(favorite);
      if(reduced.matches) return;
      const box = favorite.getBoundingClientRect();
      for(let i=0;i<8;i++) {
        const spark = document.createElement('span');
        spark.className = 'heart-spark';
        spark.setAttribute('aria-hidden','true');
        spark.style.left = box.x+box.width/2-2.5+'px';
        spark.style.top = box.y+box.height/2-2.5+'px';
        document.body.append(spark);
        const angle = i*Math.PI/4;
        const animation = animate(spark,[{opacity:1,transform:'translate(0,0) scale(1)'},{opacity:0,transform:'translate('+Math.cos(angle)*40+'px,'+Math.sin(angle)*40+'px) rotate(90deg) scale(.2)'}],{duration:550});
        const remove = () => { active.delete(spark); spark.remove(); };
        animation.onfinish = remove;
        animation.oncancel = remove;
      }
    }
  });

  function replay() {
    document.querySelectorAll('.phone').forEach((el,index) => enter(el,index*80));
    hero.classList.remove('stage-arrive');
    // A new frame restarts the one-shot highlight without a forced synchronous layout.
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('stage-arrive')));
    for(const [index,row] of [...list.children].slice(0,6).entries()) enter(row.querySelector('.game-icon'),200+index*35);
  }
  const tag = document.querySelector('header .tag');
  const tools = document.createElement('div');
  tools.className = 'preview-tools';
  tag.replaceWith(tools);
  tools.append(tag);
  const replayButton = document.createElement('button');
  replayButton.className = 'motion-replay';
  replayButton.textContent = '↻ 重播入场';
  replayButton.onclick = replay;
  tools.append(replayButton);
  replay();
})();
