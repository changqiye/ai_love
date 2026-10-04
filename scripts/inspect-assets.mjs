import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const manifest = { characters: {}, layers: {}, scenes: {} };
for (const id of ['xiaoman','zhiyao','yuqing','foreground']) {
  const url = id === 'foreground' ? '/assets/layers/foreground.png' : `/assets/characters/${id}.png`;
  const { data, info } = await sharp(`public${url}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const n=id==='foreground'?2:4, frames=[]; let transparent=0, opaque=0, neonOpaque=0;
  for(let p=0;p<data.length;p+=4){if(data[p+3]===0)transparent++;if(data[p+3]>240)opaque++;if(data[p]>245&&data[p+1]<10&&data[p+2]<10&&data[p+3]>128)neonOpaque++;}
  for(let row=0;row<n;row++)for(let col=0;col<n;col++){
    const x=Math.round(col*info.width/n),y=Math.round(row*info.height/n),w=Math.round((col+1)*info.width/n)-x,h=Math.round((row+1)*info.height/n)-y;
    let minX=w,maxX=0,minY=h,maxY=0,count=0;
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(data[((y+yy)*info.width+x+xx)*4+3]>128){minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);count++;}
    if(count<100)throw new Error(`Empty frame ${id}:${frames.length}`);
    frames.push({x,y,w,h,bounds:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1},foot:maxY});
  }
  if(id!=='foreground') {
    const visited=new Uint8Array(info.width*info.height),queue=new Int32Array(visited.length),components=[];
    for(let p=0;p<visited.length;p++){
      if(visited[p]||data[p*4+3]<100)continue;
      let head=0,tail=1,minX=info.width,minY=info.height,maxX=0,maxY=0;queue[0]=p;visited[p]=1;
      while(head<tail){const q=queue[head++],x=q%info.width,y=Math.floor(q/info.width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
        for(const next of [x>0?q-1:-1,x<info.width-1?q+1:-1,y>0?q-info.width:-1,y<info.height-1?q+info.width:-1])if(next>=0&&!visited[next]&&data[next*4+3]>=100){visited[next]=1;queue[tail++]=next;}
      }
      if(tail>4000)components.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,area:tail});
    }
    if(components.length!==16)throw new Error(`Expected 16 separated characters, found ${components.length}: ${id}`);
    components.sort((a,b)=>a.y-b.y);
    for(let row=0;row<4;row++){
      const group=components.slice(row*4,row*4+4).sort((a,b)=>a.x-b.x);
      group.forEach((c,col)=>{const padding=3,x=Math.max(0,c.x-padding),y=Math.max(0,c.y-padding),w=Math.min(info.width-x,c.w+padding*2),h=Math.min(info.height-y,c.h+padding*2);frames[row*4+col]={x,y,w,h,bounds:{x:0,y:0,w,h},foot:h-1};});
    }
  }
  const record={url,width:info.width,height:info.height,transparentRatio:+(transparent/(info.width*info.height)).toFixed(3),frames};
  if(id==='foreground')manifest.layers=record;else manifest.characters[id]=record;
  console.log(`${id}: ${info.width}×${info.height}, transparent ${record.transparentRatio*100}%, ${frames.length} frames, neon opaque ${neonOpaque}, opaque ${opaque}`);
}
for(const id of ['park','living','bedroom','study']){const m=await sharp(`public/assets/scenes/${id}.png`).metadata();manifest.scenes[id]={url:`/assets/scenes/${id}.png`,width:m.width,height:m.height};}
await mkdir('src/generated',{recursive:true});
await writeFile('src/generated/assets.json',JSON.stringify(manifest,null,2));
await writeFile('docs/ASSET_REPORT.json',JSON.stringify(manifest,null,2));
