import sharp from 'sharp';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {inspectAtlas} from './atlas-analysis.mjs';
const plan=JSON.parse(await readFile('docs/MOTION_V3_PLAN.json','utf8'));
const partial=process.argv.includes('--partial'),missing=[],errors=[];
const report={version:3,checkedAt:new Date().toISOString(),assetCount:0,frameCount:0,characters:{},transfer:{sourceBytes:0,runtimeBytes:0},missing,errors};
for(const id of plan.characters){report.characters[id]={};for(const wardrobe of plan.wardrobes){const entry={sheets:{},actions:{},frameCount:0};report.characters[id][wardrobe]=entry;
  for(const routine of plan.routines){
    const file=`public/assets/cg/${id}/${wardrobe==='low'?'low/':''}motion-v3/${routine.action}.png`,webp=file.replace(/\.png$/,'.webp');
    let source;try{source=await stat(file);}catch(e){if(e.code==='ENOENT'){missing.push(file);continue;}throw e;}
    try{
      const sheet=await inspectAtlas(file,plan.framesPerRoutine,plan.columns,{anchors:true});
      const packed=await stat(webp).catch(()=>null);if(!packed||packed.mtimeMs<source.mtimeMs)await sharp(file).webp({lossless:true,effort:6}).toFile(webp);
      const sourceAlpha=await sharp(file).extractChannel('alpha').raw().toBuffer(),packedAlpha=await sharp(webp).extractChannel('alpha').raw().toBuffer();
      if(!sourceAlpha.equals(packedAlpha))throw new Error(`${file}: alpha changed in runtime encoding`);
      sheet.url='/'+webp.replace(/^public\//,'');entry.sheets[routine.action]=sheet;
      entry.actions[routine.action]={sheet:routine.action,frames:Array.from({length:plan.framesPerRoutine},(_,i)=>i),fps:plan.framesPerRoutine*1000/(routine.beatMs*plan.cycleBeats),loop:true};
      entry.frameCount+=plan.framesPerRoutine;report.frameCount+=plan.framesPerRoutine;report.assetCount++;report.transfer.sourceBytes+=source.size;report.transfer.runtimeBytes+=(await stat(webp)).size;
    }catch(error){errors.push(error.message);console.error(error.message);}
  }
}}
report.complete=missing.length===0&&errors.length===0;
await writeFile('docs/MOTION_V3_REPORT.json',JSON.stringify(report,null,2));
if(report.complete)await writeFile('src/generated/motion.json',JSON.stringify(report,null,2));
console.log(`${report.assetCount}/${plan.assetCount} atlases, ${report.frameCount} isolated dance frames, ${missing.length} missing, ${errors.length} errors.`);
if(errors.length||(!partial&&missing.length))process.exitCode=1;
