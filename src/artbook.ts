import './artbook.css';
import {characters,characterIds,cgCharacterIds,classicCharacterIds,scenes,sceneIds,actionLabels,wardrobeLabels,isDance} from './content';
import type {Action,SceneId,CharacterId,Wardrobe} from './content';
import {visualFor,actionsFor,frameAt,portraitHtml,isCG,getClip,cgFrameTotal,activeFrameTotal} from './assets';
import manifest from './generated/assets.json';
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const query=new URLSearchParams(location.search),requested=query.get('character');
let person:CharacterId=characterIds.includes(requested as CharacterId)?requested as CharacterId:'xinglan';
let wardrobe:Wardrobe=query.get('wardrobe')==='low'&&isCG(person)?'low':'original',group:'cg'|'classic'=isCG(person)?'cg':'classic';
let action:Action='idle',place:SceneId='park',paused=false,elapsed=0,last=performance.now(),portraitMode=true,transparent=false,speed=1,loading=true,token=0;
let images:Record<string,HTMLImageElement>={};
const backgrounds:Record<string,HTMLImageElement>={};
document.querySelector('#artbook')!.innerHTML='<header><a href="/">✧ 心动日常</a><span>CHARACTER COLLECTION / 02</span><a href="/">进入小世界 ↗</a></header><main><div class="art-intro"><span class="kicker">A NEW CHAPTER, A LITTLE CLOSER</span><h1>六种新心动，两套新造型。</h1><p>年轻的游戏 CG 角色，细腻的衣料与发丝。<br>六种舞蹈，每组 18 帧，收藏她的每一个日常瞬间。</p><div class="collection-stats"><span>6 位 CG 新伙伴</span><span>12 套角色造型</span><span>'+cgFrameTotal+' 个 CG 动作帧</span></div></div><div class="art-toolbar"><div class="art-tabs"><button data-art-group="cg">CG 新章 · 6</button><button data-art-group="classic">温柔日常 · 3</button></div><div class="art-tabs" id="gallery-wardrobes"><button data-art-wardrobe="original">原版造型</button><button data-art-wardrobe="low">低领短裙</button></div></div><section class="character-showcase" id="gallery" aria-label="角色立绘收藏"></section><section class="motion-studio" id="motion-studio"><div class="studio-stage"><canvas id="motion-canvas" width="600" height="900" aria-label="角色动作预览"></canvas><span class="studio-badge" id="studio-badge"></span><div class="studio-loading" id="studio-loading" role="status">正在准备角色与动作…</div></div><div class="studio-details"><span class="kicker">A MOMENT WITH HER</span><h2 id="studio-name"></h2><p id="studio-trait"></p><div class="studio-modes"><button id="show-portrait">高清立绘</button><button id="show-motion">动作预览</button></div><div class="studio-actions" id="studio-actions"></div><div class="playback-controls"><button id="art-pause">暂停 Ⅱ</button><button id="art-step">下一帧 →</button><span id="frame-info"></span></div><label class="speed-control">播放速度 <input id="art-speed" type="range" min="0.5" max="1.5" step="0.25" value="1"><span id="speed-label">1×</span></label><label class="clear-toggle"><input id="art-transparent" type="checkbox">查看透明背景</label><div class="downloads" id="downloads"></div><a class="enter-game" href="/">一起进入小世界 ↗</a></div></section><div class="scene-heading"><h2>生活的四种光影</h2><p>为她换一个背景，收藏另一种心情。</p></div><section class="art-scenes">'+sceneIds.map(id=>'<button data-art-scene="'+id+'" class="'+(id==='park'?'chosen':'')+'"><img src="'+manifest.scenes[id].url+'" alt="'+scenes[id].name+'"><span>'+scenes[id].name+'<small>'+scenes[id].en+'</small></span></button>').join('')+'</section><p class="art-note">9 位成年虚构角色 · '+activeFrameTotal+' 个透明动作帧 · 4 个生活场景<br>原版与低领版分别保留，均可切换与下载。</p><footer>HEARTFELT DAYS — EVERY LITTLE MOMENT MATTERS.</footer></main>';
function renderGallery(){
  $('#gallery').innerHTML=(group==='cg'?cgCharacterIds:classicCharacterIds).map(id=>{
    const c=characters[id],v=visualFor(id,wardrobe);
    return '<article class="'+(person===id?'chosen':'')+'"><button class="gallery-image" data-art-character="'+id+'" aria-label="查看'+c.name+'"><div class="gallery-light"></div>'+(v.master?'<img src="'+v.master.url+'" alt="'+c.name+' · '+wardrobeLabels[wardrobe]+'" loading="lazy">':portraitHtml(id,'classic-art'))+'<span class="style-tag">'+c.style+'</span><span class="gallery-number">'+c.en+'</span></button><div class="art-card-text"><small>'+c.age+' 岁 · '+(isCG(id)?wardrobeLabels[wardrobe]:'插画造型')+'</small><h2>'+c.name+'</h2><p>'+c.trait+'</p><button data-art-character="'+id+'">查看立绘与动作 ↗</button></div></article>';
  }).join('');
  document.querySelectorAll<HTMLElement>('[data-art-group]').forEach(el=>el.classList.toggle('chosen',el.dataset.artGroup===group));
  document.querySelectorAll<HTMLElement>('[data-art-wardrobe]').forEach(el=>el.classList.toggle('chosen',el.dataset.artWardrobe===wardrobe));
  $('#gallery-wardrobes').classList.toggle('hidden',group==='classic');
}
function updateDetails(){
  const c=characters[person],v=visualFor(person,wardrobe);
  $('#studio-name').textContent=c.name;$('#studio-trait').textContent=c.trait;$('#studio-badge').textContent=c.style+' · '+(isCG(person)?wardrobeLabels[wardrobe]:'温柔日常');
  $('#show-portrait').classList.toggle('chosen',portraitMode);$('#show-motion').classList.toggle('chosen',!portraitMode);
  $('#show-portrait').toggleAttribute('disabled',!v.master);
  $('#studio-actions').innerHTML=actionsFor(person).map(a=>'<button data-art-action="'+a+'" class="'+(!portraitMode&&action===a?'chosen':'')+'">'+actionLabels[a]+(isCG(person)&&isDance(a)?'<small>18 帧</small>':'')+'</button>').join('');
  const sheetLabels:Record<string,string>={classic:'日常动作',everyday:'待机与行走',moments:'坐下与招手',gestures:'伸展与发梢',dances:'三套舞蹈',...actionLabels};
  const exportLink=(key:string,url:string,label:string)=>'<a href="'+url+'" data-export-sheet="'+key+'" download="'+person+'-'+wardrobe+'-'+key+'.png">'+label+' ↓</a>';
  $('#downloads').innerHTML='<strong id="download-status" role="status">收藏透明 PNG</strong>'+(v.master?exportLink('master',v.master.url,'高清立绘'):'')+Object.entries(v.sheets).map(([key,sheet])=>exportLink(key,sheet.url,sheetLabels[key])).join('');
}
async function imageAt(url:string){const img=new Image();img.src=url;await img.decode();return img;}
async function exportPng(link:HTMLAnchorElement){
  if(link.dataset.busy)return;
  link.dataset.busy='true';const label=link.textContent;link.textContent='正在保存…';
  try{
    const cached=images[link.dataset.exportSheet!],img=cached?.src===link.href?cached:await imageAt(link.href);
    const output=document.createElement('canvas');output.width=img.naturalWidth;output.height=img.naturalHeight;
    output.getContext('2d')!.drawImage(img,0,0);
    const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(value=>value?resolve(value):reject(new Error('PNG export failed')),'image/png'));
    const url=URL.createObjectURL(blob),download=document.createElement('a');download.href=url;download.download=link.download;
    document.body.append(download);download.click();download.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    $('#download-status').textContent='透明 PNG 已准备好';
  }catch{$('#download-status').textContent='保存失败，请再试一次';}
  finally{delete link.dataset.busy;link.textContent=label;}
}
async function loadPerson(){
  const seq=++token;loading=true;$('#studio-loading').classList.remove('hidden');$('#studio-loading').textContent='正在准备角色与动作…';updateDetails();
  const v=visualFor(person,wardrobe);
  try{const entries=await Promise.all([...Object.entries(v.sheets).map(([key,sheet])=>imageAt(sheet.url).then(img=>[key,img] as const)),...(v.master?[imageAt(v.master.url).then(img=>['master',img] as const)]:[])]);
    if(seq!==token)return;images=Object.fromEntries(entries);elapsed=0;loading=false;$('#studio-loading').classList.add('hidden');
  }catch{if(seq!==token)return;$('#studio-loading').innerHTML='素材加载失败。<button id="retry-art">重新加载</button>';$('#retry-art').onclick=()=>void loadPerson();}
}
document.addEventListener('click',event=>{
  const download=(event.target as Element).closest<HTMLAnchorElement>('[data-export-sheet]');
  if(download){event.preventDefault();void exportPng(download);return;}
  const target=event.target as Element,card=target.closest<HTMLElement>('[data-art-character]'),tab=target.closest<HTMLElement>('[data-art-group]'),outfit=target.closest<HTMLElement>('[data-art-wardrobe]'),motion=target.closest<HTMLElement>('[data-art-action]'),scene=target.closest<HTMLElement>('[data-art-scene]');
  if(card){person=card.dataset.artCharacter as CharacterId;portraitMode=isCG(person);action='idle';renderGallery();void loadPerson();$('#motion-studio').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});}
  if(tab){group=tab.dataset.artGroup as typeof group;person=group==='cg'?'xinglan':'xiaoman';if(group==='classic')wardrobe='original';portraitMode=group==='cg';action='idle';renderGallery();void loadPerson();}
  if(outfit){wardrobe=outfit.dataset.artWardrobe as Wardrobe;elapsed=0;renderGallery();void loadPerson();}
  if(motion){action=motion.dataset.artAction as Action;portraitMode=false;elapsed=0;updateDetails();}
  if(scene){place=scene.dataset.artScene as SceneId;document.querySelectorAll('[data-art-scene]').forEach(el=>el.classList.toggle('chosen',el===scene));}
});
$('#show-portrait').onclick=()=>{portraitMode=true;updateDetails();};
$('#show-motion').onclick=()=>{portraitMode=false;elapsed=0;updateDetails();};
$('#art-pause').onclick=()=>{paused=!paused;$('#art-pause').textContent=paused?'继续 ▷':'暂停 Ⅱ';};
$('#art-step').onclick=()=>{portraitMode=false;paused=true;$('#art-pause').textContent='继续 ▷';const clip=getClip(person,action,wardrobe);elapsed=(Math.floor(elapsed/1000*clip.fps)+1)*1000/clip.fps+0.001;updateDetails();};
$('#art-speed').oninput=()=>{speed=Number($<HTMLInputElement>('#art-speed').value);$('#speed-label').textContent=speed+'×';};
$('#art-transparent').onchange=()=>{transparent=$<HTMLInputElement>('#art-transparent').checked;};
const canvas=$<HTMLCanvasElement>('#motion-canvas'),ctx=canvas.getContext('2d')!;
function draw(now:number){
  const dt=Math.max(0,Math.min(50,now-last));last=now;
  if(!paused&&!document.hidden&&!loading)elapsed+=dt*speed;
  ctx.clearRect(0,0,600,900);
  const bg=backgrounds[place];if(!transparent&&bg){const cover=Math.max(600/bg.width,900/bg.height);ctx.drawImage(bg,(600-bg.width*cover)/2,(900-bg.height*cover)/2,bg.width*cover,bg.height*cover);ctx.fillStyle='#f6efdc19';ctx.fillRect(0,0,600,900);}
  if(!loading){const v=visualFor(person,wardrobe);let sheet,f,img;
    if(portraitMode&&v.master){sheet=v.master;f=sheet.frames[0];img=images.master;}
    else{const preview=frameAt(person,action,elapsed,wardrobe);sheet=preview.sheet;f=sheet.frames[preview.index];img=images[preview.clip.sheet];$('#frame-info').textContent=(preview.position+1)+' / '+preview.clip.frames.length+' 帧';}
    if(img){const ref=portraitMode?f.h:sheet.referenceHeight??f.h,scale=730/ref,x=300+(!portraitMode&&action==='walk'?Math.sin(elapsed/1300)*45:0),bottom=850;
      if(!transparent&&!portraitMode&&action==='sit'&&backgrounds.layers){const seat=manifest.layers.frames[3],b=seat.bounds,h=isCG(person)?275:210;ctx.drawImage(backgrounds.layers,seat.x+b.x,seat.y+b.y,b.w,b.h,x-125,bottom-h,250,h);}
      const maxWidth=portraitMode?f.w:Math.max(...sheet.frames.map(frame=>frame.w));
      const maxHeight=portraitMode?f.h:sheet.referenceHeight??Math.max(...sheet.frames.map(frame=>frame.h));
      const maxScale=Math.min(scale,560/maxWidth,800/maxHeight);
      ctx.drawImage(img,f.x,f.y,f.w,f.h,x-f.w*(f.origin?.x??.5)*maxScale,bottom-f.h*(f.origin?.y??1)*maxScale,f.w*maxScale,f.h*maxScale);
    }if(portraitMode)$('#frame-info').textContent='高清透明立绘';
  }requestAnimationFrame(draw);
}
renderGallery();void loadPerson();void Promise.all([...sceneIds.map(async id=>{backgrounds[id]=await imageAt(manifest.scenes[id].url);}),imageAt(manifest.layers.url).then(img=>{backgrounds.layers=img;})]).catch(()=>{$('#studio-loading').textContent='场景未能加载，仍可查看透明角色。';});
requestAnimationFrame(draw);
