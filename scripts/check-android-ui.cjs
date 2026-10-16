// Static resource verification only. Does not invoke Gradle, a compiler or an emulator.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { xml2js } = require('xml-js');
const root = path.resolve(__dirname, '../android/app/src/main');
const resources = new Map();
const idsByLayout = new Map();
const xmlFiles = [];
const add = (type, name) => {
  if (!resources.has(type)) resources.set(type, new Set());
  resources.get(type).add(name);
};
function walk(dir) { return fs.readdirSync(dir, { withFileTypes:true }).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
function visit(node, fn) { fn(node); (node.elements || []).forEach(e => visit(e,fn)); }
for (const file of walk(path.join(root,'res')).filter(f => f.endsWith('.xml'))) {
  const source = fs.readFileSync(file,'utf8');
  const tree = xml2js(source); // Reject malformed XML before checking references.
  const folder = path.basename(path.dirname(file)).split('-')[0];
  const name = path.basename(file,'.xml');
  if (folder !== 'values') add(folder,name);
  const ids = new Set();
  visit(tree, node => {
    if (folder === 'values' && node.attributes?.name && ['color','string','style','dimen','bool','integer'].includes(node.name)) add(node.name,node.attributes.name);
    const id = node.attributes?.['android:id'];
    if (id?.startsWith('@+id/')) {
      const value=id.slice(5); assert.ok(!ids.has(value),`Duplicate id ${value} in ${file}`); ids.add(value); add('id',value);
    }
  });
  if (folder === 'layout') idsByLayout.set(name,ids);
  xmlFiles.push({file,source});
}
let referenceCount=0;
for (const {file,source} of xmlFiles) for(const match of source.matchAll(/@(?!android:|null)(color|string|drawable|layout|menu|style|xml)\/([\w.]+)/g)) {
  assert.ok(resources.get(match[1])?.has(match[2]),`Missing @${match[1]}/${match[2]} in ${file}`); referenceCount++;
}
const activities = { MainActivity:['activity_main','dialog_download'], GameDetailActivity:['activity_game_detail'], SettingsActivity:['activity_settings'], GameActivity:['activity_game'] };
for(const [activity,layouts] of Object.entries(activities)) {
  const source=fs.readFileSync(path.join(root,'java/com/game100/center',activity+'.kt'),'utf8');
  const ids=new Set(layouts.flatMap(l=>[...idsByLayout.get(l)]));
  for(const m of source.matchAll(/findViewById(?:<[^>]+>)?\(R\.id\.(\w+)\)/g)) assert.ok(ids.has(m[1]),`${activity} has no view ${m[1]}`);
}
for(const file of walk(path.join(root,'java')).filter(f=>f.endsWith('.kt'))) {
  for(const m of fs.readFileSync(file,'utf8').matchAll(/(?<!android\.)R\.(color|string|drawable|layout|menu|xml|id)\.(\w+)/g)) assert.ok(resources.get(m[1])?.has(m[2]),`Missing R.${m[1]}.${m[2]} in ${file}`);
}
console.log(`Verified ${xmlFiles.length} XML resources, ${referenceCount} XML references and all Kotlin resource/view references. No compilation performed.`);
