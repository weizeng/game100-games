// Subject-led palettes. Every game is listed explicitly so new games cannot silently inherit a skin.
const groups = {
  wood: 'bagua checkers connectfour gomoku hanoi klotski ludo peg reversi touhu xiangqi tangram',
  paper: 'alienlang battleship bento dotsboxes flow lightsout mastermind math24 maze minesweeper nonogram onestroke pipes puzzle15 rotatemaze sokoban spotthediff sudoku takuzu unblock wordle wordsearch',
  garden: 'bigfish dig digdug duckhunt farm fishing frogger golf lumber snake whackamole',
  candy: 'balloon bubble catch claw collapse colorlines cutrope doodle draw floodit fruitmerge game2048 jewel link memory pop simon slice slot sortcandy zuma',
  ice: 'frost icebridge icecurl iceslide ski sleigh snowball snowbros snowflake snowman snowplow yeti',
  sky: 'ballroll bowling dino flappy hoop jump paperfly penalty pyramid shuttle stack waiter',
  space: 'asteroid aurora debrisweep docking invaders jetpack lunarlander missile mooncrawl moonphase orbit plane rocket shieldguard spacelevator starmail',
  kitchen: 'grill hotpot noodle pizzacut riddle teahouse yahtzee',
  arcade: 'airhockey archery billiards bomber bomberman breakout cannon catapult cityskyline columns copter darts deepdive donkeykong firework laser ninja pacman piano pinball plumpile pong racing rhythm slingshot solitaire swordlane swordparry tank tetris towerdef tugwar volcano',
};
const palettes = {
  wood: ['#eee1c7','#fff7e7','#e5d1ab','#302d23','#70654d','#3f5b43','#ffffff','#bea77a','#654e31'],
  paper: ['#e7edf4','#ffffff','#dce5ef','#243952','#5b6d83','#275e9b','#ffffff','#bacbdd','#172d48'],
  garden: ['#dcece5','#f5fff9','#c8dfd2','#203f35','#4d7263','#28654e','#ffffff','#a1c5b4','#102f2b'],
  candy: ['#f5e4eb','#fff8fc','#edd5e2','#4e2e49','#806079','#a33d70','#ffffff','#d9b4ca','#33223d'],
  ice: ['#daedf5','#f7fdff','#c3dfe9','#214453','#527685','#236681','#ffffff','#9fc8d9','#122e44'],
  sky: ['#e2eafb','#ffffff','#cedbf2','#293f67','#5c7296','#3a62ad','#ffffff','#b1c5e5','#1c304e'],
  space: ['#10182f','#1a2742','#243754','#eff7ff','#adc3da','#8dded6','#102b36','#38506b','#111e36'],
  kitchen: ['#f2dfd5','#fff6ed','#e9caba','#542f29','#8b5d50','#a64a32','#ffffff','#cfa693','#452b26'],
  arcade: ['#172638','#22374c','#2e4760','#f0f6fc','#b1c6d9','#f0bc74','#342717','#45637c','#142438'],
};
const catalog = {};
for (const [theme, names] of Object.entries(groups)) for (const id of names.split(' ')) {
  if (catalog[id]) throw new Error(`Duplicate theme: ${id}`);
  catalog[id] = { theme, palette: palettes[theme] };
}
module.exports = catalog;
