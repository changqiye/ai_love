import sharp from 'sharp';
import {readFile,writeFile,stat} from 'node:fs/promises';

const people=JSON.parse(await readFile('docs/CG_CHARACTERS.json','utf8'));
const plan=JSON.parse(await readFile('docs/CG_ANIMATION_PLAN.json','utf8'));
const audit=process.argv.includes('--audit'),errors=[];
const partial=process.argv.includes('--partial')||audit;
const manifest={characters:{},transfer:{sourceBytes:0,runtimeBytes:0},frameCount:0};

async function inspect(file,count,cols){
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const labels=new Int32Array(info.width*info.height),queue=new Int32Array(labels.length),components=[];
  let label=0,clear=0;
  for(let p=0;p<labels.length;p++){
    if(data[p*4+3]===0)clear++;
    if(labels[p]||data[p*4+3]<100)continue;
    const key=++label;let head=0,tail=1,x0=info.width,y0=info.height,x1=0,y1=0;queue[0]=p;labels[p]=key;
    while(head<tail){const q=queue[head++],x=q%info.width,y=Math.floor(q/info.width);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
      for(const n of [x>0?q-1:-1,x<info.width-1?q+1:-1,y>0?q-info.width:-1,y<info.height-1?q+info.width:-1])if(n>=0&&!labels[n]&&data[n*4+3]>=100){labels[n]=key;queue[tail++]=n;}
    }
    if(tail>3000)components.push({key,x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,area:tail});
  }
  if(components.length!==count)throw new Error(`${file}: expected ${count} figures, found ${components.length}`);
  if(clear/labels.length<.15)throw new Error(`${file}: background is not sufficiently transparent`);
  const bodies=new Set(components.map(c=>c.key));
  components.sort((a,b)=>a.y-b.y);const ordered=[];
  for(let r=0;r<count/cols;r++)ordered.push(...components.slice(r*cols,(r+1)*cols).sort((a,b)=>a.x-b.x));
  const frames=ordered.map((c,i)=>{
    const x=c.x,y=c.y,w=c.w,h=c.h;
    let foreign=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const l=labels[yy*info.width+xx];if(bodies.has(l)&&l!==c.key)foreign++;}
    if(foreign)throw new Error(`${file} frame ${i}: ${foreign} neighboring figure pixels; regenerate layout`);
    if(c.x===0||c.y===0||c.x+c.w===info.width||c.y+c.h===info.height)throw new Error(`${file} frame ${i}: figure clipped at image edge`);
    return {x,y,w,h,bounds:{x:0,y:0,w,h},foot:h-1};
  });
  return {width:info.width,height:info.height,transparentRatio:+(clear/labels.length).toFixed(3),frames};
}
async function encode(source,record){
  const destination=source.replace(/\.png$/,'.webp');
  await sharp(source).webp({lossless:true,effort:6}).toFile(destination);
  const originalAlpha=await sharp(source).extractChannel('alpha').raw().toBuffer();
  const packedAlpha=await sharp(destination).extractChannel('alpha').raw().toBuffer();
  if(!originalAlpha.equals(packedAlpha))throw new Error(`Alpha changed: ${source}`);
  manifest.transfer.sourceBytes+=(await stat(source)).size;manifest.transfer.runtimeBytes+=(await stat(destination)).size;
  record.url='/'+destination.replace(/^public\//,'');
}
for(const person of people){
  for(const wardrobe of ['original','low']){
  const suffix=wardrobe==='low'?'/low':'';
  const base=`public/assets/cg/${person.id}${suffix}`;
  const master=await inspect(`${base}/master.png`,1,1);await encode(`${base}/master.png`,master);
  // A small mechanical crop avoids loading six full-size portraits for avatar controls.
  const b=master.frames[0],size=Math.min(b.w,Math.round(b.h*.31)),left=Math.max(0,Math.round(b.x+b.w/2-size/2));
  await sharp(`${base}/master.png`).extract({left,top:b.y,width:size,height:size}).resize(256,256).webp({quality:92,alphaQuality:100}).toFile(`${base}/avatar.webp`);
  const entry={master,avatar:`/assets/cg/${person.id}${suffix}/avatar.webp`,sheets:{},actions:{},frameCount:0};
  for(const spec of plan){
    const file=`${base}/${spec.key}.png`;
    try{await stat(file);}catch(error){if(partial&&error.code==='ENOENT')continue;throw error;}
    let sheet;try{sheet=await inspect(file,spec.count,spec.cols);}catch(error){if(!audit)throw error;errors.push(error.message);console.error(error.message);continue;}
    const standIndices=spec.key==='everyday'?[0,1,2,3]:spec.key==='moments'||spec.key==='gestures'?[4,5,6,7]:[0,1,2,3,4,5];
    sheet.referenceHeight=Math.max(...standIndices.map(i=>sheet.frames[i].h));
    await encode(file,sheet);entry.sheets[spec.key]=sheet;
    const danceFps={dance:1000/600,sway:1000/850,groove:1000/500};
    for(const [action,frames] of Object.entries(spec.actions))entry.actions[action]={sheet:spec.key,frames,fps:action==='idle'?1.4:action==='walk'?5.5:danceFps[action]??3.2,loop:action!=='sit'};
    entry.frameCount+=spec.count;manifest.frameCount+=spec.count;
    console.log(`${person.id}/${wardrobe}/${spec.key}: ${sheet.width}×${sheet.height}, ${spec.count} isolated frames, alpha preserved`);
  }
  if(wardrobe==='original')manifest.characters[person.id]=entry;
  else manifest.characters[person.id].variants={low:entry};
  }
}
if(!errors.length){await writeFile('src/generated/cg.json',JSON.stringify(manifest,null,2));await writeFile('docs/CG_ASSET_REPORT.json',JSON.stringify(manifest,null,2));}
else {console.error(JSON.stringify(errors,null,2));process.exitCode=1;}
console.log(`${manifest.frameCount} CG frames; ${(manifest.transfer.runtimeBytes/1048576).toFixed(2)} MiB runtime, originals retained.`);
