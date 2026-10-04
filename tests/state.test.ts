import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshSave,earnActivity,sendGift,claimDaily,validateSave,refreshDay,relationship,today,memoryTotal} from '../src/state.ts';
import {characterIds,classicCharacterIds,cgCharacterIds,sceneIds,characters} from '../src/content.ts';

test('activities award hearts and one unique memory per character and location',()=>{const s=freshSave();s.character='xiaoman';assert.deepEqual(earnActivity(s,'walk'),{hearts:8,memory:true});assert.deepEqual(earnActivity(s,'walk'),{hearts:2,memory:false});assert.equal(s.memories.length,1);s.character='zhiyao';earnActivity(s,'sit');s.scene='living';earnActivity(s,'sit');assert.equal(s.memories.length,3);assert.equal(s.affection.xiaoman,7);assert.equal(s.affection.zhiyao,7);});
test('insufficient currency never deducts money or raises affection',()=>{const s=freshSave();s.hearts=4;const before=JSON.stringify(s);assert.equal(sendGift(s,'cake'),false);assert.equal(JSON.stringify(s),before);});
test('favorite gifts grant the larger affection reward',()=>{const s=freshSave();s.character='xiaoman';assert.ok(sendGift(s,'cake'));assert.equal(s.hearts,42);assert.equal(s.affection.xiaoman,12);assert.ok(sendGift(s,'coffee'));assert.equal(s.affection.xiaoman,19);assert.deepEqual(s.daily.actions,['gift']);});
test('daily bonus can only be claimed once after three different activities',()=>{const s=freshSave();assert.equal(claimDaily(s),false);earnActivity(s,'walk');earnActivity(s,'walk');assert.equal(claimDaily(s),false);earnActivity(s,'sit');earnActivity(s,'dance');const amount=s.hearts;assert.equal(claimDaily(s),true);assert.equal(s.hearts,amount+25);assert.equal(claimDaily(s),false);assert.equal(s.hearts,amount+25);});
test('a new calendar day resets only daily tasks',()=>{const s=freshSave();earnActivity(s,'walk');s.daily={date:'2000-01-01',actions:['walk'],claimed:true};const hearts=s.hearts;refreshDay(s);assert.deepEqual(s.daily,{date:today(),actions:[],claimed:false});assert.equal(s.hearts,hearts);assert.equal(s.memories.length,1);});
test('all thirty-six memories are independently collectible',()=>{const s=freshSave();for(const c of characterIds)for(const scene of sceneIds){s.character=c;s.scene=scene;earnActivity(s,'walk');}assert.equal(s.memories.length,memoryTotal);assert.equal(validateSave(s).memories.length,memoryTotal);});
test('import rejects corrupted, duplicate, negative and oversized values',()=>{const s=freshSave();assert.deepEqual(validateSave(s),s);for(const bad of [null,{}, {...s,version:9},{...s,hearts:-1},{...s,affection:{}},{...s,memories:[{character:'unknown',scene:'park',date:''}]},{...s,chats:{xiaoman:[],zhiyao:[],yuqing:[{from:'user',text:'x'.repeat(2001)}]}}])assert.throws(()=>validateSave(bad));earnActivity(s,'walk');s.memories.push(s.memories[0]);assert.throws(()=>validateSave(s));});
test('relationship caps at level five with valid progress',()=>{assert.equal(relationship(0).level,1);assert.equal(relationship(40).level,2);assert.equal(relationship(9999).level,5);assert.equal(relationship(9999).progress,100);});
test('old three-character saves migrate without losing progress or conversations',()=>{
  const s=freshSave();s.character='zhiyao';s.hearts=173;s.affection.zhiyao=89;s.chats.zhiyao=[{from:'user',text:'记得我吗？'}];earnActivity(s,'sit');
  const old={...s,affection:Object.fromEntries(classicCharacterIds.map(id=>[id,s.affection[id]])),chats:Object.fromEntries(classicCharacterIds.map(id=>[id,s.chats[id]]))};
  delete (old as Record<string,unknown>).wardrobes;
  const migrated=validateSave(old);assert.equal(migrated.hearts,s.hearts);assert.equal(migrated.affection.zhiyao,s.affection.zhiyao);assert.deepEqual(migrated.chats.zhiyao,s.chats.zhiyao);assert.deepEqual(migrated.memories,s.memories);
  for(const id of cgCharacterIds){assert.equal(migrated.affection[id],0);assert.deepEqual(migrated.chats[id],[]);assert.equal(migrated.wardrobes[id],'original');}
});
test('alternate wardrobe survives export and import while corrupted choices are rejected',()=>{
 const s=freshSave();s.wardrobes.nanzhi='low';assert.equal(validateSave(JSON.parse(JSON.stringify(s))).wardrobes.nanzhi,'low');
 assert.throws(()=>validateSave({...s,wardrobes:{...s.wardrobes,reina:'unknown'}}));assert.throws(()=>validateSave({...s,wardrobes:{...s.wardrobes,xiaoman:'low'}}));
});
test('every new character receives their own favorite gift reward',()=>{for(const id of cgCharacterIds){const s=freshSave();s.character=id;assert.ok(sendGift(s,characters[id].favorite));assert.equal(s.affection[id],12);assert.equal(s.affection.xiaoman,0);}});
test('new gestures contribute distinct daily wishes and do not duplicate memories',()=>{const s=freshSave();for(const action of ['wave','stretch','hair'] as const)earnActivity(s,action);assert.equal(s.memories.length,1);assert.equal(claimDaily(s),true);});
test('supplied corrupt new-character progress is rejected instead of silently reset',()=>{const s=freshSave();assert.throws(()=>validateSave({...s,affection:{...s.affection,selene:-1}}));assert.throws(()=>validateSave({...s,chats:{...s.chats,xinglan:'bad'}}));});
