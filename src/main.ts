import './style.css';
import {createIcons,Heart,Flower2,Sun,Moon,CloudRain,Music2,Volume2,VolumeX,Settings2,BookHeart,MapPin,ChevronRight,ArrowUpRight,Footprints,Armchair,Gift,MessageCircle,Sparkles,Check,X,ArrowLeft,Send,Coffee,CakeSlice,Disc3,Download,Upload,Users,Compass,Play,Pause,RotateCcw,Bookmark,Leaf,CheckCheck} from 'lucide';
import {characters,characterIds,classicCharacterIds,cgCharacterIds,scenes,sceneIds,gifts,replyTo,actionLabels,danceTracks,isDance,wardrobeLabels} from './content';
import {portraitHtml,actionsFor,danceActionsFor,isCG,getClip} from './assets';
import type {CharacterId,SceneId,Action,GiftId,Wardrobe} from './content';
import {loadSave,persist,relationship,earnActivity,sendGift,claimDaily,validateSave,refreshDay,memoryTotal} from './state';
import type {Save} from './state';
import {createGame} from './game';
import {Ambience} from './audio';
import manifest from './generated/assets.json';
import {judgeBeat} from './rhythm';

const icons={Heart,Flower2,Sun,Moon,CloudRain,Music2,Volume2,VolumeX,Settings2,BookHeart,MapPin,ChevronRight,ArrowUpRight,Footprints,Armchair,Gift,MessageCircle,Sparkles,Check,X,ArrowLeft,Send,Coffee,CakeSlice,Disc3,Download,Upload,Users,Compass,Play,Pause,RotateCcw,Bookmark,Leaf,CheckCheck};
const icon=(name:string,cls='')=>`<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
function paintIcons(){createIcons({icons,attrs:{'stroke-width':1.65}});}
function escapeHtml(text:string){return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
let state:Save=loadSave();
let ready=false,modalType='',chatPending=false,replyCounter=0,lastTap=0,previousFocus:HTMLElement|null=null;
const ambience=new Ambience();
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
if(reducedQuery.matches)state.reducedMotion=true;
let activeAction:Action='idle';
const aiStatus=fetch('/api/status.json').then(r=>r.ok?r.json():null).then(data=>Boolean(data?.enabled)).catch(()=>false);
interface Activity {type:Exclude<Action,'idle'>;elapsed:number;duration:number;hits:Set<number>;score:number;beatMs:number;beats:number;}
let activity:Activity|null=null;
type CharacterCollection='latest'|'original'|'classic';
const collectionFor=(id:CharacterId,wardrobe:Wardrobe):CharacterCollection=>isCG(id)?wardrobe==='low'?'latest':'original':'classic';
// Show the newest collection on entry while keeping the saved character on stage.
let characterGroup:CharacterCollection='latest',changingCharacter=false;
const portrait=portraitHtml;
document.querySelector('#app')!.innerHTML=`
<header class="topbar"><a class="brand" href="/" aria-label="心动日常首页"><span class="brand-mark">${icon('flower-2')}</span><span>心动日常<small>HEARTFELT DAYS</small></span></a><nav aria-label="主导航"><button class="nav-link current" data-nav="home">一起生活<span class="nav-dot"></span></button><button class="nav-link" data-open="album">回忆手账</button></nav><div class="top-actions"><span class="local-note"><span></span>此刻，刚刚好</span><button class="icon-button sound-button" aria-label="开启声音">${icon('volume-x')}</button><button class="icon-button" data-open="settings" aria-label="设置">${icon('settings-2')}</button></div></header>
<main class="layout">
  <aside class="left-panel"><div class="eyebrow"><span></span> A LITTLE CLOSER, EVERY DAY</div><h1>平凡的日子，<br>有一点<span>心动。</span></h1><p class="intro">一起散步、听歌、发一会儿呆。<br>把小小的日常，慢慢变成我们的故事。</p><div class="section-heading"><h2>今天，和谁一起？</h2><span>09 位伙伴</span></div><div id="character-groups"></div><div id="companions"></div><a class="artbook-link" href="/artbook.html">角色与动作设定集 ↗</a><div class="companion-note"><span class="quote-mark">“</span><p id="character-quote"></p><div><span class="tiny-line"></span><span id="character-sign"></span></div></div><div class="local-save-note">${icon('bookmark')} 每一次心动，都为你悄悄收藏</div></aside>
  <section class="stage-column" aria-label="互动游戏舞台"><div class="stage-shell" id="stage-shell"><div id="game-canvas"></div><div class="stage-vignette"></div>
    <div id="loading" class="loading-screen"><span class="loading-flower">${icon('flower-2')}</span><h2>把温柔，装进日常</h2><p>正在布置属于你们的小世界…</p><div class="load-track"><span id="load-progress"></span></div><small>HEARTFELT DAYS</small></div>
    <div class="stage-top"><button class="location-pill" data-open="scenes" aria-label="切换场景">${icon('map-pin')}<span id="stage-location">樱花公园</span>${icon('chevron-right')}</button><div class="currency">${icon('heart')}<span id="heart-count">60</span></div></div>
    <div class="scene-caption"><span id="scene-time">春日午后</span><div id="scene-weather">微风 · 22°</div></div>
    <div class="stage-tools"><button class="glass-icon wardrobe-toggle" data-open="wardrobe" aria-label="切换服装">${icon('sparkles')}<span>换装</span><small id="stage-wardrobe-label"></small></button><button class="glass-icon" id="light-button" aria-label="切换夜色">${icon('sun')}</button><button class="glass-icon" data-open="album" aria-label="打开回忆相册">${icon('book-heart')}</button></div>
    <div class="character-loading hidden" id="character-loading" role="status">正在准备她的造型…</div><div class="interaction-hint" id="interaction-hint">轻触她，打个招呼 ${icon('sparkles')}</div>
    <section class="rhythm-panel hidden" id="rhythm-panel" aria-label="心动节拍小游戏"><div><span class="eyebrow">HEARTBEAT DUET</span><strong>跟着心跳，轻轻点</strong><small id="rhythm-score">圆环收拢时点击 · 0 / 12</small></div><button id="rhythm-tap" aria-label="击打节拍"><span class="beat-ring" id="beat-ring"></span>${icon('heart')}</button><span id="rhythm-feedback" aria-live="polite">准备好了吗</span></section>
    <div class="watch-bar hidden" id="watch-bar"><span id="watch-title"></span><button id="stop-watch">结束欣赏 ×</button></div><div class="stage-bottom"><div class="dialogue" id="dialogue" aria-live="polite"><div class="dialogue-heading"><span id="dialogue-name">林小满</span><span id="dialogue-mood">心情晴朗</span><span id="affection-badge">Lv. 1</span></div><p id="dialogue-text"></p><div class="activity-progress hidden" id="activity-progress"><span></span></div></div>
    <div class="action-bar" role="group" aria-label="日常活动"><button data-action="walk">${icon('footprints')}<span>散步</span></button><button data-open="dances">${icon('music-2')}<span>跳舞</span></button><button data-action="sit">${icon('armchair')}<span>坐一会儿</span></button><button data-open="motions">${icon('sparkles')}<span>动作</span></button><button data-open="gifts">${icon('gift')}<span>送礼</span></button><button data-open="chat">${icon('message-circle')}<span>聊聊天</span></button></div>
    <div class="mobile-toolbar"><button data-open="characters">${icon('users')}伙伴</button><button data-open="scenes">${icon('compass')}地点</button><button data-open="wishes">${icon('sparkles')}小愿望</button><button data-open="album">${icon('book-heart')}回忆</button></div></div>
  </div><div class="stage-footnote"><span class="live-dot"></span><span>不必赶时间，陪伴本来就是意义。</span><span>✧</span></div></section>
  <aside class="right-panel"><section class="destinations"><div class="section-heading"><h2>去哪里，遇见日常</h2>${icon('compass')}</div><p class="section-sub">换个地方，收藏另一种心情</p><div id="scene-list" class="scene-grid"></div></section><section class="wishes"><div class="section-heading"><h2>今日小愿望</h2>${icon('sparkles')}</div><p class="section-sub">三件小事，就能点亮今天</p><div id="wish-list"></div><button class="wish-reward" id="claim-reward"></button></section><button class="album-teaser" data-open="album"><div class="album-icon">${icon('book-heart')}</div><div><strong>我们的回忆手账</strong><span><b id="memory-count">0</b> / ${memoryTotal} 个珍藏瞬间</span></div>${icon('arrow-up-right')}</button><p class="side-footer">LIFE IS BETTER<br>WITH A LITTLE LOVE.</p></aside>
