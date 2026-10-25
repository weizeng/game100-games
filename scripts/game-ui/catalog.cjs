// Subject-led palettes. Every game is listed explicitly so new games cannot silently inherit a skin.
const groups = {
  wood: 'bagua checkers connectfour gomoku hanoi klotski ludo peg reversi touhu xiangqi tangram marblerun chesslord minetrack horseshoe blockgrid knifehit yarnloop ropetangle dominofall',
  paper: 'alienlang battleship bento dotsboxes flow lightsout mastermind math24 maze minesweeper nonogram onestroke pipes puzzle15 rotatemaze sokoban spotthediff sudoku takuzu unblock wordle wordsearch blackjack metromap watersort screwpop arrowescape seatpref',
  garden: 'bigfish dig digdug duckhunt farm fishing frogger golf lumber snake whackamole islelord gardenguard goldrush cactus catrealm',
  candy: 'balloon bubble catch claw collapse colorlines cutrope doodle draw floodit fruitmerge game2048 jewel link memory pop simon slice slot sortcandy zuma neonmirror landlord colorgate busqueue tenpair',
  ice: 'frost icebridge icecurl iceslide ski sleigh snowball snowbros snowflake snowman snowplow yeti curlingduel',
  sky: 'ballroll bowling dino flappy hoop jump paperfly penalty pyramid shuttle stack waiter hexrealm hillclimb parkexit railtycoon',
  space: 'asteroid aurora debrisweep docking invaders jetpack lunarlander missile mooncrawl moonphase orbit plane rocket shieldguard spacelevator starmail starswarm neodrone starconquest mechbreach gravityflip cryptops',
  kitchen: 'grill hotpot noodle pizzacut riddle teahouse yahtzee doughfly sushigo wokflip recipe weighit faircut piping kittyfeed foodbingo goodssort cookrush',
  // 2026-10-20 皮肤 B 上线时补登记的 80 款（全部为深色画面）
  lab: 'acidbase buoyancy cellstruct chemreact circuit collision combustion crystal densitylab digestion ecobottle electrolysis electromagnet expansion eyevision foodchain freefall friction fruitbattery heartpump heattransfer incline indicator lens lever lungcap magnet metalreact microscopelab mitosis ohm pendulum periodic photosynthesis phtest pressurelab prism projectile pulley punnett reflection refraction resonance rocketlab seriesparallel skeleton solubility spring staticlab wavelab neohack viruslock steamlab saltpan bakelab sandfill',
  ocean: 'ascent inkspray jellyzap lighthouse pearlcatch seacannon seahorse shellswap sonar tideseek neonfish shadowgo',
  magic: 'alchemy broomrace dragonegg dungeonkey hexduel levitate potion shadowmatch spelldraw wandshop fatespire abysscrawl gemhero spinmatrix bagbrawl hexwar spellcraft',
  arcade: 'bubbletea bumpercar colormix cubhop domino parachute pottery shellgame spintop trapeze airhockey archery billiards bomber bomberman breakout cannon catapult cityskyline columns copter darts deepdive donkeykong firework laser ninja pacman piano pinball plumpile pong racing rhythm slingshot solitaire swordlane swordparry tank tetris towerdef tugwar volcano neontd mergelegion beatblade magrail neoncourier neonrunner arrowrogue jokerpoker gunslinger safecrack drawpoker lasso factoryline swarmcmd',
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
  lab: ['#0b1626','#13243a','#1c3350','#eaf6ff','#9fb6cc','#4fc3f7','#05263a','#2b4a6a','#081220'],
  ocean: ['#08202e','#0f3042','#164058','#e8fbff','#9cc4cf','#4fd8e8','#04222c','#24576e','#061824'],
  magic: ['#1a1030','#261a44','#33245a','#f4eeff','#bcaedb','#c79bff','#1f0f3a','#4a3a78','#120a24'],
  arcade: ['#172638','#22374c','#2e4760','#f0f6fc','#b1c6d9','#f0bc74','#342717','#45637c','#142438'],
};
const catalog = {};
for (const [theme, names] of Object.entries(groups)) for (const id of names.split(' ')) {
  if (catalog[id]) throw new Error(`Duplicate theme: ${id}`);
  catalog[id] = { theme, palette: palettes[theme] };
}
module.exports = catalog;
