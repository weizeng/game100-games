/**
 * 逻辑谜题关卡数据（数岛搭桥手写已验证关卡 + 围圈数谜原作 18 关）。
 * 全部打进代码包，运行时不下载关卡或脚本。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LogicLevels = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var HASHI_LEVELS = [
    { name: '初识一桥', islands: [{ x: 0, y: 0, n: 1 }, { x: 2, y: 0, n: 1 }], sol: [{ a: 0, b: 1, n: 1 }] },
    { name: '一线三岛', islands: [{ x: 0, y: 0, n: 1 }, { x: 2, y: 0, n: 2 }, { x: 4, y: 0, n: 1 }], sol: [{ a: 0, b: 1, n: 1 }, { a: 1, b: 2, n: 1 }] },
    { name: '纵向相连', islands: [{ x: 0, y: 0, n: 1 }, { x: 0, y: 2, n: 1 }], sol: [{ a: 0, b: 1, n: 1 }] },
    { name: '转弯的桥', islands: [{ x: 0, y: 0, n: 1 }, { x: 2, y: 0, n: 2 }, { x: 2, y: 2, n: 1 }], sol: [{ a: 0, b: 1, n: 1 }, { a: 1, b: 2, n: 1 }] },
    { name: '双桥初学', islands: [{ x: 0, y: 0, n: 2 }, { x: 3, y: 0, n: 2 }], sol: [{ a: 0, b: 1, n: 2 }] },
    { name: '四方环行', boss: true, islands: [{ x: 0, y: 0, n: 2 }, { x: 2, y: 0, n: 2 }, { x: 0, y: 2, n: 2 }, { x: 2, y: 2, n: 2 }], sol: [{ a: 0, b: 1, n: 1 }, { a: 1, b: 3, n: 1 }, { a: 2, b: 3, n: 1 }, { a: 0, b: 2, n: 1 }] },
    { name: '丁字路口', islands: [{ x: 0, y: 0, n: 1 }, { x: 2, y: 0, n: 3 }, { x: 4, y: 0, n: 1 }, { x: 2, y: 2, n: 1 }], sol: [{ a: 0, b: 1, n: 1 }, { a: 1, b: 2, n: 1 }, { a: 1, b: 3, n: 1 }] },
    { name: '十字星岛', islands: [{ x: 2, y: 0, n: 1 }, { x: 0, y: 2, n: 1 }, { x: 2, y: 2, n: 4 }, { x: 4, y: 2, n: 1 }, { x: 2, y: 4, n: 1 }], sol: [{ a: 0, b: 2, n: 1 }, { a: 1, b: 2, n: 1 }, { a: 2, b: 3, n: 1 }, { a: 2, b: 4, n: 1 }] },
    { name: '双桥转角', islands: [{ x: 0, y: 0, n: 2 }, { x: 3, y: 0, n: 3 }, { x: 3, y: 2, n: 1 }], sol: [{ a: 0, b: 1, n: 2 }, { a: 1, b: 2, n: 1 }] },
    { name: '回廊双环', boss: true, islands: [{ x: 0, y: 0, n: 3 }, { x: 3, y: 0, n: 3 }, { x: 0, y: 3, n: 3 }, { x: 3, y: 3, n: 3 }], sol: [{ a: 0, b: 1, n: 2 }, { a: 1, b: 3, n: 1 }, { a: 2, b: 3, n: 2 }, { a: 0, b: 2, n: 1 }] },
    { name: '中岛分流', islands: [{ x: 0, y: 0, n: 2 }, { x: 2, y: 0, n: 3 }, { x: 4, y: 0, n: 2 }, { x: 0, y: 2, n: 2 }, { x: 2, y: 2, n: 3 }, { x: 4, y: 2, n: 2 }], sol: [{ a: 0, b: 1, n: 1 }, { a: 1, b: 2, n: 1 }, { a: 0, b: 3, n: 1 }, { a: 2, b: 5, n: 1 }, { a: 1, b: 4, n: 1 }, { a: 3, b: 4, n: 1 }, { a: 4, b: 5, n: 1 }] },
    { name: '双子并桥', islands: [{ x: 0, y: 0, n: 2 }, { x: 0, y: 2, n: 3 }, { x: 2, y: 2, n: 3 }, { x: 2, y: 0, n: 2 }], sol: [{ a: 0, b: 1, n: 1 }, { a: 0, b: 3, n: 1 }, { a: 1, b: 2, n: 2 }, { a: 2, b: 3, n: 1 }] },
    { name: '错位连岛', islands: [{ x: 0, y: 0, n: 2 }, { x: 3, y: 0, n: 1 }, { x: 0, y: 2, n: 3 }, { x: 3, y: 2, n: 2 }], sol: [{ a: 0, b: 1, n: 1 }, { a: 0, b: 2, n: 1 }, { a: 2, b: 3, n: 2 }] },
    { name: '双侧双桥', islands: [{ x: 0, y: 0, n: 3 }, { x: 3, y: 0, n: 4 }, { x: 3, y: 2, n: 3 }, { x: 0, y: 2, n: 2 }], sol: [{ a: 0, b: 1, n: 2 }, { a: 1, b: 2, n: 2 }, { a: 2, b: 3, n: 1 }, { a: 0, b: 3, n: 1 }] },
    { name: '星岛终章', boss: true, islands: [{ x: 0, y: 0, n: 3 }, { x: 2, y: 0, n: 2 }, { x: 4, y: 0, n: 3 }, { x: 0, y: 2, n: 4 }, { x: 2, y: 2, n: 2 }, { x: 4, y: 2, n: 4 }, { x: 0, y: 4, n: 2 }, { x: 4, y: 4, n: 2 }], sol: [{ a: 0, b: 1, n: 1 }, { a: 1, b: 2, n: 1 }, { a: 0, b: 3, n: 2 }, { a: 2, b: 5, n: 2 }, { a: 3, b: 4, n: 1 }, { a: 4, b: 5, n: 1 }, { a: 3, b: 6, n: 1 }, { a: 5, b: 7, n: 1 }, { a: 6, b: 7, n: 1 }] }
  ];

  var SLITHER_LEVELS = [
    { w: 2, h: 2, clues: [[2, 2], [2, 2]], must: [], boss: false, trap: false, name: '四边合围' },
    { w: 2, h: 2, clues: [[2, null], [3, 2]], must: [], boss: false, trap: false, name: '缺一仍围' },
    { w: 3, h: 3, clues: [[1, 4, 1], [null, 1, null], [0, 0, 0]], must: [], boss: false, trap: false, name: '底边回避' },
    { w: 3, h: 3, clues: [[null, null, 1], [1, 3, 2], [null, 2, 3]], must: [], boss: false, trap: false, name: '斜向暗示' },
    { w: 4, h: 4, clues: [[null, 0, 0, 0], [0, 0, 0, null], [1, 1, 1, 0], [null, null, null, 1]], must: [], boss: true, trap: false, name: '零阵穿行' },
    { w: 4, h: 4, clues: [[null, 0, null, 0], [0, null, 0, 0], [0, 1, null, 0], [1, 3, null, null]], must: [], boss: false, trap: false, name: '零墙绕行' },
    { w: 4, h: 4, clues: [[0, null, 1, 1], [0, 1, 2, null], [null, null, null, null], [0, 0, null, 1]], must: [], boss: false, trap: false, name: '左下禁区' },
    { w: 5, h: 5, clues: [[null, null, 1, null, null], [null, 1, null, 1, 1], [1, null, null, 2, 1], [1, 2, null, 2, 0], [null, 2, 2, 3, 1]], must: [], boss: false, trap: false, name: '五阶初探' },
    { w: 5, h: 5, clues: [[null, 1, null, null, null], [null, 1, 3, 0, 0], [1, 0, null, null, null], [null, null, null, 1, null], [3, 2, 1, 0, 0]], must: [], boss: false, trap: false, name: '右下零块' },
    { w: 5, h: 5, clues: [[null, 0, null, 0, 0], [0, 1, null, null, 1], [null, null, null, 2, null], [0, 3, 2, 3, null], [null, null, 1, null, 3]], must: [], boss: true, trap: false, name: '中坚回路' },
    { w: 6, h: 6, clues: [[0, 1, null, null, 1, 1], [null, null, 1, null, null, 2], [1, null, 0, null, null, 2], [1, 1, null, 0, null, 3], [null, null, null, null, null, 3], [0, null, 1, 1, 1, null]], must: [], boss: false, trap: false, name: '六阶开局' },
    { w: 6, h: 6, clues: [[0, 0, 0, 0, null, 3], [null, null, null, null, null, null], [0, 0, 0, 0, null, null], [null, null, 0, null, null, null], [0, 0, 0, 1, null, 2], [null, 0, 1, 3, null, null]], must: [], boss: false, trap: false, name: '零带夹击' },
    { w: 6, h: 6, clues: [[null, null, null, 1, null, null], [null, 1, 2, null, null, 1], [1, null, null, 2, 1, null], [1, 0, 1, null, 1, null], [2, null, 1, 3, 1, null], [null, null, 1, 2, null, null]], must: [[5, 0]], boss: false, trap: false, name: '必经底角' },
    { w: 6, h: 6, clues: [[0, 0, 0, null, 0, null], [0, 0, 0, null, 2, null], [null, null, null, null, null, null], [0, 0, 1, 2, null, null], [0, null, null, null, null, null], [0, 0, 0, null, null, null]], must: [[3, 5]], boss: false, trap: false, name: '右中必穿' },
    { w: 6, h: 6, clues: [[null, null, null, 0, 0, 0], [0, 0, 0, 0, 0, null], [null, null, null, null, null, 3], [0, 0, null, 3, null, null], [null, 0, 0, null, null, null], [0, null, 0, null, 0, 0]], must: [[3, 5]], boss: true, trap: true, name: '双回路陷阱' },
    { w: 6, h: 6, clues: [[null, 0, null, 3, null, 0], [0, 0, null, 2, null, 0], [0, 0, null, null, null, null], [0, null, null, null, 1, 0], [null, 2, 1, null, null, null], [null, null, 1, null, null, null]], must: [[3, 2], [0, 3]], boss: false, trap: true, name: '两处必经' },
    { w: 7, h: 6, clues: [[null, null, 0, null, 3, null, 0], [0, 0, 0, null, null, null, null], [null, 0, 0, null, null, 0, 3], [0, 0, null, 0, null, null, null], [null, 0, 0, null, null, null, null], [0, null, null, null, null, null, 3]], must: [[4, 5], [3, 6]], boss: false, trap: true, name: '宽盘绕行' },
    { w: 7, h: 7, clues: [[null, null, 1, 1, null, 0, 0], [null, null, null, null, null, 0, 0], [null, null, null, null, null, 0, null], [null, null, null, null, 0, null, 0], [null, 1, null, null, null, 1, null], [null, 0, null, 0, null, 1, null], [2, 2, null, 1, 1, null, null]], must: [[6, 0], [2, 3]], boss: false, trap: true, name: '终局大盘' }
  ];

  return {
    HASHI_LEVELS: HASHI_LEVELS,
    SLITHER_LEVELS: SLITHER_LEVELS
  };
});
