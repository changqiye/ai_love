export class Ambience {
  private context?: AudioContext; private timer?: ReturnType<typeof setInterval>; private step=0;
  enabled=false;
  async setEnabled(on:boolean) {
    this.enabled=on; if(this.timer) clearInterval(this.timer); this.timer=undefined;
    if(!on) { await this.context?.suspend(); return; }
    this.context ??= new AudioContext(); await this.context.resume(); this.playChord();
    this.timer=setInterval(()=>this.playChord(),3600);
  }
  private tone(freq:number,delay=0,volume=0.022,duration=3.8) {
    if(!this.context || this.context.state!=='running') return;
    const c=this.context, time=c.currentTime+delay, osc=c.createOscillator(), gain=c.createGain();
    osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+0.04);gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);
    osc.connect(gain);gain.connect(c.destination);osc.start(time);osc.stop(time+duration+0.1);
  }
  private playChord() { const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]]; chords[this.step++%4].forEach((n,i)=>this.tone(n,i*0.22)); }
  chime() {this.tone(523.25,0,0.04,0.5);this.tone(659.25,0.1,0.035,0.7);}
  beat(perfect=false) {this.tone(perfect?880:660,0,0.035,0.12);}
  async visibility(hidden:boolean) {if(!this.enabled) return; if(hidden) await this.context?.suspend();else await this.context?.resume();}
}
