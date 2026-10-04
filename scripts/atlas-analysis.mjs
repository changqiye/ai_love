import sharp from 'sharp';
import {createHash} from 'node:crypto';

export async function inspectAtlas(file,count,columns,{anchors=false}={}){
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
  const bodies=new Set(components.map(c=>c.key));components.sort((a,b)=>a.y-b.y);const ordered=[];
  for(let row=0;row<count/columns;row++)ordered.push(...components.slice(row*columns,(row+1)*columns).sort((a,b)=>a.x-b.x));
  const baselines=Array.from({length:count/columns},(_,row)=>Math.max(...ordered.slice(row*columns,(row+1)*columns).map(c=>c.y+c.h)));
  const signatures=new Set();
  const frames=ordered.map((c,i)=>{
    let foreign=0;for(let yy=c.y;yy<c.y+c.h;yy++)for(let xx=c.x;xx<c.x+c.w;xx++){const value=labels[yy*info.width+xx];if(bodies.has(value)&&value!==c.key)foreign++;}
    if(foreign)throw new Error(`${file} frame ${i+1}: ${foreign} neighboring figure pixels`);
    if(c.x===0||c.y===0||c.x+c.w===info.width||c.y+c.h===info.height)throw new Error(`${file} frame ${i+1}: figure clipped at image edge`);
    const hash=createHash('sha256').update(`${c.w}:${c.h}:`);
    for(let y=c.y;y<c.y+c.h;y++)hash.update(data.subarray((y*info.width+c.x)*4,(y*info.width+c.x+c.w)*4));
    const signature=hash.digest('hex');if(signatures.has(signature))throw new Error(`${file} frame ${i+1}: duplicate pose image`);signatures.add(signature);
    const frame={x:c.x,y:c.y,w:c.w,h:c.h};
    if(anchors){
      const center=(i%columns+.5)*info.width/columns;
      frame.origin={x:+((center-c.x)/c.w).toFixed(6),y:+((baselines[Math.floor(i/columns)]-c.y)/c.h).toFixed(6)};
      if(frame.origin.x<-.1||frame.origin.x>1.1)throw new Error(`${file} frame ${i+1}: figure is outside its animation column`);
    }
    return frame;
  });
  return {width:info.width,height:info.height,transparentRatio:+(clear/labels.length).toFixed(4),uniqueFrames:signatures.size,referenceHeight:Math.max(...frames.map(f=>f.h)),frames};
}
