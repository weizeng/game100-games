(function () {
  var canvas = document.getElementById('game');
  var platform = PreviewPlatform.createPreviewPlatform(canvas, { fixedSize: false });
  var app = SudokuApp.createApp(platform);
  window.__sudokuPreview = { app: app, platform: platform };
})();
