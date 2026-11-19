import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const name of readdirSync(resolve(root,'dist')).filter(f=>/\.(mjs|js)$/.test(f))){const file=resolve(root,'dist',name);if(spawnSync(process.execPath,['--check',file],{stdio:'inherit'}).status!==0)process.exit(1);for(const match of readFileSync(file,'utf8').matchAll(/(?:from\s*|import\s*\()\s*['"](\.\.?\/[^'"]+)['"]/g))if(!existsSync(resolve(dirname(file),match[1])))throw Error(`Missing import ${name}: ${match[1]}`);}
if(!existsSync(resolve(root,'dist/index.html')))throw Error('Missing entry page');console.log('PASS: syntax and relative module imports');
