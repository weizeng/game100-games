(function () {
  var canvas = document.getElementById('game');
  var platform = PreviewPlatform.createPreviewPlatform(canvas, { fixedSize: false });
  var app = LogicApp.createApp(platform);
  window.__logicPreview = { app: app, platform: platform };
})();
