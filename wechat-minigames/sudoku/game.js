/**
 * 微信小游戏入口。把这整个目录导入微信开发者工具即可。
 * 未填写真实 AppID 前，只能在开发者工具游客模式或本地预览里看效果。
 * touristappid 只是占位，不要把它当成已认证的真机项目。
 */
var appApi = require('./src/app.js');
var wxPlat = require('./src/platform-wx.js');

var platform = wxPlat.createWxPlatform();
var app = appApi.createApp(platform);

module.exports = { app: app };
