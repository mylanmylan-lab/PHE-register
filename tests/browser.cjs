/* Optional browser QA: npm install --no-save playwright, then npx playwright install chromium.
   Start npm start in another terminal. No runtime dependency is needed by the app. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'artifacts');fs.mkdirSync(out,{recursive:true});
const logs=[];const pass=s=>{logs.push('PASS '+s);console.log('PASS '+s);};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PHE_CHROMIUM?{executablePath:process.env.PHE_CHROMIUM}:{}),args:['--no-sandbox']});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1100},locale:'sk-SK',timezoneId:'Europe/Bratislava'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PHE_TEST_URL||'http://127.0.0.1:4173');
  await page.getByRole('button',{name:'＋ Nová hodina',exact:true}).click();
  await page.waitForSelector('.student-toggle');assert.equal(await page.locator('.student-toggle').count(),20);assert.equal(await page.locator('.student-toggle .mark.ok').count(),20);pass('Nová hodina a 20 predvolených značiek ✓');
  async function set(id,status){await page.locator(`[data-student="${id}"]`).click();await page.locator(`[data-pupil="${id}"][data-mark="${status}"]`).click();await page.waitForFunction(()=>!document.querySelector('.student.open'));}
  await set('demo-1','A');assert.equal(await page.locator('.alert-banner').count(),0);await page.reload();await page.waitForSelector('[data-student="demo-1"] .kit');pass('A bez prípadu, automatické zbalenie a uloženie po obnove');
  await set('demo-2','!');await page.waitForSelector('.alert-banner');await page.locator('.nav [data-view=cases]').click();assert.equal(await page.locator('.open-case').count(),1);await page.locator('[data-resolve=Ep]').click();await page.waitForFunction(()=>!document.querySelector('.open-case'));pass('! vytvorí prípad; Ep ho vyrieši');
  await page.locator('.nav [data-view=lesson]').click();await set('demo-3','Ed');await set('demo-4','–');await set('demo-12','!');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  const firstLesson=await page.locator('#lesson-select').inputValue();await page.locator('[data-action=new-lesson]').click();await page.waitForFunction(()=>document.querySelectorAll('.student-toggle .mark.ok').length===20);assert.notEqual(await page.locator('#lesson-select').inputValue(),firstLesson);assert.equal(await page.locator('#lesson-select option').count(),3);pass('Dve samostatné hodiny v jeden deň');
  await page.locator('#lesson-select').selectOption(firstLesson);await page.locator('#lesson-topic').fill('Loptové hry & koordinácia');await page.locator('#lesson-topic').press('Tab');await page.waitForFunction(()=>document.querySelector('.save').textContent.includes('Uložené'));await page.locator('[data-action=finish]').click();await page.waitForSelector('button:has-text("Znovu otvoriť")');assert.equal(await page.locator('.alert-banner').count(),1);await page.locator('.nav [data-view=cases]').click();await page.locator('[data-resolve=without]').click();await page.waitForFunction(()=>!document.querySelector('.open-case'));pass('Ukončenie ponechá prípad; dodatočné uzavretie bez ospravedlnenia');
  await page.locator('.nav [data-view=lesson]').click();await page.locator('[data-action=finish]').click();await page.waitForSelector('button:has-text("Ukončiť hodinu")');
  const second=await context.newPage();await second.goto(process.env.PHE_TEST_URL||'http://127.0.0.1:4173');await second.waitForSelector('.nav');
  const run=(p,status,pupil='demo-5')=>p.evaluate(async({firstLesson,status,pupil})=>{const s=new PHEStore.LocalStore();await s.init();try{await s.command({op:'record.set',lessonId:firstLesson,studentId:pupil,expected:1,status});return 'ok';}catch(e){return e.code;}},{firstLesson,status,pupil});
  const same=await Promise.all([run(page,'A'),run(second,'Ed')]);assert.deepEqual(same.sort(),['CONFLICT','ok']);
  const different=await Promise.all([run(page,'A','demo-6'),run(second,'Ep','demo-7')]);assert.deepEqual(different,['ok','ok']);pass('Skutočné IndexedDB transakcie: konflikt toho istého žiaka a oba zápisy rôznych žiakov');
  await second.close();await page.locator('[data-action=refresh]').click();
  await page.locator('.nav [data-view=matrix]').click();
  for(const [action,file] of [['csv','prehlad.csv'],['xlsx','prehlad.xlsx']]){const wait=page.waitForEvent('download');await page.locator(`[data-action=${action}]`).click();await (await wait).saveAs(path.join(out,file));}
  await page.evaluate(()=>window.print=()=>{});await page.locator('[data-action=print]').click();await page.pdf({path:path.join(out,'prehlad.pdf'),preferCSSPageSize:true,printBackground:true});pass('CSV, XLSX a tlačový PDF export vytvorili súbory');
  await page.locator('.nav [data-view=data]').click();const download=page.waitForEvent('download');await page.locator('[data-action=backup]').click();await(await download).saveAs(path.join(out,'zaloha.json'));
  const before=await page.evaluate(async()=>{const s=new PHEStore.LocalStore();await s.init();return s.read();});
  await page.locator('#import-file').setInputFiles(path.join(out,'zaloha.json'));await page.locator('[data-action=restore]').click();await page.waitForFunction(()=>document.querySelector('.save').textContent.includes('Záloha obnovená'));const after=await page.evaluate(async()=>{const s=new PHEStore.LocalStore();await s.init();return s.read();});assert.deepEqual(after.events,before.events);assert.notEqual(after.storageEpoch,before.storageEpoch);pass('Úplná záloha a obnova cez používateľské rozhranie');
  const restoredConflict=await page.evaluate(async()=>{const stale=new PHEStore.LocalStore(),restorer=new PHEStore.LocalStore();await stale.init();const s=await restorer.init();await restorer.restore(PHE.backup(s),s.revision);try{await stale.command({op:'class.update',id:s.classes[0].id,expected:s.classes[0].version,name:'Zastaraná úprava',students:s.classes[0].students});return 'wrong';}catch(e){return e.code;}});assert.equal(restoredConflict,'CONFLICT');pass('Obnova v inej karte zneplatní aj staré záznamy s rovnakou verziou');await page.locator('[data-action=refresh]').click();
  await page.locator('.nav [data-view=classes]').click();await page.locator('#new-class input').fill('8. B');await page.locator('#new-class button').click();await page.waitForFunction(()=>document.querySelector('#class-form [name=className]').value==='8. B');await page.locator('[data-action=add-student]').click();await page.locator('[name=group]').selectOption('girls');await page.locator('[name=firstName]').fill('Fiktívna');await page.locator('[name=lastName]').fill('Žiačka');await page.locator('[name=lastName]').press('Tab');await page.waitForFunction(()=>document.querySelector('.save').textContent.includes('Uložené'));await page.locator('.nav [data-view=lesson]').click();await page.locator('[data-action=new-lesson]').click();await page.waitForFunction(()=>document.querySelectorAll('.student-toggle').length===1);pass('Vytvorenie triedy, pridanie žiaka a samostatná evidencia');
  await page.locator('#class-select').selectOption('demo-7a');await page.locator('#lesson-select').selectOption(firstLesson);await set('demo-13','!');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('[data-student=demo-1]').click();assert.ok(await page.locator('[data-mark=A]').evaluate(el=>el.getBoundingClientRect().height>=44));await page.screenshot({path:path.join(out,'mobile-options.png'),fullPage:true});pass('Mobilná šírka 390 px bez pretečenia a dotykové voľby aspoň 44 px');
  for(const width of [320,375,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow at '+width);}pass('Responzívne rozhranie 320, 375 a 430 px');
  assert.deepEqual(errors,[]);pass('Bez JavaScript chýb počas scenárov');
  await context.close();
  const fileContext=await browser.newContext(),filePage=await fileContext.newPage();
  try {
   await filePage.goto(require('node:url').pathToFileURL(path.resolve(__dirname,'../PHE-Register.html')).href);await filePage.locator('[data-action=new-lesson]').click();await filePage.waitForSelector('.student-toggle');assert.equal(await filePage.locator('.student-toggle').count(),20);await filePage.reload();await filePage.waitForSelector('.student-toggle');assert.equal(await filePage.locator('.student-toggle').count(),20);pass('Samostatný HTML súbor: otvorenie cez file:// a zachovanie údajov v Chromium');
  } catch(e) {
   if(!e.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR'))throw e;
   const msg='SKIP Samostatný HTML cez file://: politika testovacieho prehliadača ERR_BLOCKED_BY_ADMINISTRATOR; tento režim nebol overený.';logs.push(msg);console.log(msg);
  } finally {await fileContext.close();}
 } finally {await browser.close();fs.writeFileSync(path.join(out,'browser-results.txt'),logs.join('\n')+'\n');}
})().catch(e=>{console.error(e);process.exitCode=1;});
