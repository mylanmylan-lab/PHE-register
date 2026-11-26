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
// Existing 1.0 shared lesson fixture; new API writes require 1.2 fields.
function setup(){const s=server();s.init();s.seed();const state=s.call({action:'read'}).state,next=s.context.PHE.apply(state,{op:'lesson.create',id:'lesson-1',classId:'demo-7a',expectedClass:1,date:'2026-10-23',topic:''},{id:'lesson-request',actor:'teacher@school.example',at:'2026-10-23T08:00:00Z'});s.rows.push([next.revision,JSON.stringify(next.events.at(-1))]);return s;}
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
test('Backend 1.1: rozvrh používa serverového vlastníka, validáciu a kontrolu verzie',()=>{
 const s=setup(),command={op:'schedule.upsert',id:'slot',expected:0,day:1,start:'08:00',end:'08:45',classId:'demo-7a'};
 const r=s.call({action:'command',requestId:'slot-create',command});assert.equal(r.ok,true);assert.equal(r.actor,'teacher@school.example');assert.equal(r.state.schedule[0].owner,r.actor);
 assert.equal(s.call({action:'command',requestId:'slot-conflict',command}).code,'CONFLICT');
 assert.equal(s.call({action:'command',requestId:'slot-spoof',command:{...command,id:'spoof',owner:'other@school.example'}}).code,'VALIDATION');
 assert.equal(s.call({action:'command',requestId:'slot-overlap',command:{...command,id:'overlap',start:'08:30'}}).code,'VALIDATION');
 s.identity('other@school.example');assert.equal(s.call({action:'read'}).actor,'other@school.example');
 assert.equal(s.call({action:'command',requestId:'slot-delete-other',command:{op:'schedule.delete',id:'slot',expected:1}}).code,'VALIDATION');
 s.identity('teacher@school.example');const deleted=s.call({action:'command',requestId:'slot-delete',command:{op:'schedule.delete',id:'slot',expected:1}});assert.equal(deleted.ok,true);assert.equal(deleted.state.schedule[0].deleted,true);
});
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
test('Backend 1.2: nové hodiny vyžadujú skupinu; dve identity majú vlastné témy a potvrdenia',()=>{
 const s=server();s.init();s.seed();let state=s.call({action:'read'}).state;
 const base={op:'lesson.create',id:'a',classId:'demo-7a',expectedClass:1,date:'2026-11-02',topic:'Chlapci'};
 assert.equal(s.call({action:'command',requestId:'legacy-new',command:base}).code,'VALIDATION');
 const send=(id,command)=>s.call({action:'command',requestId:id,command});
 let r=send('new-a',{...base,group:'boys',start:'08:00',end:'08:45',expectedRevision:state.revision});assert.equal(r.ok,true);state=r.state;
 s.identity('other@school.example');r=send('new-b',{...base,id:'b',topic:'Dievčatá',group:'girls',start:'08:00',end:'08:45',expectedRevision:state.revision});assert.equal(r.ok,true);state=r.state;
 assert.equal(send('spoof-a',{op:'record.set',lessonId:'a',studentId:'demo-1',expected:1,status:'A'}).code,'FORBIDDEN');
 assert.equal(send('overlap',{...base,id:'all',group:'all',start:'08:00',end:'08:45',expectedRevision:state.revision}).code,'OVERLAP');
 r=send('finish-b',{op:'lesson.update',id:'b',expected:1,expectedRevision:state.revision,date:'2026-11-02',topic:'Téma B',finished:true});assert.equal(r.ok,true);assert.equal(r.state.lessons.find(l=>l.id==='b').confirmedBy,'other@school.example');assert.equal(r.state.lessons.find(l=>l.id==='a').finished,false);
});
test('Backend 1.2: neistý výsledok ukončenia nie je úspech, opakovanie je idempotentné',()=>{
 const s=server();s.init();s.seed();let state=s.call({action:'read'}).state;
 const send=(id,command)=>s.call({action:'command',requestId:id,command});
 state=send('start',{op:'lesson.create',id:'a',classId:'demo-7a',expectedClass:1,date:'2026-11-02',topic:'',group:'all',start:'08:00',end:'08:45',expectedRevision:state.revision}).state;
 const cmd={op:'lesson.update',id:'a',expected:1,expectedRevision:state.revision,date:'2026-11-02',topic:'Uložená téma',finished:true};s.failFlush();assert.equal(send('finish',cmd).ok,false);const count=s.rows.length;assert.equal(send('finish',cmd).ok,true);assert.equal(s.rows.length,count);assert.equal(s.call({action:'read'}).state.lessons[0].finished,true);
});
test('Backend 1.2: prednastavenie a začiatok dňa používajú serverovú identitu a kontrolu konfliktov',()=>{
 const s=server();s.init();s.seed();const send=(id,command)=>s.call({action:'command',requestId:id,command});let state=s.call({action:'read'}).state;
 const preset={op:'schedule.preset',id:'school-preset',validFrom:'2026-10-26',expectedRevision:state.revision};
 let r=send('preset',preset);assert.equal(r.ok,true);assert.equal(r.state.schedule.length,19);assert.equal(r.state.lessons.length,0);assert.ok(r.state.classes.slice(1).every(c=>!c.students.length));assert.ok(r.state.schedule.every(e=>e.owner==='teacher@school.example'));
 assert.equal(send('stale-preset',{...preset,id:'new-preset'}).code,'CONFLICT');
 const cfg={op:'timetable.settings',expected:0,startOfDay:'07:00',periods:JSON.parse(JSON.stringify(s.context.PHE.PERIODS))};
 assert.equal(send('config',cfg).ok,true);const before=s.rows.length;assert.equal(send('stale-config',cfg).code,'CONFLICT');assert.equal(send('bad-config',{...cfg,expected:1,startOfDay:'25:00'}).code,'VALIDATION');assert.equal(send('spoof-config',{...cfg,owner:'other@school.example'}).code,'VALIDATION');assert.equal(s.rows.length,before);
 s.identity('other@school.example');r=send('other-config',{...cfg,startOfDay:'06:30'});assert.equal(r.ok,true);assert.equal(r.state.timetableSettings.length,2);assert.equal(r.state.timetableSettings[0].startOfDay,'07:00');assert.equal(s.locked,false);
});
test('Backend 1.2: otvorenie existujúcej dochádzky s novým ID nepridá zápis ani neprepíše tému',()=>{
 const s=server();s.init();s.seed();const send=(id,command)=>s.call({action:'command',requestId:id,command});const state=s.call({action:'read'}).state;
 const cmd={op:'lesson.create',id:'first',classId:'demo-7a',expectedClass:1,date:'2026-10-26',topic:'Pôvodná téma',group:'boys',start:'08:00',end:'08:45',slotId:null,expectedRevision:state.revision,openExisting:true};assert.equal(send('first',cmd).ok,true);const before=s.rows.length;
 const repeated=send('second',{...cmd,id:'second',topic:'Nezameniť tému'});assert.equal(repeated.ok,true);assert.equal(s.rows.length,before);assert.equal(repeated.state.lessons.length,1);assert.equal(repeated.state.lessons[0].topic,cmd.topic);
 assert.equal(send('invalid',{...cmd,id:'invalid',slotId:0}).code,'VALIDATION');assert.equal(s.rows.length,before);
});
