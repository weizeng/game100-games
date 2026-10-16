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
  window.GameUI = {
    expert: expert,
    pick: function (classic, advanced) { return expert ? advanced : classic; },
    storageGet: function (key) { return localStorage.getItem(storageKey(key)); },
    storageSet: function (key, value) { localStorage.setItem(storageKey(key), value); },
    storageRemove: function (key) { localStorage.removeItem(storageKey(key)); }
  };
  var root = document.documentElement;
  root.classList.add('game-ui');
  root.dataset.theme = config.theme;
  root.dataset.game = config.id;
  root.dataset.mode = mode;
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
    if (container.matches('.screen') && container.querySelector('canvas:not(#fx)')) return;
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
    if (event.type === 'click' && prev && performance.now() - prev.at < 1000) blocked = prev.blocked;
    else { blocked = used[kind] >= limits[kind]; if (!blocked) used[kind]++; gesture.set(b, { at: performance.now(), blocked: blocked }); }
    if (blocked) { event.preventDefault(); event.stopImmediatePropagation(); notify(kind === 'hint' ? '本次挑战的 1 次提示已用完' : '本次挑战的 3 次撤销已用完'); }
  }
  document.addEventListener('pointerdown', assistEvent, true);
  document.addEventListener('click', assistEvent, true);
  document.addEventListener('click', function (event) {
    var b = event.target.closest('button');
    if (b && /^(startBtn|btnStart|restartBtn|againBtn|retryBtn|btnAgain|btnRestart|playAgain)$/i.test(b.id)) used = { hint: 0, undo: 0 };
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    var selector = '.overlay,.ov,#ov,#overlay,#pauseOv,.screen';
    document.querySelectorAll(selector).forEach(function (container) {
      decorate(container);
      // Only dynamic overlay children are observed; animated scores never trigger this work.
      new MutationObserver(function () { decorate(container); }).observe(container, { childList: true });
    });
    labelButtons(document);
  });
}());
