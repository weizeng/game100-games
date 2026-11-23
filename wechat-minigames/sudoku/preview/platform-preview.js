/**
 * 本地 Canvas 预览的薄适配器。浏览器能跑通 ≠ 微信真机已验证。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PreviewPlatform = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function memoryStore() {
    var m = {};
    return {
      get: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      set: function (k, v) { m[k] = String(v); },
      raw: m
    };
  }

  function createPreviewPlatform(canvas, opts) {
    opts = opts || {};
    var store = opts.store || memoryStore();
    var width = opts.width || 390;
    var height = opts.height || 844;
    var dpr = opts.pixelRatio || (typeof window !== 'undefined' ? Math.min(2.5, window.devicePixelRatio || 1) : 1);
    var touchFn = null, resizeFn = null, hideFn = null;

    function cssToLogical(clientX, clientY) {
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: width, height: height };
      var w = rect.width || width;
      var h = rect.height || height;
      return {
        x: (clientX - (rect.left || 0)) * (width / w),
        y: (clientY - (rect.top || 0)) * (height / h)
      };
    }

    if (typeof window !== 'undefined' && canvas.addEventListener) {
      canvas.addEventListener('pointerdown', function (e) {
        if (!touchFn) return;
        e.preventDefault();
        var p = cssToLogical(e.clientX, e.clientY);
        touchFn({ x: p.x, y: p.y, id: e.pointerId, type: 'start' });
      });
      window.addEventListener('resize', function () { if (resizeFn) resizeFn(); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && hideFn) hideFn();
      });
    }

    return {
      name: 'preview',
      isWeChat: false,
      getCanvas: function () { return canvas; },
      setCanvasStyle: function (w, h) {
        width = w; height = h;
        if (canvas.style) {
          canvas.style.width = w + 'px';
          canvas.style.height = h + 'px';
        }
      },
      getSystemInfo: function () {
        if (opts.fixedSize) {
          return {
            windowWidth: width,
            windowHeight: height,
            pixelRatio: dpr,
            statusBarHeight: opts.statusBarHeight || 24,
            safeArea: {
              top: opts.safeTop != null ? opts.safeTop : 44,
              bottom: height - (opts.safeBottom != null ? opts.safeBottom : 16),
              left: 0,
              right: width
            }
          };
        }
        var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: width, height: height };
        return {
          windowWidth: rect.width || width,
          windowHeight: rect.height || height,
          pixelRatio: typeof window !== 'undefined' ? Math.min(2.5, window.devicePixelRatio || dpr) : dpr,
          statusBarHeight: 0,
          safeArea: { top: 0, bottom: rect.height || height, left: 0, right: rect.width || width }
        };
      },
      storageGet: function (k) { return store.get(k); },
      storageSet: function (k, v) { store.set(k, v); },
      now: function () {
        if (typeof performance !== 'undefined' && performance.now) return performance.now();
        return Date.now();
      },
      raf: function (cb) {
        if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb);
        return setTimeout(function () { cb(Date.now()); }, 16);
      },
      caf: function (id) {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
        else clearTimeout(id);
      },
      onTouchStart: function (fn) { touchFn = fn; },
      onResize: function (fn) { resizeFn = fn; },
      onHide: function (fn) { hideFn = fn; },
      vibrate: function (ms) {
        try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
      },
      createAudioContext: function () {
        try {
          var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
          return AC ? new AC() : null;
        } catch (e) { return null; }
      },
      cssToLogical: cssToLogical,
      _store: store
    };
  }

  return { createPreviewPlatform: createPreviewPlatform, memoryStore: memoryStore };
});
