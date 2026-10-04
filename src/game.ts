import Phaser from 'phaser';
import manifest from './generated/assets.json';
import { sceneIds } from './content';
import {visualFor,textureKey,getClip,isCG} from './assets';
import {dancePlaybackRate} from './rhythm';
import type { CharacterId, SceneId, Action, Wardrobe } from './content';

export class DailyScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Image;
  private actor!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private chair!: Phaser.GameObjects.Image;
  private branches: Phaser.GameObjects.Image[]=[];
  private particles: { shape:Phaser.GameObjects.Ellipse; speed:number; drift:number }[]=[];
  private shade!: Phaser.GameObjects.Rectangle;
  private glow!: Phaser.GameObjects.Rectangle;
  private character:CharacterId='xiaoman'; private location:SceneId='park'; private action:Action='idle';
  private targetX=0; private targetY=0; private shiftX=0; private shiftY=0; private elapsed=0;
  private reduced=false; private walking?:Phaser.Tweens.Tween; private ready=false;
  private baseY=568; private baseScale=1.28; private walkMax=295;
  private loadFailed=false;
  private wardrobe:Wardrobe='original';
  private loadedLooks:{id:CharacterId;wardrobe:Wardrobe}[]=[];
  constructor(private onReady:()=>void, private onTap:()=>void,private onFail:()=>void,initial:CharacterId,wardrobe:Wardrobe) {super('DailyScene');this.character=initial;this.wardrobe=wardrobe;}
  private queueCharacter(id:CharacterId,wardrobe:Wardrobe=this.wardrobe){for(const [name,sheet] of Object.entries(visualFor(id,wardrobe).sheets))if(!this.textures.exists(textureKey(id,name,wardrobe)))this.load.image(textureKey(id,name,wardrobe),sheet.url);}
  private hasCharacter(id:CharacterId,wardrobe:Wardrobe){return Object.keys(visualFor(id,wardrobe).sheets).every(name=>this.textures.exists(textureKey(id,name,wardrobe)));}
  private registerCharacter(id:CharacterId,wardrobe:Wardrobe=this.wardrobe){
    for(const [name,sheet] of Object.entries(visualFor(id,wardrobe).sheets)){const texture=this.textures.get(textureKey(id,name,wardrobe));sheet.frames.forEach((f,i)=>{
      if(!texture.has(String(i)))texture.add(String(i),0,f.x,f.y,f.w,f.h);
      const frame=texture.get(String(i));frame.customPivot=true;frame.pivotX=f.origin?.x??.5;frame.pivotY=f.origin?.y??1;
    });}
    for(const [action,clip] of Object.entries(visualFor(id,wardrobe).actions))if(!this.anims.exists(`${id}-${wardrobe}-${action}`))this.anims.create({key:`${id}-${wardrobe}-${action}`,frames:clip.frames.map(f=>({key:textureKey(id,clip.sheet,wardrobe),frame:String(f)})),frameRate:clip.fps,repeat:clip.loop?-1:0});
  }
  private rememberLook(id:CharacterId,wardrobe:Wardrobe){
    this.loadedLooks=this.loadedLooks.filter(look=>look.id!==id||look.wardrobe!==wardrobe);
    this.loadedLooks.push({id,wardrobe});
    // Keep the current look and its most recently used alternative on mobile.
    while(this.loadedLooks.length>2){const old=this.loadedLooks.shift()!;
      for(const action of Object.keys(visualFor(old.id,old.wardrobe).actions))this.anims.remove(`${old.id}-${old.wardrobe}-${action}`);
      for(const sheet of Object.keys(visualFor(old.id,old.wardrobe).sheets))this.textures.remove(textureKey(old.id,sheet,old.wardrobe));
    }
  }
  preload() {
    this.queueCharacter(this.character);
    sceneIds.forEach(id=>this.load.image(id,manifest.scenes[id].url));
    this.load.image('layers',manifest.layers.url);
    this.load.on('progress',(p:number)=>{const el=document.querySelector<HTMLElement>('#load-progress');if(el)el.style.width=`${Math.round(p*100)}%`;});
    this.load.on('loaderror',()=>{if(!this.ready){this.loadFailed=true;this.onFail();}});
  }
  create() {
    if(this.loadFailed)return;
    if(!this.hasCharacter(this.character,this.wardrobe)){this.loadFailed=true;this.onFail();return;}
    this.registerCharacter(this.character);
    manifest.layers.frames.forEach((f,i)=>{const b=f.bounds;this.textures.get('layers').add(String(i),0,f.x+b.x,f.y+b.y,b.w,b.h);});
    this.background=this.add.image(216,390,'park').setDisplaySize(552,828).setDepth(0);
    this.glow=this.add.rectangle(216,390,432,780,0xffe9b5,0.045).setDepth(1).setBlendMode(Phaser.BlendModes.SCREEN);
    this.shadow=this.add.ellipse(224,570,128,19,0x343c30,0.15).setDepth(2);
    this.chair=this.add.image(233,573,'layers','3').setOrigin(0.5,1).setDisplaySize(145,119).setDepth(3).setVisible(false);
    this.actor=this.add.sprite(222,568,textureKey(this.character,getClip(this.character,'idle',this.wardrobe).sheet,this.wardrobe),'0').setOrigin(0.5,1).setScale(1.28).setDepth(4);
    this.actor.setInteractive({useHandCursor:true,pixelPerfect:true,alphaTolerance:150});
    this.actor.on('pointerdown',()=>this.onTap());
    this.branches=[this.add.image(28,30,'layers','0').setDisplaySize(235,235).setAlpha(0.8).setDepth(7),this.add.image(425,492,'layers','1').setDisplaySize(145,208).setAlpha(0.72).setDepth(8)];
    for(let i=0;i<32;i++){
      const shape=this.add.ellipse(Math.random()*450,Math.random()*800,5+Math.random()*4,3,0xffe3df,0.65).setDepth(i%2?6:2);
      this.particles.push({shape,speed:14+Math.random()*21,drift:Math.random()*6.28});
    }
    this.shade=this.add.rectangle(216,390,432,780,0x17273f,0).setDepth(9);
    this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{this.targetX=(pointer.x-216)/216;this.targetY=(pointer.y-390)/390;});
    this.input.on('gameout',()=>{this.targetX=0;this.targetY=0;});
    this.ready=true;this.setAction('idle');this.setLocation(this.location);this.rememberLook(this.character,this.wardrobe);this.onReady();
  }
  private actorScale() {
    const sheet=visualFor(this.character,this.wardrobe).sheets[getClip(this.character,this.action,this.wardrobe).sheet];
    const standingHeight=sheet.referenceHeight??Math.max(...sheet.frames.map(frame=>frame.h));
    return this.baseScale*310/standingHeight;
  }
  async setCharacter(id:CharacterId,wardrobe:Wardrobe='original'):Promise<boolean> {
    if(!this.ready){this.character=id;this.wardrobe=wardrobe;return true;}
    const missing=!this.hasCharacter(id,wardrobe);
    if(missing){
      if(this.load.isLoading())return false;
      this.queueCharacter(id,wardrobe);
      const ok=await new Promise<boolean>(resolve=>{let failed=false;const error=()=>{failed=true;};this.load.on('loaderror',error);this.load.once('complete',()=>{this.load.off('loaderror',error);resolve(!failed);});this.load.start();});
      if(!ok||!this.hasCharacter(id,wardrobe))return false;
    }
    this.registerCharacter(id,wardrobe);this.character=id;this.wardrobe=wardrobe;this.setAction('idle');this.setLayout(this.baseY,this.baseScale,this.walkMax);this.rememberLook(id,wardrobe);this.burst(7);return true;
  }
  setLayout(floor:number,scale:number,right:number) {this.baseY=floor;this.baseScale=scale;this.walkMax=right;if(!this.ready)return;this.actor.setScale(this.actorScale());this.shadow.setY(floor+2);this.chair.setY(floor+5).setDisplaySize(145*scale/1.28,(isCG(this.character)?150:119)*scale/1.28);}
  setLocation(id:SceneId) {
    this.location=id;if(!this.ready)return;
    this.background.setTexture(id);this.setAction('idle');
    this.branches[0].setTexture('layers',id==='park'?'0':'1').setVisible(id==='park'||id==='living');
    this.branches[1].setTexture('layers',id==='park'?'1':'2').setPosition(id==='park'?425:420,id==='park'?492:590).setDisplaySize(id==='park'?145:150,id==='park'?208:170);
    this.particles.forEach(({shape},i)=>{shape.setFillStyle(id==='study'?0xc6dfe9:id==='park'?0xffdfdf:0xffefc8,id==='study'?0.25:0.65).setSize(id==='study'?1.2:id==='park'?6:3,id==='study'?17:3).setDepth(id==='study'?2:i%2?6:2);shape.x=id==='study'?260+Math.random()*172:Math.random()*450;shape.y=Math.random()*(id==='study'?460:800);});
    if(!this.reduced)this.cameras.main.fadeIn(450,247,243,233);
  }
  setAction(action:Action) {
    action=visualFor(this.character,this.wardrobe).actions[action]?action:'idle';this.action=action;if(!this.ready)return;
    this.walking?.stop();this.walking=undefined;this.actor.setFlipX(false);this.chair.setVisible(action==='sit');
    this.actor.setPosition(222,this.baseY).setScale(this.actorScale()).play(`${this.character}-${this.wardrobe}-${action}`,true);
    this.actor.anims.timeScale=1;
    if(action==='walk')this.walking=this.tweens.add({targets:this.actor,x:this.walkMax,duration:3600,yoyo:true,repeat:-1,ease:'Sine.easeInOut',onYoyo:()=>this.actor.setFlipX(true),onRepeat:()=>this.actor.setFlipX(false)});
  }
  setDanceTempo(beatMs:number){const clip=getClip(this.character,this.action,this.wardrobe);this.actor.anims.timeScale=dancePlaybackRate(clip.frames.length,beatMs,clip.fps);}
  preferences(reduced:boolean,night:boolean) {this.reduced=reduced;if(!this.ready)return;this.shade.setAlpha(night?0.31:0);this.glow.setAlpha(night?0.015:0.045);}
  burst(count=9) {
    if(!this.ready||this.reduced)return;
    for(let i=0;i<count;i++){
      const heart=this.add.text(this.actor.x+Phaser.Math.Between(-60,60),Phaser.Math.Between(280,460),'♥',{fontSize:`${Phaser.Math.Between(14,25)}px`,color:'#fff4e9'}).setDepth(10).setAlpha(0.9);
      this.tweens.add({targets:heart,y:heart.y-80,x:heart.x+Phaser.Math.Between(-30,30),alpha:0,duration:1200,delay:i*60,onComplete:()=>heart.destroy()});
    }
  }
  update(_time:number,delta:number) {
    if(!this.ready)return;
    this.elapsed+=Math.min(delta,50);const speed=Math.min(delta,50)/1000;
    this.shiftX=Phaser.Math.Linear(this.shiftX,this.reduced?0:this.targetX,0.035);this.shiftY=Phaser.Math.Linear(this.shiftY,this.reduced?0:this.targetY,0.035);
    this.background.setPosition(216-this.shiftX*7,390-this.shiftY*5);
    this.branches[0].setPosition(28-this.shiftX*24,30-this.shiftY*17);
    this.branches[1].setX((this.location==='park'?425:420)-this.shiftX*29);
    this.actor.y=this.baseY+(this.reduced||this.action==='walk'?0:Math.sin(this.elapsed/1150)*1.5);
    this.actor.x=Math.min(this.actor.x,this.walkMax);
    this.shadow.setX(this.actor.x).setScale(this.action==='sit'?1.1:1);
    this.particles.forEach(({shape,speed:fall,drift},i)=>{
      shape.visible=!this.reduced;
      if(this.reduced)return;
      shape.y+=(this.location==='study'?fall*8:fall)*speed;
      shape.x+=Math.sin(this.elapsed/2200+drift)*(this.location==='study'?4:12)*speed;
      if(this.location!=='study')shape.rotation+=speed*(i%2?0.4:-0.35);
      else shape.rotation=0.12;
      if(shape.y>(this.location==='study'?460:800)){shape.y=-20;shape.x=this.location==='study'?260+Math.random()*172:Math.random()*450;}
    });
  }
}
export function createGame(parent:HTMLElement,onReady:()=>void,onTap:()=>void,onFail:()=>void,initial:CharacterId='xiaoman',wardrobe:Wardrobe='original') {
  const scene=new DailyScene(onReady,onTap,onFail,initial,wardrobe);
  const game=new Phaser.Game({type:Phaser.AUTO,parent,width:432,height:780,transparent:false,backgroundColor:'#e6ded0',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},loader:{imageLoadType:'HTMLImageElement'},scene,render:{antialias:true,pixelArt:false},fps:{target:60},audio:{noAudio:true},banner:false});
  return {game,scene};
}
