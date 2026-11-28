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
  if (config.archetype) root.dataset.archetype = config.archetype;
  root.dataset.game = config.id;
  root.dataset.mode = mode;
  if (config.skin) root.dataset.skin = config.skin;
  var gesture = new WeakMap();
  var wantLevels = false;
  function isVis(el) {
    if (!el || el.hidden || el.classList.contains('hidden')) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
  }
  function cleanCopy(scope) {
    // Strip internal changelog / AI batch version strings from player-facing descriptions.
    scope.querySelectorAll('p,.howto,.sub,.rule').forEach(function (p) {
      if (p.classList.contains('ui-mode-note')) return;
      if (p.id === 'bestLine' && /首次游玩会有简短教程/.test(p.textContent)) { p.textContent = ''; p.style.display = 'none'; return; }
      var html = p.innerHTML;
      if (!/v\d+\s*[（(]|Gemini|批量优化/.test(html)) return;
      var cleaned = html
        .replace(/(?:<br\s*\/?>\s*)*<(?:small|b|span)[^>]*>\s*v\d+\s*[（(][^）)]*[）)][^<]*<\/(?:small|b|span)>(?:\s*<br\s*\/?>)*/gi, '<br>')
        .replace(/(?:<br\s*\/?>\s*)*v\d+\s*[（(][^）)]*[）)][。.\s]*(?:<br\s*\/?>)*/gi, '<br>')
        .replace(/^(?:\s*<br\s*\/?>)+|(?:\s*<br\s*\/?>)+$/gi, '')
        .replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br>');
      if (cleaned !== html) p.innerHTML = cleaned;
    });
  }
  function showPlayTip(text) {
    if (!text) return;
    var el = document.getElementById('ui-play-tip');
    if (!el) { el = document.createElement('div'); el.id = 'ui-play-tip'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = text;
    el.hidden = false;
    clearTimeout(showPlayTip.t);
    var hide = function () { el.hidden = true; };
    showPlayTip.t = setTimeout(hide, 2800);
    document.addEventListener('pointerdown', hide, { once: true, capture: true });
  }
  function labelButtons(scope) {
    scope.querySelectorAll('button').forEach(function (button) {
      if (button.getAttribute('aria-label')) return;
      var id = button.id.toLowerCase(), text = button.textContent.trim();
      var name = /mute|sound|snd/.test(id) ? '切换音效' : /pause/.test(id) ? '暂停游戏' : /hint/.test(id) && !/close|ok/.test(id) ? '查看提示' : '';
      if (!name && /^[⏸🔊🔇💡Ⅱ]+$/u.test(text)) name = { '⏸': '暂停游戏', '🔊': '切换音效', '🔇': '切换音效', '💡': '查看提示' }[text];
      if (name) button.setAttribute('aria-label', name);
    });
  }
  function wireInstantPlay(panel, primary) {
    if (!primary || primary.dataset.uiInstant || !document.getElementById('lvlScr')) return;
    primary.dataset.uiInstant = '1';
    // Provide direct access to level select & upgrades without forcing it on every tap of Start.
    if (!panel.querySelector('.ui-quick-lvl')) {
      var lvlBtn = document.createElement('button');
      lvlBtn.type = 'button';
      lvlBtn.className = 'ghost ui-quick-lvl';
      lvlBtn.textContent = '关卡与升级';
      lvlBtn.addEventListener('click', function () {
        wantLevels = true;
        primary.click();
        setTimeout(function () {
          var skip = document.getElementById('tutSkip');
          if (isVis(document.getElementById('tutScr')) && isVis(skip)) skip.click();
          wantLevels = false;
        }, 0);
      });
      primary.insertAdjacentElement('afterend', lvlBtn);
    }
    primary.addEventListener('click', function () {
      if (wantLevels) return;
      // After the game's own start listener runs, skip blocking tutorial & level-select walls on Play.
      setTimeout(function () {
        var tipText = '';
        var tutScr = document.getElementById('tutScr');
        var tutSkip = document.getElementById('tutSkip');
        if (isVis(tutScr) && isVis(tutSkip)) {
          var tp = document.getElementById('tutP');
          if (tp && tp.textContent.trim()) tipText = tp.textContent.trim();
          tutSkip.click();
        }
        var lvlScr = document.getElementById('lvlScr');
        if (isVis(lvlScr)) {
          var unlocked = Array.prototype.slice.call(lvlScr.querySelectorAll('button.lvl:not(:disabled):not(.locked)')).filter(isVis);
          if (unlocked.length) {
            // Jump straight into the latest unlocked level (level 1 for new players).
            unlocked[unlocked.length - 1].click();
            setTimeout(function () {
              if (isVis(tutScr) && isVis(tutSkip)) {
                var tp2 = document.getElementById('tutP');
                if (!tipText && tp2 && tp2.textContent.trim()) tipText = tp2.textContent.trim();
                tutSkip.click();
              }
              if (!tipText) {
                var h = document.querySelector('.hint,#hint');
                if (h && h.textContent.trim()) tipText = h.textContent.trim();
              }
              if (tipText) showPlayTip(tipText.slice(0, 42));
              window.dispatchEvent(new Event('resize'));
            }, 0);
          }
        }
      }, 0);
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
      if (config.category && !panel.querySelector('.ui-cat-tag')) {
        var catTag = document.createElement('span');
        catTag.className = 'ui-cat-tag';
        catTag.textContent = config.category;
        emblem.insertAdjacentElement('afterend', catTag);
      }
      heading.textContent = config.name;
      cleanCopy(panel);
      var primary = panel.querySelector('#startBtn,#btnStart,.startbtn,button');
      wireInstantPlay(panel, primary);
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
      var anchor = primary;
      while (anchor && anchor.parentNode !== panel && !anchor.parentNode.matches('.card,.panel,.pausecard,.ovcard')) anchor = anchor.parentNode;
      var target = anchor ? anchor.parentNode : panel;
      target.insertBefore(switcher, anchor || null);
      if (expert) {
        var note = document.createElement('p'); note.className = 'ui-mode-note';
        note.textContent = config.challenge + ' · 进阶纪录独立保存';
        target.insertBefore(note, anchor || null);
      }
    }
    labelButtons(panel);
  }
  function notify(text) {
    var el = document.getElementById('ui-assist-toast');
    if (!el) { el = document.createElement('div'); el.id = 'ui-assist-toast'; el.className = 'ui-mode-status'; el.setAttribute('role', 'status'); el.style.cssText = 'position:fixed;bottom:18px;left:16px;right:16px;z-index:200;padding:12px 16px'; document.body.appendChild(el); }
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
      new MutationObserver(function () { decorate(container); cleanCopy(container); }).observe(container, { childList: true });
    });
    cleanCopy(document);
    labelButtons(document);
    if (config.skin) watchScores();
    // 玩家首次触摸画布后柔和隐藏底部纯文字提示，释放竖屏视野（不影响任何交互按钮）
    var cv = document.querySelector('body>.wrap canvas:not(#fx)');
    if (cv) {
      cv.addEventListener('pointerdown', function () {
        document.querySelectorAll('body>.wrap>.hint,body>.wrap>.hintline').forEach(function (h) {
          if (!h.querySelector('button,input,select,a')) h.classList.add('ui-hint-quiet');
        });
      }, { once: true, passive: true });
    }
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 0);
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
