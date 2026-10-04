import type { IncomingMessage, ServerResponse } from 'node:http';
import { characters, characterIds } from '../src/content.ts';
import type { CharacterId } from '../src/content.ts';

export interface AIConfig { AI_API_KEY?: string; AI_BASE_URL?: string; AI_MODEL?: string }
function json(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
export async function handleApi(req:IncomingMessage,res:ServerResponse,config:AIConfig):Promise<boolean>{
  const path=req.url?.split('?')[0];if(path!=='/api/chat'&&path!=='/api/status'&&path!=='/api/status.json')return false;
  if(path==='/api/status'||path==='/api/status.json'){json(res,200,{enabled:Boolean(config.AI_API_KEY&&config.AI_BASE_URL&&config.AI_MODEL)});return true;}
  if(req.method!=='POST'){json(res,405,{error:'Method not allowed'});return true;}
  // Reject cross-origin browser requests; secrets remain exclusively on the server.
  const origin=req.headers.origin;
  if(origin){try{if(new URL(origin).host!==req.headers.host){json(res,403,{error:'Origin not allowed'});return true;}}catch{json(res,403,{error:'Origin not allowed'});return true;}}
  if(!config.AI_API_KEY||!config.AI_BASE_URL||!config.AI_MODEL){json(res,503,{error:'Local story mode'});return true;}
  try{
    let raw='';for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>16000){json(res,413,{error:'Message too large'});return true;}}
    const body=JSON.parse(raw) as {character:CharacterId;messages:{from:string;text:string}[]};
    if(!characterIds.includes(body.character)||!Array.isArray(body.messages)||body.messages.length>12||body.messages.some(m=>!m||!['user','companion'].includes(m.from)||typeof m.text!=='string'||m.text.length>2000)){json(res,400,{error:'Invalid message'});return true;}
    const c=characters[body.character];
    const system=`你正在扮演生活陪伴游戏《心动日常》的虚构成年角色${c.name}，${c.age}岁，${c.style}。性格：${c.trait}。喜好：${c.likes}。用自然的简体中文，以温柔、尊重用户自主性的方式回应日常闲聊，通常1至3句，不要输出舞台标记或Markdown。始终知道自己是游戏中的AI角色，用户询问时如实说明。不要声称真实身体、现实世界行动或人类身份。不要求用户排他性依恋。`;
    const base=config.AI_BASE_URL.replace(/\/$/,'');const url=new URL(`${base}/chat/completions`);
    if(!['https:','http:'].includes(url.protocol))throw new Error('Invalid API URL');
    const upstream=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.AI_API_KEY}`},body:JSON.stringify({model:config.AI_MODEL,messages:[{role:'system',content:system},...body.messages.map(m=>({role:m.from==='user'?'user':'assistant',content:m.text}))],max_tokens:400,temperature:0.8}),signal:AbortSignal.timeout(15000)});
    if(!upstream.ok){json(res,502,{error:'AI service unavailable'});return true;}
    const data=await upstream.json() as {choices?:{message?:{content?:string}}[]};const reply=data.choices?.[0]?.message?.content;
    if(!reply||typeof reply!=='string')throw new Error('Empty response');json(res,200,{reply:reply.slice(0,2000)});
  }catch{json(res,502,{error:'AI service unavailable'});}return true;
}
