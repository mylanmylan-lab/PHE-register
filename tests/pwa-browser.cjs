const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
(async()=>{
 let version=1;const root=path.resolve(__dirname,'../dist'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'phe-pwa-'));
 const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://localhost').pathname.replace(/^\/PHE-register\//,'')||'index.html';const file=path.join(root,rel);try{let data=fs.readFileSync(file);if(rel==='sw.js')data=Buffer.from(data.toString().replace(/phe-shell-([a-z0-9]+)/,'phe-shell-test'+version));res.writeHead(200,{'Content-Type':rel.endsWith('.js')?'application/javascript':rel.endsWith('.css')?'text/css':rel.endsWith('.png')?'image/png':rel.endsWith('.webmanifest')?'application/manifest+json':'text/html','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/PHE-register/`;
 const options={headless:true,viewport:{width:390,height:844},...(process.env.PHE_CHROMIUM?{executablePath:process.env.PHE_CHROMIUM}:{}),args:['--no-sandbox']};let context;
 try{
  context=await chromium.launchPersistentContext(profile,options);let p=await context.newPage();await p.goto(url);await p.waitForSelector('.nav');await p.waitForFunction(()=>navigator.serviceWorker.controller);
  const manifest=await p.evaluate(async()=>fetch('manifest.webmanifest').then(r=>r.json()));assert.equal(manifest.display,'standalone');assert.equal(new URL(manifest.start_url,url).href,url);assert.equal(manifest.scope,'./');
  const original=await p.evaluate(async()=>{const s=new PHEStore.LocalStore();let d=await s.init();d=await s.command({op:'lesson.create',id:'pwa-lesson',classId:'demo-7a',expectedClass:1,date:'2026-11-26',topic:'Offline test'});d=await s.command({op:'record.set',lessonId:'pwa-lesson',studentId:'demo-1',expected:1,status:'A'});return PHE.backup(d);});
  await context.close();context=await chromium.launchPersistentContext(profile,options);await context.setOffline(true);p=await context.newPage();await p.goto(url);await p.waitForSelector('.nav');
  const restored=await p.evaluate(async()=>{const s=new PHEStore.LocalStore();return PHE.backup(await s.init());});assert.deepEqual(restored,original);
  await p.locator('.nav [data-view=data]').click();const download=p.waitForEvent('download');await p.locator('[data-action=backup]').click();const file=path.join(profile,'backup.json');await(await download).saveAs(file);assert.deepEqual(JSON.parse(fs.readFileSync(file)).events,original.events);
  await p.locator('#import-file').setInputFiles(file);await p.waitForSelector('[data-action=restore]');await p.locator('[data-action=restore]').click();await p.waitForFunction(()=>document.querySelector('.save').textContent.includes('Záloha obnovená'));
  console.log('PASS Offline po ukončení prehliadača: aplikácia, údaje, export a potvrdená obnova zálohy.');
  await context.setOffline(false);await p.locator('.nav [data-view=classes]').click();await p.locator('#new-class [name=name]').fill('Rozpracovaný text');version=2;
  await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();});await p.waitForFunction(async()=>(await navigator.serviceWorker.getRegistration()).waiting);
  assert.equal(await p.locator('#new-class [name=name]').inputValue(),'Rozpracovaný text');assert.ok(await p.evaluate(async()=>(await caches.keys()).includes('phe-shell-test1')));
  await p.waitForFunction(()=>document.querySelector('.pwa-status').textContent.includes('Nová verzia'));
  console.log('PASS Aktualizácia čaká a zachová rozpracovaný formulár aj pôvodnú cache.');
  for(const page of context.pages())await page.close();p=await context.newPage();await p.goto(url);await p.waitForSelector('.nav');await p.waitForFunction(async()=>(await caches.keys()).includes('phe-shell-test2')&&!(await caches.keys()).includes('phe-shell-test1'));
  const updated=await p.evaluate(async()=>{const s=new PHEStore.LocalStore();return PHE.backup(await s.init());});assert.deepEqual(updated.events,original.events);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('PASS Nová verzia po zatvorení okien zachová IndexedDB; rozhranie 390 px bez pretečenia.');
 }finally{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
