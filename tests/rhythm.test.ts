import {test} from 'node:test';
import assert from 'node:assert/strict';
import {judgeBeat,dancePlaybackRate} from '../src/rhythm.ts';
import {danceTracks} from '../src/content.ts';
test('rhythm scoring has explicit perfect, good, miss and duplicate windows',()=>{assert.equal(judgeBeat(700,new Set()).grade,'perfect');assert.equal(judgeBeat(850,new Set()).grade,'good');assert.equal(judgeBeat(1050,new Set()).grade,'miss');assert.equal(judgeBeat(700,new Set([1])).grade,'ignored');});
test('only the twelve playable beats can award points',()=>{assert.equal(judgeBeat(0,new Set()).grade,'ignored');assert.equal(judgeBeat(8400,new Set()).beat,12);assert.equal(judgeBeat(9100,new Set()).grade,'ignored');});
test('all six dance tempos and final beat limits use their own timing',()=>{for(const {beatMs:ms,beats} of Object.values(danceTracks)){assert.equal(judgeBeat(ms,new Set(),ms,beats).grade,'perfect');assert.equal(judgeBeat(ms*beats,new Set(),ms,beats).beat,beats);assert.equal(judgeBeat(ms*(beats+1),new Set(),ms,beats).grade,'ignored');assert.equal(judgeBeat(ms,new Set([1]),ms,beats).grade,'ignored');}});
test('all eighteen poses play across two beats instead of one pose per beat',()=>{
  for(const {beatMs} of Object.values(danceTracks))for(const frameCount of [4,6,18]){
    const sourceFps=7,rate=dancePlaybackRate(frameCount,beatMs,sourceFps);
    assert.ok(Math.abs(frameCount/(sourceFps*rate)*1000-beatMs*2)<.000001);
    const frameAfterOneBeat=Math.floor(beatMs/1000*sourceFps*rate+.000001);
    assert.equal(frameAfterOneBeat,frameCount/2);
  }
});
