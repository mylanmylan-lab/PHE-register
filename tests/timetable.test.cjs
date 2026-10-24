const test=require('node:test'),assert=require('node:assert/strict');
const PHE=require('../web/domain.js'),T=require('../web/timetable.js');
const actor='Lokálny učiteľ';let serial=0;
function apply(s,c,who=actor){return PHE.apply(s,c,{id:'schedule-event-'+(++serial),at:'2026-10-26T06:00:00.000Z',actor:who});}
function setup(){return apply(PHE.demo(),{op:'class.create',id:'class-b',name:'8. B',students:[]});}
function put(s,id,day,start,end,classId='demo-7a',expected=0,who=actor){return apply(s,{op:'schedule.upsert',id,day,start,end,classId,expected},who);}
function scheduled(){return put(put(setup(),'mon-1',1,'08:00','08:45'),'mon-2',1,'09:00','09:45','class-b');}
const at=(time,date='2026-10-26')=>new Date(date+'T'+time+':00+01:00');
const pick=(s,time,overrides={})=>T.select(s,{actor,currentClassId:'demo-7a',lastManualClassId:'demo-7a',now:at(time),...overrides});
test('Rozvrh: začiatok je vrátane, koniec sa do hodiny nezahŕňa',()=>{
 const s=scheduled();assert.equal(T.candidate(s,actor,at('08:00')).id,'mon-1');assert.equal(T.candidate(s,actor,at('08:44')).id,'mon-1');
 assert.equal(T.candidate(s,actor,new Date('2026-10-26T08:44:59.999+01:00')).id,'mon-1');assert.equal(T.candidate(s,actor,at('08:45')).id,'mon-2');
 assert.equal(T.candidate(s,actor,at('09:00')).reason,'current');assert.equal(T.candidate(s,actor,at('09:45')),null);
});
test('Rozvrh: pred prvou hodinou a počas prestávky vyberie nasledujúcu dnešnú triedu',()=>{
 const s=scheduled();assert.equal(pick(s,'07:00').slot.id,'mon-1');assert.equal(pick(s,'08:50').classId,'class-b');assert.equal(pick(s,'08:50').reason,'next');
});
test('Rozvrh: bez prestávky sa na presnej hranici vyberie nasledujúca hodina',()=>{
 const s=put(put(setup(),'adj-1',1,'08:00','08:45'),'adj-2',1,'08:45','09:30','class-b');assert.equal(pick(s,'08:45').slot.id,'adj-2');
});
test('Rozvrh: po poslednej hodine zachová poslednú manuálnu triedu',()=>{
 assert.equal(pick(scheduled(),'10:00',{currentClassId:'class-b'}).classId,'demo-7a');assert.equal(pick(scheduled(),'23:59').reason,'fallback');
});
test('Rozvrh: sobota a nedeľa nevyberajú pondelkovú hodinu',()=>{
 for(const date of ['2026-10-24','2026-10-25']){const s=scheduled();assert.equal(T.candidate(s,actor,at('08:00',date)),null);assert.equal(pick(s,'08:00',{now:at('08:00',date),currentClassId:'class-b'}).classId,'demo-7a');}
});
test('Rozvrh: prázdny pracovný deň nevyberá rozvrh z iného dňa',()=>{
 assert.equal(pick(scheduled(),'08:00',{now:at('08:00','2026-10-27'),currentClassId:'class-b'}).classId,'demo-7a');
});
test('Rozvrh: čas Bratislavy je nezávislý od časového pásma zariadenia aj letného času',()=>{
 assert.equal(T.clock(new Date('2026-10-26T07:00:00Z')).time,'08:00');assert.equal(T.clock(new Date('2026-06-01T06:00:00Z')).time,'08:00');
 assert.equal(T.clock(new Date('2026-10-25T23:30:00Z')).day,1);assert.equal(T.clock(new Date('2026-10-25T23:30:00Z')).date,'2026-10-26');
});
test('Rozvrh: manuálny výber blokuje automatiku aj v ďalšej časovej hranici',()=>{
 const s=scheduled();for(const time of ['08:50','09:00','10:00'])assert.equal(pick(s,time,{manual:true}).classId,'demo-7a');
 assert.equal(pick(s,'09:00',{manual:false}).classId,'class-b');
});
test('Rozvrh: rozpracovaná hodina, neuložený vstup a prebiehajúce ukladanie blokujú prepnutie',()=>{
 const s=scheduled();for(const guard of ['working','editing','busy'])assert.equal(pick(s,'09:00',{[guard]:true}).reason,'protected');
});
test('Rozvrh: historická hodina je chránená aj po ukončení a pri zmene dňa',()=>{
 const s=scheduled();assert.equal(pick(s,'09:00',{historical:true,working:false}).classId,'demo-7a');assert.equal(pick(s,'10:00',{historical:true,currentClassId:'class-b'}).classId,'class-b');
});
test('Rozvrh: výber nikdy nezmení ani nevytvorí evidenčnú hodinu',()=>{
 let s=scheduled();s=apply(s,{op:'lesson.create',id:'old-lesson',classId:'demo-7a',expectedClass:1,date:'2026-10-01',topic:'Pôvodná téma'});
 const before=JSON.stringify(s);pick(s,'09:00');assert.equal(JSON.stringify(s),before);assert.equal(s.lessons.length,1);assert.equal(s.lessons[0].date,'2026-10-01');
});
test('Rozvrh: používa iba existujúce triedy a rozvrh príslušného učiteľa',()=>{
 let s=scheduled();s=put(s,'other',1,'08:00','08:45','class-b',0,'Iný učiteľ');assert.equal(T.candidate(s,'Iný učiteľ',at('08:10')).classId,'class-b');
 assert.equal(T.candidate(s,actor,at('08:10')).classId,'demo-7a');s.classes=s.classes.filter(c=>c.id!=='class-b');assert.equal(T.candidate(s,actor,at('09:00')),null);
});
test('Rozvrh: počet položiek za deň nie je viazaný na pevný počet školských hodín',()=>{
 let s=setup();for(let i=0;i<16;i++)s=put(s,'many-'+i,3,String(i).padStart(2,'0')+':00',String(i).padStart(2,'0')+':30');assert.equal(T.entries(s,actor).length,16);
});
test('Rozvrh: úprava a odstránenie zachovajú históriu, stará verzia sa odmietne',()=>{
 let s=scheduled();s=put(s,'mon-1',1,'08:05','08:40','class-b',1);assert.equal(s.schedule[0].version,2);
 assert.throws(()=>put(s,'mon-1',1,'08:10','08:40','demo-7a',1),{code:'CONFLICT'});
 s=apply(s,{op:'schedule.delete',id:'mon-1',expected:2});assert.equal(T.entries(s,actor).length,1);assert.equal(s.schedule[0].deleted,true);
 assert.throws(()=>put(s,'mon-1',1,'08:10','08:40','demo-7a',0));assert.ok(s.events.some(e=>e.command.op==='schedule.upsert'&&e.command.start==='08:00'));
});
test('Rozvrh: odmietne prekrytie, víkend, nesprávny čas a neexistujúcu triedu',()=>{
 const s=scheduled();for(const args of [[1,'08:30','09:05','demo-7a'],[6,'10:00','10:45','demo-7a'],[1,'25:00','26:00','demo-7a'],[1,'8:00','8:45','demo-7a'],[1,'11:00','10:00','demo-7a'],[1,'10:00','10:00','demo-7a'],[1,'10:00','10:45','missing']])assert.throws(()=>put(s,'invalid',...args),{code:'VALIDATION'});
});
test('Rozvrh: iný učiteľ nemôže meniť ani mazať cudzí záznam',()=>{
 const s=scheduled();assert.throws(()=>put(s,'mon-1',1,'08:00','08:45','class-b',1,'Iný učiteľ'),{code:'VALIDATION'});assert.throws(()=>apply(s,{op:'schedule.delete',id:'mon-1',expected:1},'Iný učiteľ'),{code:'VALIDATION'});
});
test('Rozvrh: stará záloha 1.0 sa obnoví bez migrácie alebo zmien údajov',()=>{
 const backup=require('../examples/fiktivne-udaje.json'),s=PHE.restore(backup);assert.deepEqual(PHE.backup(s),backup);assert.equal(s.schema,1);assert.deepEqual(T.entries(s,actor),[]);
 const next=put(s,'added',1,'08:00','08:45');assert.deepEqual(next.classes,s.classes);assert.deepEqual(next.events.slice(0,s.events.length),s.events);assert.deepEqual(next.records,s.records);
});
test('Rozvrh: úplná záloha a obnova obsahujú rozvrh aj odstránené položky',()=>{
 let s=scheduled();s=apply(s,{op:'schedule.delete',id:'mon-1',expected:1});const b=PHE.backup(s);assert.equal(b.schema,1);assert.deepEqual(PHE.restore(b),s);
});
test('Rozvrh: neexistujúca posledná trieda bezpečne použije dostupnú triedu',()=>{
 const s=setup();assert.equal(pick(s,'10:00',{lastManualClassId:'missing',currentClassId:undefined}).classId,'demo-7a');assert.equal(T.select(PHE.empty(),{actor}).classId,undefined);
});