</main><footer class="page-footer"><span>心动日常 · a small world, just for us</span><span>本地存档 · 无需登录</span></footer>
<div id="toast" class="toast" role="status"></div>
<dialog id="panel-dialog" aria-labelledby="modal-title"><div class="modal-head"><div><span class="eyebrow" id="modal-eyebrow"></span><h2 id="modal-title"></h2></div><button id="close-modal" class="icon-button" aria-label="关闭">${icon('x')}</button></div><div id="modal-body"></div></dialog>`;

const {game,scene}=createGame($('#game-canvas'),()=>{ready=true;scene.setLocation(state.scene);scene.preferences(state.reducedMotion,state.night);fitActor();$('#loading').classList.add('loaded');setTimeout(()=>$('#loading').remove(),650);},()=>greet(),()=>{$('#loading p').textContent='素材加载失败，请检查连接后重新加载。';$('#loading').insertAdjacentHTML('beforeend','<button class="primary-button" id="reload">重新加载</button>');$('#reload').onclick=()=>location.reload();},state.character,state.wardrobes[state.character]);
function fitActor(){if(!ready)return;const rect=$('#stage-shell').getBoundingClientRect(),panel=$('#dialogue').getBoundingClientRect();const renderScale=Math.max(rect.width/432,rect.height/780),offsetY=(rect.height-780*renderScale)/2,offsetX=(rect.width-432*renderScale)/2;const floor=(panel.top-rect.top-14-offsetY)/renderScale;const top=((rect.height<650?145:165)-offsetY)/renderScale;const actorScale=Math.min(1.28,Math.max(0.7,(floor-top)/310));const right=Math.min(300,(rect.width-offsetX)/renderScale-90*actorScale-12);scene.setLayout(floor,actorScale,right);}
const stageObserver=new ResizeObserver(()=>fitActor());stageObserver.observe($('#stage-shell'));stageObserver.observe($('#dialogue'));
// Expose read-only diagnostics for browser integration tests and local troubleshooting.
Object.defineProperty(window,'heartfelt',{value:{get state(){return structuredClone(state);},get scene(){return scene;},get game(){return game;},get ready(){return ready;},get action(){return activeAction;}}});
let toastTimer:ReturnType<typeof setTimeout>;
function toast(message:string){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function save(){if(!persist(state))toast('浏览器暂时无法保存，请在设置中导出存档。');const backup=document.querySelector<HTMLTextAreaElement>('#backup-text');if(backup&&backup.value===backup.dataset.snapshot){backup.value=JSON.stringify(state);backup.dataset.snapshot=backup.value;}}
function say(text:string,mood='心情晴朗'){$('#dialogue-text').textContent=text;$('#dialogue-mood').textContent=mood;}
function characterCards(){const wardrobe:Wardrobe=characterGroup==='latest'?'low':'original';return (characterGroup==='classic'?classicCharacterIds:cgCharacterIds).map(id=>{const selected=state.character===id&&state.wardrobes[id]===wardrobe;return `<button class="companion-card ${selected?'selected':''}" data-character="${id}" data-look="${wardrobe}" aria-pressed="${selected}">${portrait(id,'',wardrobe)}<span class="companion-info"><strong>${characters[id].name}<em>${characters[id].age} 岁</em></strong><span>${characterGroup==='latest'?'低领新造型':characterGroup==='original'?'原版造型':'插画造型'} · ${characters[id].style}</span></span><span class="companion-check">${icon(selected?'check':'chevron-right')}</span></button>`;}).join('');}
function groupTabs(){const description=characterGroup==='latest'?'最新低领吊带、短裙与开口旗袍，点击伙伴直接换上。':characterGroup==='original'?'六位 CG 伙伴的原版服装，完整保留，随时切换。':'熟悉的三位插画伙伴，继续陪你收藏日常。';return `<div class="group-tabs" aria-label="伙伴造型"><button data-group="latest" aria-pressed="${characterGroup==='latest'}">最新低领 · 6</button><button data-group="original" aria-pressed="${characterGroup==='original'}">原版 CG · 6</button><button data-group="classic" aria-pressed="${characterGroup==='classic'}">插画伙伴 · 3</button></div><p class="collection-description">${description}</p>`;}
function sceneCards(){return sceneIds.map(id=>`<button class="scene-card ${state.scene===id?'selected':''}" data-scene="${id}" aria-pressed="${state.scene===id}"><img src="${manifest.scenes[id].url}" alt="${scenes[id].name}场景" loading="lazy"><span>${scenes[id].name}</span>${state.scene===id?`<b>${icon('check')}</b>`:''}</button>`).join('');}
function wishesHtml(){const rows=[{id:'walk',label:'一起走一小段路',sub:'慢一点，也没关系',icon:'footprints'},{id:'dance',label:'分享一首歌的时间',sub:'让心跳跟上节拍',icon:'music-2'},{id:'sit',label:'留一会儿给彼此',sub:'坐下来，放松一下',icon:'armchair'}];return rows.map(r=>`<button class="wish-item ${state.daily.actions.includes(r.id)?'done':''}" data-action="${r.id}"><span class="wish-symbol">${icon(state.daily.actions.includes(r.id)?'check':r.icon)}</span><span><strong>${r.label}</strong><small>${r.sub}</small></span></button>`).join('');}
function refresh(){
  refreshDay(state);const c=characters[state.character],r=relationship(state.affection[state.character]),s=scenes[state.scene];
  $('#character-groups').innerHTML=groupTabs();$('#companions').innerHTML=characterCards();$('#character-quote').textContent=c.flower;$('#character-sign').textContent=`${c.name} · ${c.en}`;
  $('#scene-list').innerHTML=sceneCards();$('#wish-list').innerHTML=wishesHtml();
  $('#heart-count').textContent=String(state.hearts);$('#dialogue-name').textContent=c.name;$('#affection-badge').textContent=`Lv. ${r.level} · ${r.title}`;
  $('#stage-wardrobe-label').textContent=isCG(state.character)?state.wardrobes[state.character]==='low'?'低领':'原版':'插画';
  $('#stage-location').textContent=s.name;$('#scene-time').textContent=s.time;$('#scene-weather').textContent=s.weather;$('#memory-count').textContent=String(state.memories.length);
  $('#claim-reward').innerHTML=`<span>${icon(state.daily.claimed?'check-check':'gift')}${state.daily.claimed?'今日心意已收下':`收下今日心意 (${Math.min(3,state.daily.actions.length)}/3)`}</span><b>${state.daily.claimed?'✓':'+25 ♡'}</b>`;
  $('#claim-reward').classList.toggle('available',state.daily.actions.length>=3&&!state.daily.claimed);
  document.querySelectorAll('.sound-button').forEach(el=>{el.innerHTML=icon(state.sound?'volume-2':'volume-x');el.setAttribute('aria-label',state.sound?'关闭声音':'开启声音');});
  $('#light-button').innerHTML=icon(state.night?'moon':'sun');$('#light-button').setAttribute('aria-label',state.night?'切换日光':'切换夜色');
  document.body.classList.toggle('reduce-motion',state.reducedMotion);paintIcons();
}

function stopActivity(){activity=null;activeAction='idle';scene.setAction('idle');$('#stage-shell').classList.remove('dancing');$('#rhythm-panel').classList.add('hidden');$('#activity-progress').classList.add('hidden');$('#watch-bar').classList.add('hidden');document.querySelectorAll('[data-action]').forEach(el=>el.classList.remove('active'));}
async function chooseCharacter(id:CharacterId,wardrobe:Wardrobe=state.wardrobes[id]){
  if(!ready||changingCharacter){toast('造型正在准备，请稍等一下。');return;}
  if(id===state.character&&wardrobe===state.wardrobes[id]){if(modalType==='characters')closeModal();return;}
  stopActivity();changingCharacter=true;$('#character-loading').classList.remove('hidden');
  try{if(!await scene.setCharacter(id,wardrobe))throw new Error('素材暂时无法加载，请再试一次。');state.character=id;state.wardrobes[id]=wardrobe;characterGroup=collectionFor(id,wardrobe);say(characters[id].greeting);refresh();fitActor();save();if(modalType==='characters')closeModal();toast('今天，和'+characters[id].short+'一起 · '+(isCG(id)?wardrobeLabels[wardrobe]:'插画造型'));}
  catch(e){toast(e instanceof Error?e.message:'角色加载失败');}
  finally{changingCharacter=false;$('#character-loading').classList.add('hidden');}
}
async function chooseWardrobe(wardrobe:Wardrobe){
  if(!isCG(state.character)||changingCharacter||!ready)return;
  stopActivity();changingCharacter=true;$('#character-loading').classList.remove('hidden');
  try{if(!await scene.setCharacter(state.character,wardrobe))throw new Error('这套造型暂时无法加载，请再试一次。');state.wardrobes[state.character]=wardrobe;characterGroup=collectionFor(state.character,wardrobe);save();refresh();fitActor();closeModal();say('换个造型，今天也陪你一起。',wardrobeLabels[wardrobe]);toast('已换上'+wardrobeLabels[wardrobe]);}
  catch(e){toast(e instanceof Error?e.message:'换装失败');}finally{changingCharacter=false;$('#character-loading').classList.add('hidden');}
}
function chooseScene(id:SceneId){if(id===state.scene){if(modalType==='scenes')closeModal();return;}stopActivity();state.scene=id;scene.setLocation(id);scene.preferences(state.reducedMotion,state.night);say(scenes[id].subtitle,'一起换个心情');refresh();save();if(modalType==='scenes')closeModal();}
function greet(){if(!ready||modalType||changingCharacter)return;const now=Date.now();if(now-lastTap<1300)return;lastTap=now;scene.burst(5);say(characters[state.character].lines.tap,'眼里都是你');}
function actionLine(type:Action){const c=characters[state.character];return type==='walk'||type==='sit'?c.lines[type]:isDance(type)?c.lines.dance:type==='wave'?'看见你了！来，向今天打个招呼。':type==='stretch'?'伸个懒腰，肩膀也跟着轻松一点。':type==='hair'?'等一下，风把发梢吹乱了。现在，好啦。':c.greeting;}
function startAction(type:Action,watch=false){
  if(!ready||changingCharacter){toast('小世界还在准备中，再等一下。');return;}
  if(!actionsFor(state.character).includes(type)){toast('她暂时还没有这个动作。');return;}
  if(modalType)closeModal();if(type==='idle'||(activity?.type===type&&!watch)){stopActivity();say('就这样安静待一会儿，也很好。');return;}
  stopActivity();activeAction=type;scene.setAction(type);say(actionLine(type),actionLabels[type]);$('#interaction-hint').classList.add('hidden');
  if(isDance(type)){scene.setDanceTempo(danceTracks[type].beatMs);$('#stage-shell').classList.add('dancing');if(watch){$('#watch-title').textContent='正在欣赏 · '+actionLabels[type];$('#watch-bar').classList.remove('hidden');return;}}
  const track=isDance(type)?danceTracks[type]:null;
  activity={type,elapsed:0,duration:track?track.beatMs*(track.beats+1):type==='walk'?8500:type==='sit'?6500:5000,hits:new Set(),score:0,beatMs:track?.beatMs??700,beats:track?.beats??12};
  $('#activity-progress').classList.remove('hidden');
  document.querySelectorAll('[data-action="'+type+'"]').forEach(el=>el.classList.add('active'));
  if(track){$('#stage-shell').classList.add('dancing');$('#rhythm-panel').classList.remove('hidden');$('#rhythm-panel strong').textContent=track.title+' · 一起合拍';$('#rhythm-score').textContent='圆环收拢时点击 · 0 / '+track.beats;$('#rhythm-feedback').textContent='准备好了吗';}
}
function finishActivity(){
  if(!activity)return;const {type,score}=activity;activity=null;
  const reward=earnActivity(state,isDance(type)?'dance':type,isDance(type)?Math.round(score/2):0);refresh();save();scene.burst();ambience.chime();
  $('#activity-progress').classList.add('hidden');$('#rhythm-panel').classList.add('hidden');$('#stage-shell').classList.remove('dancing');
  const ending=isDance(type)?'合拍 '+score+' 次！和你一起的节奏，连空气都是甜的。':type==='walk'?'把今天的风，和你一起收藏起来了。':type==='sit'?'充好电了。谢谢你，把时间留给我。':'又收藏了一个和你在一起的小瞬间。';
  say(ending,'心意 +'+reward.hearts);toast(reward.memory?'新回忆「'+scenes[state.scene].memory+'」已收藏 · 心意 +'+reward.hearts:'陪伴完成 · 心意 +'+reward.hearts);
  if(type!=='sit'){activeAction='idle';scene.setAction('idle');}document.querySelectorAll('[data-action]').forEach(el=>el.classList.remove('active'));
}
function tapBeat(){
  if(!activity||!isDance(activity.type))return;
  const {beat,grade}=judgeBeat(activity.elapsed,activity.hits,activity.beatMs,activity.beats);
  if(grade==='ignored')return;
  if(grade==='perfect'||grade==='good'){activity.hits.add(beat);activity.score++;$('#rhythm-feedback').textContent=grade==='perfect'?'完美合拍！':'接住心动！';$('#rhythm-score').textContent='圆环收拢时点击 · '+activity.score+' / '+activity.beats;scene.burst(2);ambience.beat(grade==='perfect');navigator.vibrate?.(15);}
  else $('#rhythm-feedback').textContent='再等一下，听听心跳';
}
let lastFrame=performance.now();
function tick(now:number){const dt=Math.max(0,Math.min(now-lastFrame,80));lastFrame=now;if(activity&&!document.hidden){activity.elapsed+=dt;$('#activity-progress span').style.width=Math.min(100,activity.elapsed/activity.duration*100)+'%';if(isDance(activity.type)){const distance=Math.abs(activity.elapsed/activity.beatMs-Math.round(activity.elapsed/activity.beatMs));$('#beat-ring').style.transform='scale('+(1+distance*2.4)+')';$('#beat-ring').style.opacity=String(0.4+(1-distance)*0.5);}if(activity.elapsed>=activity.duration)finishActivity();}requestAnimationFrame(tick);}
requestAnimationFrame(tick);

const dialog=$<HTMLDialogElement>('#panel-dialog');
function closeModal(){dialog.close();modalType='';previousFocus?.focus();}
function openModal(type:string){
  if(type==='home'){closeModal();return;}
  previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;modalType=type;
  const titles:Record<string,[string,string]>={characters:['MEET YOUR COMPANION','今天，和谁一起？'],scenes:['SOMEWHERE WITH YOU','下一站，去哪里？'],gifts:['A LITTLE SOMETHING','把心意，送给她'],album:['OUR LITTLE MEMORIES','我们的回忆手账'],settings:['MAKE YOURSELF AT HOME','舒服地待在这里'],chat:['A MOMENT TO TALK',`和${characters[state.character].short}聊聊天`],wishes:['LITTLE THINGS MATTER','今日小愿望'],motions:['LITTLE EVERYDAY MOMENTS','她的日常动作'],dances:['DANCE WITH ME','选一段心动旋律'],wardrobe:['A NEW LOOK FOR TODAY','今天，换个造型']};
  const [en,title]=titles[type]??titles.settings;$('#modal-eyebrow').textContent=en;$('#modal-title').textContent=title;
  if(type==='characters')$('#modal-body').innerHTML=`<p class="modal-description">9 位伙伴，15 套造型。最新与原版都可以在这里直接选择。</p>${groupTabs()}<div class="modal-characters">${characterCards()}</div><p class="privacy-note">同一位伙伴的新旧服装共用好感度和回忆，切换造型不会重置进度。</p>`;
  if(type==='scenes')$('#modal-body').innerHTML=`<p class="modal-description">不用走很远，日常也能有新的风景。</p><div class="scene-grid modal-scenes">${sceneCards()}</div>`;
  if(type==='gifts')$('#modal-body').innerHTML=`<p class="modal-description">${characters[state.character].short}喜欢：${characters[state.character].likes}</p><div class="gift-balance">可用心意 <b>${state.hearts} ♡</b><span>一起活动就能获得</span></div><div class="gift-grid">${gifts.map(g=>`<button class="gift-card" data-gift="${g.id}" ${state.hearts<g.price?'disabled':''}><span class="gift-art" style="--gift-color:${g.color}">${icon(g.icon)}</span><strong>${g.name}</strong><small>${g.detail}</small><b>${g.price} ♡ ${characters[state.character].favorite===g.id?'<em>她的最爱</em>':''}</b></button>`).join('')}</div>`;
  if(type==='motions')$('#modal-body').innerHTML='<p class="modal-description">选择一个小动作，陪她度过轻松的片刻。</p><div class="motion-grid">'+actionsFor(state.character).filter(a=>!isDance(a)).map(a=>'<button class="motion-card" data-action="'+a+'">'+icon(a==='walk'?'footprints':a==='sit'?'armchair':'sparkles')+'<strong>'+actionLabels[a]+'</strong></button>').join('')+'</div><button class="primary-button" data-open="dances">看看她的舞蹈</button>';
  if(type==='dances')$('#modal-body').innerHTML='<p class="modal-description">自由欣赏她的舞步，或跟着圆环一起合拍。</p><div class="dance-list">'+danceActionsFor(state.character).map(a=>'<article class="dance-card"><div>'+icon(danceTracks[a].icon)+'<strong>'+danceTracks[a].title+(isCG(state.character)?'<span class="dance-frames">'+getClip(state.character,a,state.wardrobes[state.character]).frames.length+' 帧</span>':'')+'</strong><small>'+danceTracks[a].subtitle+'</small></div><div><button class="secondary-button" data-dance="'+a+'" data-watch="true">自由欣赏</button><button class="secondary-button" data-dance="'+a+'">一起合拍</button></div></article>').join('')+'</div>';
  if(type==='wardrobe')$('#modal-body').innerHTML=isCG(state.character)?'<p class="modal-description">保留原版，也可以换上新的低领短裙造型。</p><div class="wardrobe-grid">'+(['original','low'] as const).map(w=>'<button data-wardrobe="'+w+'" class="wardrobe-card '+(state.wardrobes[state.character]===w?'selected':'')+'"><img src="/assets/cg/'+state.character+(w==='low'?'/low':'')+'/master.webp" alt="'+characters[state.character].name+' · '+wardrobeLabels[w]+'"><strong>'+wardrobeLabels[w]+'</strong><small>'+(state.wardrobes[state.character]===w?'正在穿着':'点击换上')+'</small></button>').join('')+'</div>':'<p class="modal-description">这位伙伴保留温柔插画造型。六位 CG 新伙伴提供两套可切换的服装。</p><button class="primary-button" data-show-cg>认识 CG 新伙伴</button>';
  if(type==='album')renderAlbum();
  if(type==='chat')renderChat();
  if(type==='settings')renderSettings();
  if(type==='wishes')$('#modal-body').innerHTML=`<p class="modal-description">完成任意三种活动：散步、跳舞、坐下、聊天或送礼。</p>${wishesHtml()}<button class="primary-button" data-claim>${state.daily.claimed?'今日奖励已领取':`领取 ${Math.min(3,state.daily.actions.length)}/3 · 25 心意`}</button>`;
  if(!dialog.open)dialog.showModal();paintIcons();
}
function renderAlbum(){
  $('#modal-body').innerHTML=`<p class="modal-description">和每位伙伴，在每个地点完成一次活动，收下一段回忆。</p><div class="album-progress"><span>已珍藏 <b>${state.memories.length}</b> / ${memoryTotal}</span><div><span style="width:${state.memories.length/memoryTotal*100}%"></span></div></div><div class="memory-grid">${characterIds.flatMap(id=>sceneIds.map(sid=>{const memory=state.memories.find(m=>m.character===id&&m.scene===sid);return `<article class="memory-card ${memory?'unlocked':'locked'}"><div class="memory-picture"><img src="${manifest.scenes[sid].url}" alt="${memory?scenes[sid].name:'待解锁场景'}" loading="lazy">${memory?portrait(id,'memory-person'):`<span>${icon('heart')}</span>`}</div><strong>${memory?scenes[sid].memory:'待写下的故事'}</strong><small>${characters[id].short} · ${scenes[sid].name}</small><em>${memory?new Date(memory.date).toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'}):'一起活动即可解锁'}</em></article>`;})).join('')}</div>`;
}
function renderChat(){
  $('#modal-body').innerHTML=`<div class="chat-profile">${portrait(state.character)}<div><strong>${characters[state.character].name}</strong><span id="chat-mode">本地剧情模式 · 每个人都有不同的回应</span></div></div><div class="chat-history" id="chat-history" role="log" aria-live="polite"></div><div class="chat-suggestions">${['今天有点累','想和你一起散步','你喜欢什么音乐？'].map(t=>`<button data-suggestion="${t}">${t}</button>`).join('')}</div><form id="chat-form"><label class="sr-only" for="chat-input">想对她说的话</label><input id="chat-input" maxlength="500" autocomplete="off" placeholder="说说今天发生的小事…" ${chatPending?'disabled':''}><button type="submit" aria-label="发送" ${chatPending?'disabled':''}>${icon('send')}</button></form><p class="privacy-note">本地对话保存在此浏览器。配置服务器 AI 后，可切换为模型对话。</p>`;
  updateChat();$('#chat-form').onsubmit=event=>{event.preventDefault();const input=$<HTMLInputElement>('#chat-input');void submitChat(input.value);};
  void aiStatus.then(enabled=>{if(enabled&&modalType==='chat')$('#chat-mode').textContent='AI 对话已连接 · 发送内容将交给所配置的服务';});
}
function updateChat(){if(modalType!=='chat')return;const lines=state.chats[state.character];$('#chat-history').innerHTML=`<div class="chat-line companion">${escapeHtml(characters[state.character].greeting)}</div>${lines.map(m=>`<div class="chat-line ${m.from}">${escapeHtml(m.text)}</div>`).join('')}${chatPending?'<div class="chat-line companion typing">正在想怎么回应你…</div>':''}`;$('#chat-history').scrollTop=$('#chat-history').scrollHeight;}
async function submitChat(message:string){
  const text=message.trim();if(!text||chatPending)return;if(text.length>500){toast('这句话有点长，分成两次说吧。');return;}
  const person=state.character,place=state.scene;const lines=state.chats[person];lines.push({from:'user',text});chatPending=true;$<HTMLInputElement>('#chat-input').value='';$<HTMLInputElement>('#chat-input').disabled=true;updateChat();
  let response=replyTo(person,text,replyCounter++),mode='本地剧情';
  try {if(await aiStatus){const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({character:person,messages:lines.slice(-12)}),signal:AbortSignal.timeout(20000)});if(r.ok){const data=await r.json();if(typeof data.reply==='string'&&data.reply.trim()){response=data.reply.slice(0,2000);mode='AI 对话';}}else{toast('AI 暂时没有回应，已使用本地剧情。');}}}
  catch {toast('连接暂不可用，已使用本地剧情回应。');}
  lines.push({from:'companion',text:response});while(lines.length>80)lines.shift();chatPending=false;
  if(state.character===person&&state.scene===place){const reward=earnActivity(state,'chat');say(response,mode);if(reward.memory)toast('新的聊天回忆已收藏');refresh();}
  save();if(modalType==='chat'){updateChat();$<HTMLInputElement>('#chat-input').disabled=false;$<HTMLInputElement>('#chat-input').focus();}paintIcons();
}
function renderSettings(){
  $('#modal-body').innerHTML=`<p class="modal-description">调成你喜欢的节奏，剩下的交给陪伴。</p><div class="settings-list"><label><span><strong>轻柔音乐</strong><small>原创合成和弦与互动音效</small></span><input type="checkbox" id="setting-sound" ${state.sound?'checked':''}></label><label><span><strong>减少环境动态</strong><small>关闭视差、飘落粒子与浮动效果</small></span><input type="checkbox" id="setting-motion" ${state.reducedMotion?'checked':''}></label><label><span><strong>温柔夜色</strong><small>给场景加一层安静的暮色</small></span><input type="checkbox" id="setting-night" ${state.night?'checked':''}></label></div><div class="save-box"><h3>把我们的故事带走</h3><p>进度保存在当前浏览器。导出后可以在另一台设备恢复。</p><div><button class="secondary-button" id="export-save">${icon('download')}导出存档</button><label class="secondary-button import-label">${icon('upload')}导入存档<input type="file" id="import-save" accept="application/json,.json"></label></div></div><p class="privacy-note">AI 接口可在项目的环境配置中启用；密钥保留在服务器，不写入网页。角色均为成年虚构人物。</p><p class="version-note">心动日常 · 2.0 / Built with care</p>`;
  $('#setting-sound').onchange=()=>void toggleSound();
  $('#setting-motion').onchange=()=>{state.reducedMotion=$<HTMLInputElement>('#setting-motion').checked;scene.preferences(state.reducedMotion,state.night);refresh();save();};
  $('#setting-night').onchange=()=>toggleNight();
  $('.save-box').insertAdjacentHTML('beforeend',`<details class="text-backup"><summary>使用存档文字备份与恢复</summary><p>复制并保存下面的文字；换设备后粘贴到这里，再点击恢复。恢复将替换当前进度，建议先备份。</p><label class="sr-only" for="backup-text">存档文字</label><textarea id="backup-text" spellcheck="false"></textarea><div><button class="secondary-button" id="copy-backup">复制存档文字</button><button class="secondary-button" id="restore-backup">恢复这份存档</button></div></details>`);
  const backupText=$<HTMLTextAreaElement>('#backup-text');backupText.value=JSON.stringify(state);backupText.dataset.snapshot=backupText.value;
  $('#copy-backup').onclick=async()=>{const value=$<HTMLTextAreaElement>('#backup-text').value;try{await navigator.clipboard.writeText(value);toast('存档文字已复制，请保存到你喜欢的地方');}catch{$<HTMLTextAreaElement>('#backup-text').select();toast('已选中存档文字，请手动复制');}};
  $('#restore-backup').onclick=()=>void restoreSaveText($<HTMLTextAreaElement>('#backup-text').value);
  $('#export-save').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.href=url;a.download=`心动日常-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$<HTMLDetailsElement>('.text-backup').open=true;toast('已发起下载，也可以复制下方的存档文字');};
  $('#import-save').onchange=async()=>{const f=$<HTMLInputElement>('#import-save').files?.[0];if(!f)return;if(f.size>2000000){toast('存档文件过大，无法导入');return;}try{await restoreSaveText(await f.text());}catch{toast('无法读取存档文件');}};
}
async function restoreSaveText(text:string){if(chatPending){toast('等她回复这句话后，再恢复存档吧。');return;}try{if(text.length>2000000)throw new Error('存档文字过长');const imported=validateSave(JSON.parse(text));stopActivity();if(!await scene.setCharacter(imported.character,imported.wardrobes[imported.character]))throw new Error('存档中的角色加载失败，请重试。');state=imported;characterGroup=collectionFor(state.character,state.wardrobes[state.character]);refreshDay(state);scene.setLocation(state.scene);scene.preferences(state.reducedMotion,state.night);await ambience.setEnabled(state.sound);refresh();save();say(characters[state.character].greeting);closeModal();toast('欢迎回来，回忆都在这里');}catch(e){toast(e instanceof Error&&!(e instanceof SyntaxError)?e.message:'存档文字格式不正确，请完整复制后重试');}}
async function toggleSound(){try{await ambience.setEnabled(!state.sound);state.sound=ambience.enabled;save();refresh();toast(state.sound?'轻柔音乐已开启':'音乐已关闭');}catch{state.sound=false;toast('浏览器暂时无法播放声音');}}
function toggleNight(){state.night=!state.night;scene.preferences(state.reducedMotion,state.night);refresh();save();}
function claim(){if(claimDaily(state)){save();refresh();scene.burst();ambience.chime();toast('今日小愿望完成 · 心意 +25');if(modalType==='wishes')openModal('wishes');}else toast(state.daily.claimed?'今天的奖励已经收下，明天再一起创造回忆。':'完成三种不同活动，就能收下今天的心意。');}

