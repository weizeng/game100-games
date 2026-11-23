/**
 * 微信小游戏平台适配。仅在微信运行时加载。
 * 没有 AppID 时不要改这里去伪造认证状态。
 */
function createWxPlatform() {
  if (typeof wx === 'undefined') {
    throw new Error('platform-wx 只能在微信小游戏运行时使用');
  }
  var canvas = wx.createCanvas();
  var touchHandlers = { start: null };
  var resizeHandler = null;
  var hideHandler = null;

  wx.onTouchStart(function (e) {
    if (!touchHandlers.start) return;
    var t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (!t) return;
    touchHandlers.start({ x: t.clientX, y: t.clientY, id: t.identifier, type: 'start' });
  });
  if (wx.onWindowResize) {
    wx.onWindowResize(function () { if (resizeHandler) resizeHandler(); });
  }
  if (wx.onHide) wx.onHide(function () { if (hideHandler) hideHandler(); });

  return {
    name: 'wechat',
    isWeChat: true,
    getCanvas: function () { return canvas; },
    setCanvasStyle: function () {},
    getSystemInfo: function () {
      var info = wx.getSystemInfoSync();
      var sa = info.safeArea || {
        top: info.statusBarHeight || 0,
        bottom: info.windowHeight,
        left: 0,
        right: info.windowWidth
      };
      return {
        windowWidth: info.windowWidth,
        windowHeight: info.windowHeight,
        pixelRatio: info.pixelRatio || 1,
        statusBarHeight: info.statusBarHeight || 0,
        safeArea: sa
      };
    },
    storageGet: function (key) {
      try { return wx.getStorageSync(key); } catch (e) { return null; }
    },
    storageSet: function (key, value) {
      try { wx.setStorageSync(key, value); } catch (e) {}
    },
    now: function () { return Date.now(); },
    raf: function (cb) { return requestAnimationFrame(cb); },
    caf: function (id) { cancelAnimationFrame(id); },
    onTouchStart: function (fn) { touchHandlers.start = fn; },
    onResize: function (fn) { resizeHandler = fn; },
    onHide: function (fn) { hideHandler = fn; },
    vibrate: function (ms) {
      try {
        if (ms && ms > 80 && wx.vibrateLong) wx.vibrateLong();
        else if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
      } catch (e) {}
    },
    createAudioContext: function () {
      if (wx.createWebAudioContext) return wx.createWebAudioContext();
      return null;
    }
  };
}

module.exports = { createWxPlatform: createWxPlatform };
