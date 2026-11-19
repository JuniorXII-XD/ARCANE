import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=readdirSync(root).filter(f=>f.endsWith('-test.mjs')||f==='test.mjs').sort();
let failed=0;for(const file of files){if(spawnSync(process.execPath,[file],{cwd:root,stdio:'inherit'}).status!==0)failed++;}
console.log(`${files.length-failed}/${files.length} suites passed`);process.exitCode=failed?1:0;
