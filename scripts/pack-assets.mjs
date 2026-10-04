import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
const manifest=JSON.parse(await readFile('src/generated/assets.json','utf8'));
let before=0,after=0;
for(const record of [...Object.values(manifest.characters),manifest.layers,...Object.values(manifest.scenes)]){
  const source=`public${record.url.replace(/\.webp$/,'.png')}`,dest=source.replace(/\.png$/,'.webp');
  const isTransparent=Boolean(record.frames);
  await sharp(source).webp(isTransparent?{lossless:true,effort:6}:{quality:88,effort:6}).toFile(dest);
  if(isTransparent){const a=await sharp(source).extractChannel('alpha').raw().toBuffer(),b=await sharp(dest).extractChannel('alpha').raw().toBuffer();if(!a.equals(b))throw new Error('Alpha changed during encoding');}
  before+=(await stat(source)).size;after+=(await stat(dest)).size;
  record.url=record.url.replace(/\.png$/,'.webp');
}
await writeFile('src/generated/assets.json',JSON.stringify(manifest,null,2));
await writeFile('docs/ASSET_REPORT.json',JSON.stringify({...manifest,transfer:{sourceBytes:before,runtimeBytes:after}},null,2));
console.log(`Runtime transfer: ${(before/1048576).toFixed(2)} MiB → ${(after/1048576).toFixed(2)} MiB. Original PNGs and all alpha channels retained.`);
