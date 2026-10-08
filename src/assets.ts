import classic from './generated/assets.json';
import cgData from './generated/cg.json';
import motionData from './generated/motion.json';
import {classicCharacterIds,cgCharacterIds,isDance} from './content';
import {characters} from './content';
import {DANCE_PLAYBACK_SPEED} from './rhythm';
import type {Action,CharacterId,Wardrobe} from './content';

export interface Frame {x:number;y:number;w:number;h:number;origin?:{x:number;y:number}}
export interface Sheet {url:string;width:number;height:number;frames:Frame[];referenceHeight?:number}
export interface Clip {sheet:string;frames:number[];fps:number;loop:boolean}
export interface Visual {sheets:Record<string,Sheet>;actions:Partial<Record<Action,Clip>>;master?:Sheet;avatar?:string;frameCount:number;variants?:Partial<Record<Wardrobe,Visual>>}
export const visuals={} as Record<CharacterId,Visual>;
for(const id of classicCharacterIds){const sheet=classic.characters[id];visuals[id]={sheets:{classic:{...sheet,referenceHeight:Math.max(...sheet.frames.slice(0,4).map(f=>f.h))}},actions:{idle:{sheet:'classic',frames:[0,0,0,1,2,2,3,3],fps:2,loop:true},walk:{sheet:'classic',frames:[4,5,6,7],fps:5.5,loop:true},dance:{sheet:'classic',frames:[8,9,10,11],fps:3.3,loop:true},sit:{sheet:'classic',frames:[12,13,14,15],fps:3.5,loop:false}},frameCount:16};}
function withExpandedDances(base:Visual,motion:Pick<Visual,'sheets'|'actions'>):Visual {
  const everydaySheets=Object.fromEntries(Object.entries(base.sheets).filter(([name])=>name!=='dances'));
  const sheets={...everydaySheets,...motion.sheets};
  return {...base,sheets,actions:{...base.actions,...motion.actions},frameCount:Object.values(sheets).reduce((count,sheet)=>count+sheet.frames.length,0)};
}
const motions=motionData.characters as Record<string,Record<Wardrobe,Pick<Visual,'sheets'|'actions'>>>;
for(const id of cgCharacterIds){
  const base=(cgData.characters as Record<string,Visual>)[id],expanded=withExpandedDances(base,motions[id].original);
  expanded.variants={...base.variants,low:withExpandedDances(base.variants!.low!,motions[id].low)};
  visuals[id]=expanded;
}
// Keep the game and artbook at the same half-speed baseline for every outfit.
for(const visual of Object.values(visuals))for(const variant of [visual,...Object.values(visual.variants??{})]){
  for(const action of Object.keys(variant.actions) as Action[]){
    const clip=variant.actions[action]!;
    if(isDance(action))variant.actions[action]={...clip,fps:clip.fps*DANCE_PLAYBACK_SPEED};
  }
}
export const cgFrameTotal=cgCharacterIds.reduce((total,id)=>total+visuals[id].frameCount+visuals[id].variants!.low!.frameCount,0);
export const activeFrameTotal=cgFrameTotal+classicCharacterIds.reduce((total,id)=>total+visuals[id].frameCount,0);
export const isCG=(id:CharacterId)=>cgCharacterIds.includes(id as typeof cgCharacterIds[number]);
export const visualFor=(id:CharacterId,wardrobe:Wardrobe='original')=>visuals[id].variants?.[wardrobe]??visuals[id];
export const actionsFor=(id:CharacterId)=>Object.keys(visuals[id].actions) as Action[];
export const textureKey=(id:CharacterId,sheet:string,wardrobe:Wardrobe='original')=>`${id}:${wardrobe}:${sheet}`;
export const getClip=(id:CharacterId,action:Action,wardrobe:Wardrobe='original')=>visualFor(id,wardrobe).actions[action]??visualFor(id,wardrobe).actions.idle!;
export function frameAt(id:CharacterId,action:Action,elapsed:number,wardrobe:Wardrobe='original'){const clip=getClip(id,action,wardrobe);let position=Math.floor(elapsed/1000*clip.fps);position=clip.loop?position%clip.frames.length:Math.min(position,clip.frames.length-1);return {clip,sheet:visualFor(id,wardrobe).sheets[clip.sheet],index:clip.frames[position],position};}
export function portraitHtml(id:CharacterId,cls='',wardrobe:Wardrobe='original'){
  const v=visualFor(id,wardrobe);if(v.avatar)return `<div class="portrait ${cls}" style="--person-color:${characters[id].color}"><img src="${v.avatar}" alt="${characters[id].name}头像" loading="lazy"></div>`;
  const sheet=Object.values(v.sheets)[0],f=sheet.frames[0];return `<div class="portrait ${cls}"><svg viewBox="${f.x-5} ${f.y-3} ${f.w+10} ${f.w+12}" role="img" aria-label="角色头像"><image href="${sheet.url}" width="${sheet.width}" height="${sheet.height}"/></svg></div>`;
}
export const danceActionsFor=(id:CharacterId)=>actionsFor(id).filter(isDance);
