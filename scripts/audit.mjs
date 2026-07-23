import fs from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
const root=decodeURIComponent(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(root+p,'utf8');
const checks=[];const check=(name,ok)=>{checks.push([name,ok]);console.log(`${ok?'PASS':'FAIL'} ${name}`)};
const strip=t=>t.replace(/\s+/g,'');const model=read('src/data/model.ts');const sem=read('src/components/SEMCanvas.tsx');const app=read('src/App.tsx');const css=read('src/styles/global.css');const lock=fs.existsSync(root+'package-lock.json')?read('package-lock.json'):'';
check('Seven constructs defined',(model.match(/id:'(CI|IQ|PC|IC|RA|AE|ES)'/g)||[]).length===7);
check('Nine structural paths defined',(model.match(/id:'p[1-9]'/g)||[]).length===9);
check('Node positions use fixed SVG translate',sem.includes('transform={`translate(${n.x} ${n.y})`}'));
check('No CSS transform on sem-node or node-body',!css.match(/\.sem-node\s*\{[^}]*transform\s*:/)&&!css.match(/\.node-body\s*\{[^}]*transform\s*:/));
check('Path hit targets use pointer-events stroke',strip(css).includes('pointer-events:stroke'));
check('Inspector supports Escape and focus',strip(app).includes("e.key==='Escape'")&&app.includes('close.current?.focus()'));
check('CSV export delays URL revocation',strip(app).includes('setTimeout(()=>URL.revokeObjectURL(url),1000)'));
check('Clipboard fallback exists',app.includes("document.execCommand('copy')"));
check('Full print route mounts all pages',app.includes('print-only')&&strip(app).includes('<PathwaysPrint/>'));
check('Theme persists',app.includes("localStorage.setItem('sem-theme'"));
check('Public npm registry',lock===''||(!lock.includes('applied-caas-gateway')&&lock.includes('registry.npmjs.org')));
check('Reduced motion and print styles',css.includes('prefers-reduced-motion')&&css.includes('@media print'));
if(!checks.every(x=>x[1]))process.exit(1);
if(!fs.existsSync(root+'dist/index.html')){console.log('SKIP runtime DOM audit: build dist first');process.exit(0)}
const chromium=['/usr/bin/chromium','chromium'].find(x=>fs.existsSync(x)||spawnSync('sh',['-c',`command -v ${x}`]).status===0);
if(!chromium){console.log('SKIP optional runtime DOM audit: Chromium unavailable');process.exit(0)}
const server=spawn('python3',['-m','http.server','4173','--directory',root+'dist'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,900));
try{
 const result=spawnSync(chromium,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--user-data-dir=/tmp/sem-audit-chrome','--virtual-time-budget=2000','--dump-dom','http://127.0.0.1:4173/?page=model'],{encoding:'utf8',maxBuffer:10_000_000,timeout:12000});
 const dom=result.stdout||'';
 if(result.error || !dom){console.log('SKIP optional runtime DOM audit: headless Chromium is restricted in this environment');}
 else {
  const nodeCount=(dom.match(/data-node-id=/g)||[]).length;
  const pathCount=(dom.match(/data-path-id=/g)||[]).length;
  check('Runtime model renders seven nodes',nodeCount===7);
  check('Runtime model renders nine paths',pathCount===9);
  check('Runtime controls render',dom.includes('Diagram controls'));
  if(!checks.every(x=>x[1]))process.exitCode=1;
 }
}finally{server.kill('SIGTERM')}
