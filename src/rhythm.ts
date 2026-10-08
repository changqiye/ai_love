export const DANCE_PLAYBACK_SPEED=0.5;

// Play the original two-beat choreography at half speed without changing scoring timing.
export function dancePlaybackRate(frameCount:number,beatMs:number,sourceFps:number,cycleBeats=2):number {
  return DANCE_PLAYBACK_SPEED*frameCount*1000/(beatMs*cycleBeats*sourceFps);
}

export function judgeBeat(elapsed:number,hitBeats:ReadonlySet<number>,beatMs=700,beats=12):{beat:number;grade:'perfect'|'good'|'miss'|'ignored'} {
  const beat=Math.round(elapsed/beatMs),distance=Math.abs(elapsed-beat*beatMs);
  if(beat<1||beat>beats||hitBeats.has(beat))return {beat,grade:'ignored'};
  return {beat,grade:distance<=95?'perfect':distance<=190?'good':'miss'};
}
