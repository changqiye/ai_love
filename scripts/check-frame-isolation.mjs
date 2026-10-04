import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile('src/generated/assets.json','utf8'));
let failures=0;
for(const [id,c] of Object.entries(manifest.characters)) {
  const {data,info}=await sharp(`public/assets/characters/${id}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const labels=new Int32Array(info.width*info.height),queue=new Int32Array(labels.length),components=[];
  let nextLabel=0;
  for(let p=0;p<labels.length;p++) {
    if(labels[p]||data[p*4+3]<100)continue;
    const label=++nextLabel;let head=0,tail=1;queue[0]=p;labels[p]=label;
    while(head<tail){const q=queue[head++],x=q%info.width,y=Math.floor(q/info.width);
      for(const n of [x>0?q-1:-1,x<info.width-1?q+1:-1,y>0?q-info.width:-1,y<info.height-1?q+info.width:-1])if(n>=0&&!labels[n]&&data[n*4+3]>=100){labels[n]=label;queue[tail++]=n;}
    }
    if(tail>4000)components.push(label);
  }
  const bodies=new Set(components);
  c.frames.forEach((f,i)=>{
    const counts=new Map();
    for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++){const p=y*info.width+x,l=labels[p];if(bodies.has(l))counts.set(l,(counts.get(l)||0)+1);}
    const portions=[...counts.values()].sort((a,b)=>b-a),foreign=portions.slice(1).reduce((a,b)=>a+b,0);
    if(foreign){console.error(`${id} frame ${i}: ${foreign} pixels belong to neighboring figures`);failures++;}
  });
  console.log(`${id}: ${components.length} connected figures, ${c.frames.length} rectangular frames inspected`);
}
if(failures)process.exitCode=1;
else console.log('All 48 frames contain only their own character.');
