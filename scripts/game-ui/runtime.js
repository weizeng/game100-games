// Installed before the original game script; embedded so downloaded ZIPs remain offline capable.
(function () {
  'use strict';
  var config = __GAME_UI_CONFIG__;
  var mode = 'classic';
  try { mode = sessionStorage.getItem('game100-mode-' + config.id) || mode; } catch (_) {}
  var expert = mode === 'expert';
  var used = { hint: 0, undo: 0 };
  var limits = { hint: 1, undo: 3 };
  function storageKey(key) { return expert && !/sound|mute/i.test(key) ? 'expert:' + key : key; }
  var sessionRecords = Object.create(null);
  window.GameUI = {
    expert: expert,
    pick: function (classic, advanced) { return expert ? advanced : classic; },
    storageGet: function (key) {
      key = storageKey(key);
      if (Object.prototype.hasOwnProperty.call(sessionRecords, key)) return sessionRecords[key];
      try { return localStorage.getItem(key); } catch (_) { return null; }
    },
    storageSet: function (key, value) {
      key = storageKey(key); value = String(value); sessionRecords[key] = value;
      try { localStorage.setItem(key, value); } catch (_) {}
    },
    storageRemove: function (key) {
      key = storageKey(key); sessionRecords[key] = null;
      try { localStorage.removeItem(key); } catch (_) {}
    },
    // Opt in only in games without their own visibility handler. Reuse their pause
    // action so physics, timers and overlays enter the same state as a manual pause.
    autoPause: function (eventType) {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) return;
        var button = document.querySelector('#pauseBtn,#btnPause,#bPause,#pause-btn,#btn-pause,#btn_pause,#pz');
        if (!button || button.disabled || /▶|继续|恢复/.test(button.textContent)) return;
        var r = button.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        // Menus, quizzes and an existing pause sheet must never be toggled away.
        if (hit !== button && !button.contains(hit)) return;
        if (eventType === 'pointerdown') button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
        else button.click();
      });
    }
  };
  var root = document.documentElement;
  root.classList.add('game-ui');
  root.dataset.theme = config.theme;
  root.dataset.game = config.id;
  root.dataset.mode = mode;
  if (config.skin) root.dataset.skin = config.skin;
  var gesture = new WeakMap();
  function labelButtons(scope) {
    scope.querySelectorAll('button').forEach(function (button) {
      if (button.getAttribute('aria-label')) return;
      var id = button.id.toLowerCase(), text = button.textContent.trim();
      var name = /mute|sound|snd/.test(id) ? '切换音效' : /pause/.test(id) ? '暂停游戏' : /hint/.test(id) && !/close|ok/.test(id) ? '查看提示' : '';
      if (!name && /^[⏸🔊🔇💡Ⅱ]+$/u.test(text)) name = { '⏸': '暂停游戏', '🔊': '切换音效', '🔇': '切换音效', '💡': '查看提示' }[text];
      if (name) button.setAttribute('aria-label', name);
    });
  }
  function decorate(container) {
    if (container.querySelector(':scope > .ui-panel') || !container.querySelector('h1,h2,.gamename')) return;
    // A .screen that holds the playfield (canvas, or its own top bar/HUD) is the game itself, not a menu panel.
    if (container.matches('.screen') && container.querySelector('canvas:not(#fx),.topbar,#topbar,#hud')) return;
    var panel = document.createElement('div');
    panel.className = 'ui-panel';
    while (container.firstChild) panel.appendChild(container.firstChild);
    container.appendChild(panel);
    var heading = panel.querySelector('h1,h2,.gamename');
    var start = /start|menu|ready/i.test(container.id) || !!panel.querySelector('#startBtn,#btnStart,.startbtn');
    if (start) {
      var headings = panel.querySelectorAll('h1,h2,.gamename');
      if (headings.length > 1 && !/[A-Za-z0-9\u4e00-\u9fff]/.test(heading.textContent)) { heading.remove(); heading = headings[1]; }
      var oldIcon = panel.querySelector('.bigemoji,.ic');
      if (oldIcon) oldIcon.remove();
      var emblem = document.createElement('div');
      emblem.className = 'ui-emblem'; emblem.textContent = config.icon; emblem.setAttribute('aria-hidden', 'true');
      panel.insertBefore(emblem, panel.firstChild);
      heading.textContent = config.name;
      if (!config.challenge) { labelButtons(panel); return; }
      var switcher = document.createElement('div'); switcher.className = 'ui-mode'; switcher.setAttribute('role', 'group'); switcher.setAttribute('aria-label', '选择玩法模式');
      [['classic','经典模式'],['expert','进阶挑战']].forEach(function (item) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = item[1]; b.dataset.mode = item[0]; b.setAttribute('aria-pressed', String(mode === item[0]));
        b.addEventListener('click', function () {
          if (mode === item[0]) return;
          try { sessionStorage.setItem('game100-mode-' + config.id, item[0]); location.reload(); }
          catch (_) { b.textContent = '浏览器未允许保存模式'; }
        });
        switcher.appendChild(b);
      });
      var primary = panel.querySelector('#startBtn,#btnStart,.startbtn,button');
      var anchor = primary;
      while (anchor && anchor.parentNode !== panel && !anchor.parentNode.matches('.card,.panel,.pausecard,.ovcard')) anchor = anchor.parentNode;
      var target = anchor ? anchor.parentNode : panel;
      target.insertBefore(switcher, anchor || null);
      var note = document.createElement('p'); note.className = 'ui-mode-note';
      note.textContent = expert ? config.challenge + '。进阶纪录单独保存。' : '按原规则轻松开局，也可切换进阶挑战。';
      target.insertBefore(note, anchor || null);
    }
    labelButtons(panel);
  }
  function notify(text) {
    var el = document.getElementById('ui-assist-toast');
    if (!el) { el = document.createElement('div'); el.id = 'ui-assist-toast'; el.className = 'ui-mode-status'; el.setAttribute('role', 'status'); el.style.cssText = 'position:fixed;bottom:18px;left:16px;right:16px;z-index:200;padding:14px'; document.body.appendChild(el); }
    el.textContent = text; el.hidden = false;
    clearTimeout(notify.timer); notify.timer = setTimeout(function () { el.hidden = true; }, 2000);
  }
  function assistEvent(event) {
    if (!expert) return;
    var b = event.target.closest('button'); if (!b || b.closest('.ui-mode')) return;
    var kind = /^(hintBtn|hintTopBtn|btnHint)$/i.test(b.id) ? 'hint' : /^(undoBtn|undoTopBtn|btnUndo)$/i.test(b.id) || /悔一步|撤销/.test(b.textContent) ? 'undo' : '';
    if (!kind) return;
    var prev = gesture.get(b), blocked;
    if (event.type === 'click' && event.detail > 0 && prev && performance.now() - prev.at < 1000) {
      blocked = prev.blocked; gesture.delete(b);
    } else {
      blocked = used[kind] >= limits[kind]; if (!blocked) used[kind]++;
      if (event.type === 'pointerdown') gesture.set(b, { at: performance.now(), blocked: blocked });
    }
    if (blocked) { event.preventDefault(); event.stopImmediatePropagation(); notify(kind === 'hint' ? '本次挑战的 1 次提示已用完' : '本次挑战的 3 次撤销已用完'); }
  }
  document.addEventListener('pointerdown', assistEvent, true);
  document.addEventListener('click', assistEvent, true);
  function resetAssist(event) {
    var b = event.target.closest('button');
    if (b && /^(startBtn|btnStart|restartBtn|againBtn|retryBtn|btnAgain|btnRestart|playAgain)$/i.test(b.id)) {
      used = { hint: 0, undo: 0 }; gesture = new WeakMap();
    }
  }
  document.addEventListener('pointerdown', resetAssist, true);
  document.addEventListener('click', resetAssist, true);
  document.addEventListener('DOMContentLoaded', function () {
    var selector = '.overlay,.ov,#ov,#overlay,#pauseOv,.screen';
    document.querySelectorAll(selector).forEach(function (container) {
      decorate(container);
      // Only dynamic overlay children are observed; animated scores never trigger this work.
      new MutationObserver(function () { decorate(container); }).observe(container, { childList: true });
    });
    labelButtons(document);
    if (config.skin) watchScores();
  });
  // Score pop: only discrete jumps animate. Counters that tick every frame (distance, timers)
  // change faster than the 300ms gate and therefore never trigger, so there is no per-frame cost.
  function watchScores() {
    document.querySelectorAll('#score,.topbar b,#hud b,.hud .score,.pill b,.hudbox b').forEach(function (el) {
      var last = 0;
      new MutationObserver(function () {
        var now = performance.now(), quiet = now - last > 300; last = now;
        if (!quiet) return;
        el.classList.remove('ui-pop'); void el.offsetWidth; el.classList.add('ui-pop');
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }
}());
