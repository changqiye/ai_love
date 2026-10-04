import {readFile,stat,writeFile} from 'node:fs/promises';

const args=process.argv.slice(2),runtimeOnly=args.includes('--runtime-only');
const base=args.find(arg=>!arg.startsWith('--'))??'http://localhost:5173';
const urls=new Set(),originals=new Set();
function collect(value){if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){if((key==='url'||key==='avatar')&&typeof item==='string'&&item.startsWith('/assets/')){urls.add(item);if(key==='url'&&item.endsWith('.webp'))originals.add(item.replace(/\.webp$/,'.png'));}else collect(item);}}
for(const path of ['src/generated/assets.json','src/generated/cg.json','src/generated/motion.json'])collect(JSON.parse(await readFile(path,'utf8')));
if(runtimeOnly)originals.clear();
const checks=[],pending=[...new Set([...urls,...originals])];
await Promise.all(Array.from({length:8},async()=>{while(pending.length){const url=pending.shift();try{const response=await fetch(new URL(url,base),{method:'HEAD',signal:AbortSignal.timeout(10000)});const bytes=(await stat('public'+url)).size,mime=response.headers.get('content-type')??'',servedBytes=Number(response.headers.get('content-length'));checks.push({url,bytes,mime,ok:response.ok&&mime.startsWith('image/')&&servedBytes===bytes});}catch(error){checks.push({url,ok:false,error:error.message});}}}));
const failed=checks.filter(check=>!check.ok),report={checkedAt:new Date().toISOString(),base,assetCount:checks.length,runtimeCount:urls.size,originalCount:originals.size,failedCount:failed.length,checks:checks.sort((a,b)=>a.url.localeCompare(b.url))};
await writeFile('docs/RUNTIME_ASSET_CHECK.json',JSON.stringify(report,null,2));
if(failed.length){console.error(JSON.stringify(failed,null,2));process.exitCode=1;}else console.log(`${urls.size} runtime images and ${originals.size} PNG originals served with correct MIME type and full byte length.`);
