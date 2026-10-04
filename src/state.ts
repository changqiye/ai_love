import { characterIds, classicCharacterIds, cgCharacterIds, sceneIds, gifts, characters } from './content.ts';
import type { CharacterId, SceneId, GiftId, Wardrobe } from './content.ts';
export interface Memory { character: CharacterId; scene: SceneId; date: string }
export interface ChatLine { from: 'user' | 'companion'; text: string }
export interface Save {
  version: 1; character: CharacterId; scene: SceneId; hearts: number;
  affection: Record<CharacterId, number>; memories: Memory[];
  daily: { date: string; actions: string[]; claimed: boolean };
  chats: Record<CharacterId, ChatLine[]>; sound: boolean; reducedMotion: boolean; night: boolean;
  wardrobes:Record<CharacterId,Wardrobe>;
}
export function today(now = new Date()): string { return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
export const memoryTotal=characterIds.length*sceneIds.length;
export type RewardAction='walk'|'dance'|'sit'|'chat'|'wave'|'stretch'|'hair';
const allowedActivities=['walk','dance','sit','chat','gift','wave','stretch','hair'];
export function freshSave(): Save { return { version: 1, character: 'xinglan', scene: 'park', hearts: 60, affection: Object.fromEntries(characterIds.map(id=>[id,0])) as Save['affection'], memories: [], daily: { date: today(), actions: [], claimed: false }, chats: Object.fromEntries(characterIds.map(id=>[id,[] as ChatLine[]])) as Save['chats'], wardrobes:Object.fromEntries(characterIds.map(id=>[id,cgCharacterIds.includes(id as typeof cgCharacterIds[number])?'low':'original'])) as Save['wardrobes'], sound: false, reducedMotion: false, night: false }; }
export function validateSave(value: unknown): Save {
  if (!value || typeof value !== 'object') throw new Error('存档格式不正确');
  const s = value as Save;
  if (s.version !== 1 || !characterIds.includes(s.character) || !sceneIds.includes(s.scene)) throw new Error('存档版本或角色无效');
  if (!Number.isInteger(s.hearts) || s.hearts < 0 || s.hearts > 99999) throw new Error('心意数值无效');
  if (!s.affection || typeof s.affection!=='object' || classicCharacterIds.some(id=>!Object.hasOwn(s.affection,id))) throw new Error('好感数值无效');
  // Version 1 saves predate the CG cast. Add only missing new entries; reject corrupt supplied values.
  const affection={...s.affection};
  for(const id of cgCharacterIds)if(!Object.hasOwn(affection,id))affection[id]=0;
  if(characterIds.some(id=>!Number.isInteger(affection[id])||affection[id]<0||affection[id]>99999))throw new Error('好感数值无效');
  if (!Array.isArray(s.memories) || s.memories.length > memoryTotal || s.memories.some(m => !m || !characterIds.includes(m.character) || !sceneIds.includes(m.scene) || typeof m.date !== 'string' || m.date.length > 40)) throw new Error('回忆记录无效');
  if (new Set(s.memories.map(m => `${m.character}-${m.scene}`)).size !== s.memories.length) throw new Error('回忆记录重复');
  if (!s.daily || typeof s.daily.date !== 'string' || !Array.isArray(s.daily.actions) || s.daily.actions.some(a => !allowedActivities.includes(a)) || new Set(s.daily.actions).size !== s.daily.actions.length || typeof s.daily.claimed !== 'boolean') throw new Error('愿望记录无效');
  if(!s.chats||typeof s.chats!=='object'||classicCharacterIds.some(id=>!Object.hasOwn(s.chats,id)))throw new Error('聊天记录无效');
  const chats={...s.chats};
  for(const id of cgCharacterIds)if(!Object.hasOwn(chats,id))chats[id]=[];
  if (characterIds.some(id => !Array.isArray(chats[id]) || chats[id].length > 80 || chats[id].some(m => !m || !['user','companion'].includes(m.from) || typeof m.text !== 'string' || m.text.length > 2000))) throw new Error('聊天记录无效');
  if (typeof s.sound !== 'boolean' || typeof s.reducedMotion !== 'boolean' || typeof s.night !== 'boolean') throw new Error('偏好设置无效');
  const wardrobes=Object.fromEntries(characterIds.map(id=>[id,s.wardrobes?.[id]??'original'])) as Save['wardrobes'];
  if(characterIds.some(id=>!['original','low'].includes(wardrobes[id])||(classicCharacterIds.includes(id as typeof classicCharacterIds[number])&&wardrobes[id]!=='original')))throw new Error('服装记录无效');
  return { version: 1, character: s.character, scene: s.scene, hearts: s.hearts, affection: Object.fromEntries(characterIds.map(id=>[id,affection[id]])) as Save['affection'], memories: s.memories.map(m => ({ character:m.character,scene:m.scene,date:m.date })), daily: {...s.daily, actions:[...s.daily.actions]}, chats: Object.fromEntries(characterIds.map(id=>[id,chats[id].map(m=>({...m}))])) as Save['chats'], wardrobes, sound:s.sound, reducedMotion:s.reducedMotion, night:s.night };
}
export function refreshDay(s: Save): void { if (s.daily.date !== today()) s.daily = { date: today(), actions: [], claimed: false }; }
export function earnActivity(s: Save, action: RewardAction, bonus = 0): { hearts: number; memory: boolean } {
  refreshDay(s); const first = !s.daily.actions.includes(action); if (first) s.daily.actions.push(action);
  const amount = (first ? 8 : 2) + Math.min(12,Math.max(0, Math.floor(bonus)));
  s.hearts = Math.min(99999,s.hearts+amount); s.affection[s.character] = Math.min(99999,s.affection[s.character]+(first?5:2));
  const memory = !s.memories.some(m => m.character === s.character && m.scene === s.scene);
  if (memory) s.memories.push({character:s.character,scene:s.scene,date:new Date().toISOString()});
  return { hearts: amount, memory };
}
export function sendGift(s: Save, giftId: GiftId): boolean {
  const gift = gifts.find(g => g.id === giftId); if (!gift || s.hearts < gift.price) return false;
  s.hearts -= gift.price;
  s.affection[s.character] = Math.min(99999,s.affection[s.character]+(characters[s.character].favorite===gift.id?12:7));
  refreshDay(s); if (!s.daily.actions.includes('gift')) s.daily.actions.push('gift'); return true;
}
export function claimDaily(s: Save): boolean { refreshDay(s); if (s.daily.claimed || s.daily.actions.length < 3) return false; s.daily.claimed=true; s.hearts=Math.min(99999,s.hearts+25); return true; }
export function relationship(points: number): { level:number; title:string; progress:number } { const level=Math.min(5,Math.floor(points/40)+1);return {level,title:['初次心动','渐渐熟悉','默契升温','特别的你','心意相通'][level-1],progress:level===5?100:points%40/40*100}; }
const STORAGE_KEY='heartfelt-days-save-v1';
export function loadSave(): Save { try { const raw=localStorage.getItem(STORAGE_KEY); const s=raw?validateSave(JSON.parse(raw)):freshSave(); refreshDay(s); return s; } catch { return freshSave(); } }
export function persist(s: Save): boolean { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(s)); return true; } catch { return false; } }
