import { defineConfig, loadEnv } from 'vite';
import { handleApi } from './server/ai';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'AI_');
  return {
    server:{port:5173,strictPort:true,watch:{usePolling:process.platform==='win32',interval:1000}},
    preview:{port:4173,strictPort:true},
    plugins:[{
      name:'private-ai-endpoint',
      configureServer(server){server.middlewares.use((req,res,next)=>{void handleApi(req,res,env).then(handled=>{if(!handled)next();}).catch(next);});},
      configurePreviewServer(server){server.middlewares.use((req,res,next)=>{void handleApi(req,res,env).then(handled=>{if(!handled)next();}).catch(next);});}
    }],
    build:{chunkSizeWarningLimit:1500,rollupOptions:{input:{game:'index.html',artbook:'artbook.html'},output:{manualChunks:{phaser:['phaser']}}}}
  };
});