document.addEventListener('click',event=>{
  const target=event.target as Element;
  const group=target.closest<HTMLElement>('[data-group]');if(group){characterGroup=group.dataset.group as CharacterCollection;refresh();if(modalType==='characters')openModal('characters');return;}
  if(target.closest('[data-show-cg]')){characterGroup='latest';openModal('characters');return;}
  const outfit=target.closest<HTMLElement>('[data-wardrobe]');if(outfit){void chooseWardrobe(outfit.dataset.wardrobe as Wardrobe);return;}
  const dance=target.closest<HTMLElement>('[data-dance]');if(dance){startAction(dance.dataset.dance as Action,dance.dataset.watch==='true');return;}
  const open=target.closest<HTMLElement>('[data-open]');if(open){openModal(open.dataset.open!);return;}
  const character=target.closest<HTMLElement>('[data-character]');if(character){void chooseCharacter(character.dataset.character as CharacterId,character.dataset.look as Wardrobe);return;}
  const destination=target.closest<HTMLElement>('[data-scene]');if(destination){chooseScene(destination.dataset.scene as SceneId);return;}
  const action=target.closest<HTMLElement>('[data-action]');if(action){startAction(action.dataset.action as Action);return;}
  const gift=target.closest<HTMLButtonElement>('[data-gift]');if(gift&&!gift.disabled){const id=gift.dataset.gift as GiftId;if(sendGift(state,id)){const fav=characters[state.character].favorite===id;say(fav?'你怎么知道这是我的最爱？这份心意，我会好好记住的。':'谢谢你。因为是你送的，所以格外喜欢。',fav?'好感 +12':'好感 +7');scene.burst();ambience.chime();save();refresh();closeModal();toast('心意已送达 · 好感增加');}else toast('心意暂时不够，先一起做点小事吧。');return;}
  const suggestion=target.closest<HTMLElement>('[data-suggestion]');if(suggestion){void submitChat(suggestion.dataset.suggestion!);return;}
  if(target.closest('.sound-button'))void toggleSound();
  if(target.closest('[data-claim]'))claim();
});
$('#close-modal').onclick=closeModal;dialog.addEventListener('cancel',()=>{modalType='';});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
$('#stop-watch').onclick=()=>{stopActivity();say('还想做些什么？我陪你。');};$('#light-button').onclick=toggleNight;$('#claim-reward').onclick=claim;$('#rhythm-tap').onclick=tapBeat;
document.addEventListener('keydown',event=>{if(event.code==='Space'&&activity&&isDance(activity.type)&&!dialog.open){event.preventDefault();tapBeat();}});
document.addEventListener('visibilitychange',()=>{void ambience.visibility(document.hidden);lastFrame=performance.now();});
window.addEventListener('beforeunload',()=>save());
document.querySelector('[data-nav="home"]')?.addEventListener('click',()=>{if(dialog.open)closeModal();$('#stage-shell').scrollIntoView({behavior:state.reducedMotion?'instant':'smooth',block:'center'});});
refresh();say(characters[state.character].greeting);save();
// Browsers require a user gesture before restoring sound from a previous visit.
if(state.sound){state.sound=false;refresh();}
