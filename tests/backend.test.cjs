/* Tests the real Code.gs in a sandbox with explicit fake Google services.
 * These are contract tests, NOT proof of Workspace authentication or Sheets availability. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function server(options={}) {
 let active=options.active===undefined?'teacher@school.example':options.active,effective=options.effective===undefined?active:options.effective;
 let rows=[],exists=false,lockHeld=false,flushFail=false,writes=0;
 const props={SPREADSHEET_ID:'fake-sheet',WORKSPACE_DOMAIN:'school.example',ALLOWED_TEACHERS:'teacher@school.example,other@school.example',ADMIN_EMAILS:'teacher@school.example',...options.props};
 const sh={getLastRow:()=>rows.length,setFrozenRows:()=>{},getRange:(r,c,n,m)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),setValues:values=>{writes++;values.forEach((row,i)=>{rows[r-1+i]??=[];row.forEach((v,j)=>rows[r-1+i][c-1+j]=v);});}})};
 const context={console,Intl,Set,Map,Date,JSON,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},Session:{getActiveUser:()=>({getEmail:()=>active}),getEffectiveUser:()=>({getEmail:()=>effective})},LockService:{getScriptLock:()=>({tryLock:()=>{if(options.busy||lockHeld)return false;lockHeld=true;return true;},releaseLock:()=>lockHeld=false})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>exists?sh:null,insertSheet:()=>{exists=true;return sh;}}),flush:()=>{if(flushFail){flushFail=false;throw new Error('Ambiguous transport failure');}}},Utilities:{getUuid:()=> 'demo-server-seed'},HtmlService:{createHtmlOutputFromFile:()=>({setTitle(){return this;},addMetaTag(){return this;}}),createHtmlOutput:s=>s}};
 vm.createContext(context);for(const file of ['web/domain.js','google-apps-script/Code.gs'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',file),'utf8'),context);
 const call=r=>JSON.parse(JSON.stringify(context.api(r)));
 return {context,call,init:()=>context.initialize_(),seed:()=>context.seedDemo_(),rows,identity:(a,e=a)=>{active=a;effective=e;},failFlush:()=>flushFail=true,get writes(){return writes;},get locked(){return lockHeld;}};
}
function setup(){const s=server();s.init();s.seed();assert.equal(s.call({action:'command',requestId:'lesson-request',command:{op:'lesson.create',id:'lesson-1',classId:'demo-7a',expectedClass:1,date:'2026-10-23',topic:''}}).ok,true);return s;}
function set(s,id,pupil,status,expected=1){return s.call({action:'command',requestId:id,command:{op:'record.set',lessonId:'lesson-1',studentId:pupil,expected,status}});}
test('Backend: prázdna, cudzia a nepovolená identita nemôže čítať ani zapisovať',()=>{for(const active of ['','intruder@school.example','teacher@outside.example']){const s=server({active});assert.equal(s.call({action:'read'}).code,'FORBIDDEN');assert.equal(set(s,'r','demo-1','A').code,'FORBIDDEN');assert.equal(s.writes,0);}});
test('Backend: nasadenie ako vlastník sa pre iného učiteľa odmietne',()=>{const s=server({active:'other@school.example',effective:'teacher@school.example'});assert.equal(s.call({action:'read'}).code,'FORBIDDEN');});
test('Backend: chýbajúca konfigurácia zlyhá bezpečne',()=>{const s=server({props:{WORKSPACE_DOMAIN:''}});assert.equal(s.call({action:'read'}).code,'CONFIG');});
test('Backend: inicializácia neprepíše údaje a vyžaduje správcu',()=>{const s=server();s.init();assert.throws(()=>s.init());s.identity('other@school.example');assert.throws(()=>s.context.seedDemo_());});
test('Backend: server určuje autora a čas; nepovolí podvrhnuté polia',()=>{const s=setup();const before=s.rows.length;assert.equal(s.call({action:'command',requestId:'spoof',actor:'admin@school.example',command:{}}).code,'VALIDATION');assert.equal(s.rows.length,before);const r=set(s,'safe','demo-1','A');assert.equal(r.ok,true);assert.equal(r.state.events.at(-1).actor,'teacher@school.example');assert.ok(!isNaN(Date.parse(r.state.events.at(-1).at)));assert.equal(r.state.cases.length,0);});
test('Backend: kolidujúce zápisy sú odmietnuté a rozdielne záznamy zachované',()=>{const s=setup();assert.equal(set(s,'one','demo-1','A').ok,true);s.identity('other@school.example');assert.equal(set(s,'two','demo-1','Ed').code,'CONFLICT');assert.equal(set(s,'three','demo-2','Ep').ok,true);const r=s.call({action:'read'});assert.equal(r.state.records[0].status,'A');assert.equal(r.state.records[1].status,'Ep');assert.equal(s.locked,false);});
test('Backend: zlyhanie po zápise a opakovanie ID nevytvorí duplicitnú udalosť',()=>{const s=setup();s.failFlush();assert.equal(set(s,'retry','demo-1','!').ok,false);const count=s.rows.length;const r=set(s,'retry','demo-1','!');assert.equal(r.ok,true);assert.equal(s.rows.length,count);assert.equal(r.state.cases.length,1);});
test('Backend: ! → Ed a história sú uložené v jednom event logu',()=>{const s=setup();set(s,'open','demo-1','!');const r=set(s,'resolve','demo-1','Ed',2);assert.equal(r.ok,true);assert.equal(r.state.cases[0].resolution,'Ed');assert.equal(r.state.cases[0].originalStatus,'!');assert.equal(s.rows.length,r.state.events.length+1);});
test('Backend: neplatná značka, dátum a neznáma operácia nič nezapíšu',()=>{const s=setup(),before=s.rows.length;assert.equal(set(s,'bad','demo-1','E').code,'VALIDATION');assert.equal(s.call({action:'command',requestId:'date',command:{op:'lesson.update',id:'lesson-1',expected:1,date:'2026-02-30',topic:'',finished:false}}).code,'VALIDATION');assert.equal(s.call({action:'delete'}).code,'VALIDATION');assert.equal(s.rows.length,before);});
test('Backend: poškodená história blokuje zápisy; zámok sa uvoľní',()=>{const s=setup();s.rows[1][1]='broken';assert.equal(s.call({action:'read'}).code,'CORRUPT');assert.equal(set(s,'blocked','demo-1','A').code,'CORRUPT');assert.equal(s.locked,false);});
test('Backend: vyčerpaný zámok vráti BUSY bez zápisu',()=>{const s=server({busy:true});assert.equal(s.call({action:'read'}).code,'BUSY');assert.equal(s.writes,0);});
test('Backend: generovaný nástroj obnovy zachová celý obsah a odmietne neprázdny cieľ',()=>{
 const os=require('node:os'),{spawnSync}=require('node:child_process'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'phe-restore-'));
 try {
  const original=setup();set(original,'open-restore','demo-1','!');set(original,'excuse-restore','demo-1','Ep',2);
  const backup={format:'PHE-Register',schema:1,events:original.call({action:'read'}).state.events};
  fs.writeFileSync(path.join(dir,'backup.json'),JSON.stringify(backup));
  const run=spawnSync(process.execPath,[path.resolve(__dirname,'../tools/prepare-restore.cjs'),path.join(dir,'backup.json'),path.join(dir,'RestoreData.gs')],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const target=server();target.init();vm.runInContext(fs.readFileSync(path.join(dir,'RestoreData.gs'),'utf8'),target.context);target.context.restoreBackupIntoEmpty_();
  assert.deepEqual(target.call({action:'read'}).state.events,backup.events);assert.throws(()=>target.context.restoreBackupIntoEmpty_());
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
