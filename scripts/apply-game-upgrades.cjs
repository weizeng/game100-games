// One-time migration for the 2026-10 interface release. UI regeneration is sync-game-ui.cjs.
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('./game-ui/catalog.cjs');
const challenges = require('./game-ui/challenges.cjs');
const root = path.resolve(__dirname, '..');
for (const id of fs.readdirSync(path.join(root, 'games'))) {
  const file = path.join(root, 'games', id, 'index.html');
  let html = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (html.includes('/* GAMEPLAY UPGRADE */')) continue;
  html = html.replace(/<script>([\s\S]*?)<\/script>/, (tag, source) => {
    for (const [before, after] of challenges[id].rules) {
      if (!after || !source.includes(before)) throw new Error(`${id}: missing source anchor ${before}`);
      source = source.split(before).join(after);
    }
    source = source.replaceAll('localStorage.getItem(', 'GameUI.storageGet(').replaceAll('localStorage.setItem(', 'GameUI.storageSet(').replaceAll('localStorage.removeItem(', 'GameUI.storageRemove(');
    // Neutral playfield paint follows the game's palette; semantic object colors stay intact.
    source = source.replace(/(fillStyle\s*=\s*['"])(#121212|#1e1e1e|#16161e)(['"])/gi, `$1${catalog[id].palette[8]}$3`);
    return '<script>\n/* GAMEPLAY UPGRADE */' + source + '</script>';
  });
  fs.writeFileSync(file, html);
  const metaFile = path.join(root, 'games', id, 'meta.json');
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  meta.version += 1; // Installed games must actually be offered the update.
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
}
console.log('Applied gameplay rules and incremented all game package versions.');
