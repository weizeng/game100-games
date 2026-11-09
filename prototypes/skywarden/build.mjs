import { build } from 'vite';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const result = await build({configFile:false,build:{write:false,lib:{entry:'src/main.js',name:'SkyWarden',formats:['iife']},minify:'esbuild',target:'es2020'}});
const js=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk').code;
const html=fs.readFileSync('index.html','utf8').replace('<script type="module" src="/src/main.js"></script>',()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
const license=fs.readFileSync('THREE-LICENSE.txt','utf8');
fs.writeFileSync('../../games/skywarden/index.html',html.replace('</head>',()=>`<!-- Three.js license\n${license}\n-->\n</head>`));
execFileSync(process.execPath,['scripts/sync-game-ui.cjs','--only=skywarden'],{cwd:'../..',stdio:'inherit'});
console.log('Offline HTML generated.');

