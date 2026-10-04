import {readFile,readdir,lstat,unlink} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';

// The public release uses the existing lossless WebP assets. The artbook
// exports full-size transparent PNGs in the browser; source PNGs stay in Git.
const hosting=JSON.parse(await readFile('.openai/hosting.json','utf8').catch(()=>'{"static":null}'));
if(!hosting.static)process.exit(0);
const root=resolve('dist/assets');let removedBytes=0,count=0;
async function visit(directory){
  const position=relative(root,directory);
  if(position==='..'||position.startsWith('..'+sep)||resolve(root,position)!==directory)throw new Error('Asset path escaped build output');
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const file=resolve(directory,entry.name);
    if(entry.isSymbolicLink())throw new Error('Build assets must not contain symlinks');
    if(entry.isDirectory())await visit(file);
    else if(entry.isFile()&&entry.name.endsWith('.png')){removedBytes+=(await lstat(file)).size;await unlink(file);count++;}
  }
}
await visit(root);
console.log(`Static release: ${count} source PNGs omitted (${(removedBytes/1048576).toFixed(2)} MiB); all runtime images and PNG export retained.`);
