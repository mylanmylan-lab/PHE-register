/* Shared by the browser, Node tests and Apps Script. No I/O or dependencies. */
(function(root) {
  'use strict';
  const MARKS = ['✓', '–', 'A', '!', 'Ep', 'Ed'];
  const LABELS = {'✓':'Pripravený, cvičí','–':'Neprítomný', A:'Nemá úbor', '!':'Bez ospravedlnenia', Ep:'Ospravedlnený rodičom', Ed:'Ospravedlnený lekárom'};
  function fail(code, message) { const e = new Error(message); e.code = code; throw e; }
  function check(ok, message) { if (!ok) fail('VALIDATION', message); }
  const clone = x => JSON.parse(JSON.stringify(x));
  function obj(v) { check(v && typeof v === 'object' && !Array.isArray(v), 'Očakáva sa objekt.'); }
  function fields(v, names) { obj(v); check(Object.keys(v).every(k => names.includes(k)), 'Neznáme pole vstupu.'); }
  function str(v, max, empty) { check(typeof v === 'string' && v.length <= max && (empty || v.trim().length > 0) && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v), 'Neplatný text.'); }
  function id(v) { check(typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(v), 'Neplatný identifikátor.'); }
  function date(v) { check(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= '2000-01-01' && v <= '2100-12-31' && new Date(v+'T12:00:00Z').toISOString().slice(0,10) === v, 'Neplatný dátum.'); }
  function version(entity, expected) { if (!entity) fail('NOT_FOUND','Záznam už neexistuje.'); if (!Number.isInteger(expected) || entity.version !== expected) fail('CONFLICT','Záznam medzitým zmenil iný učiteľ alebo karta. Načítajte aktuálne údaje a vyberte zmenu znova.'); }
  function students(list) {
    check(Array.isArray(list) && list.length <= 60, 'Trieda môže mať najviac 60 žiakov.');
    const seen = new Set();
    list.forEach(s => { fields(s,['id','firstName','lastName','group','active']); id(s.id); str(s.firstName,60); str(s.lastName,60); check(['boys','girls'].includes(s.group),'Neplatná skupina.'); check(typeof s.active === 'boolean','Neplatná aktivita žiaka.'); check(!seen.has(s.id),'Duplicitné ID žiaka.'); seen.add(s.id); });
  }
  function empty() { return {schema:1, revision:0, classes:[], lessons:[], records:[], cases:[], events:[]}; }
  function facts(mark) { check(MARKS.includes(mark),'Neplatná značka.'); return {present:mark !== '–', kit:mark === '✓' ? true : mark === 'A' ? false : null, exercising:mark === '✓', reason:['A','!','Ep','Ed'].includes(mark) ? mark : null}; }
  function capacity(s) {
    if(s.events.length>20000)fail('LIMIT','Dosiahnutý limit 20 000 zmien prototypu. Vytvorte zálohu.');
    let bytes=0;
    for(const ch of JSON.stringify({format:'PHE-Register',schema:1,events:s.events},null,2)) {const cp=ch.codePointAt(0);bytes+=cp<128?1:cp<2048?2:cp<65536?3:4;}
    if(bytes>15*1024*1024)fail('LIMIT','Údaje prekračujú limit 15 MB obnoviteľnej zálohy. Vytvorte zálohu a kontaktujte správcu.');
  }
  function apply(source, command, meta, replay=false) {
    obj(command); fields(meta,['id','at','actor']); id(meta.id); str(meta.actor,150); check(typeof meta.at === 'string' && /^\d{4}-\d\d-\d\dT/.test(meta.at) && !isNaN(Date.parse(meta.at)),'Neplatný čas.');
    const duplicate = replay ? null : source.events.find(e => e.id === meta.id);
    if (duplicate) { check(JSON.stringify(duplicate.command) === JSON.stringify(command) && duplicate.actor === meta.actor,'ID požiadavky už bolo použité.'); return source; }
    const s = replay ? source : {...clone({...source,events:[]}),events:source.events.slice()}, c = clone(command);
    let cl, lesson, record, open;
    switch(c.op) {
      case 'schedule.upsert': {
        fields(c,['op','id','expected','day','start','end','classId']); id(c.id); id(c.classId);
        check(Number.isInteger(c.day) && c.day>=1 && c.day<=5,'Rozvrh možno nastaviť pre pondelok až piatok.');
        check(typeof c.start==='string' && typeof c.end==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.end) && c.start<c.end,'Koniec musí byť po začiatku; použite čas HH:MM.');
        check(s.classes.some(x=>x.id===c.classId),'Vyberte existujúcu triedu.');
        const entries=s.schedule||[], entry=entries.find(x=>x.id===c.id);
        if(entry) {check(entry.owner===meta.actor,'Tento rozvrh patrí inému učiteľovi.');version(entry,c.expected);check(!entry.deleted,'Položka rozvrhu bola odstránená.');}
        else if(c.expected!==0)fail('CONFLICT','Položka rozvrhu už neexistuje. Obnovte údaje.');
        check(!entries.some(x=>!x.deleted && x.owner===meta.actor && x.day===c.day && x.id!==c.id && c.start<x.end && x.start<c.end),'Hodiny v rozvrhu sa nesmú časovo prekrývať.');
        const data={id:c.id,owner:meta.actor,day:c.day,start:c.start,end:c.end,classId:c.classId,version:entry?entry.version+1:1,deleted:false};
        if(entry)Object.assign(entry,data);else entries.push(data);
        s.schedule=entries;break;
      }
      case 'schedule.delete': {
        fields(c,['op','id','expected']);id(c.id);
        const entry=(s.schedule||[]).find(x=>x.id===c.id);version(entry,c.expected);
        check(entry.owner===meta.actor,'Tento rozvrh patrí inému učiteľovi.');check(!entry.deleted,'Položka rozvrhu už bola odstránená.');
        entry.deleted=true;entry.version++;break;
      }
      case 'class.create':
        fields(c,['op','id','name','students']); id(c.id); str(c.name,60); students(c.students);
        check(!s.classes.some(x=>x.id===c.id),'Trieda už existuje.'); check(s.classes.length < 50,'Limit 50 tried.');
        s.classes.push({id:c.id,name:c.name.trim(),students:c.students,version:1}); break;
      case 'class.update':
        fields(c,['op','id','expected','name','students']); id(c.id); str(c.name,60); students(c.students);
        cl=s.classes.find(x=>x.id===c.id); version(cl,c.expected);
        check(cl.students.every(old=>c.students.some(x=>x.id===old.id)), 'Žiaka archivujte; jeho ID nemožno odstrániť.');
        cl.name=c.name.trim(); cl.students=c.students; cl.version++; break;
      case 'lesson.create':
        fields(c,['op','id','classId','expectedClass','date','topic']); id(c.id); id(c.classId); date(c.date); str(c.topic,200,true);
        cl=s.classes.find(x=>x.id===c.classId); version(cl,c.expectedClass);
        check(!s.lessons.some(x=>x.id===c.id),'Hodina už existuje.');
        check(cl.students.some(x=>x.active),'Najprv pridajte žiakov.');
        lesson={id:c.id,classId:cl.id,className:cl.name,date:c.date,topic:c.topic,finished:false,version:1,roster:clone(cl.students.filter(x=>x.active)),createdAt:meta.at};
        s.lessons.push(lesson);
        lesson.roster.forEach(x=>s.records.push({lessonId:lesson.id,studentId:x.id,status:'✓',version:1})); break;
      case 'lesson.update':
        fields(c,['op','id','expected','date','topic','finished']); id(c.id); date(c.date); str(c.topic,200,true); check(typeof c.finished==='boolean','Neplatný stav hodiny.');
        lesson=s.lessons.find(x=>x.id===c.id); version(lesson,c.expected);
        lesson.date=c.date; lesson.topic=c.topic; lesson.finished=c.finished; lesson.version++; break;
      case 'record.set':
        fields(c,['op','lessonId','studentId','expected','status']); id(c.lessonId); id(c.studentId); check(MARKS.includes(c.status),'Neplatná značka.');
        record=s.records.find(x=>x.lessonId===c.lessonId && x.studentId===c.studentId); version(record,c.expected);
        lesson=s.lessons.find(x=>x.id===c.lessonId);
        check(!lesson.finished,'Najprv znovu otvorte hodinu na úpravu.');
        open=s.cases.find(x=>x.lessonId===c.lessonId && x.studentId===c.studentId && x.state==='open');
        if (open && c.status !== '!') Object.assign(open,{state:'resolved',resolution:['Ep','Ed'].includes(c.status)?c.status:'correction:'+c.status,resolvedAt:meta.at,resolvedBy:meta.actor,version:open.version+1});
        if(c.status==='!' && !open) s.cases.push({id:meta.id,lessonId:c.lessonId,studentId:c.studentId,originalStatus:'!',originalDate:lesson.date,openedAt:meta.at,openedBy:meta.actor,state:'open',resolution:null,resolvedAt:null,resolvedBy:null,version:1});
        record.status=c.status; record.version++; break;
      case 'case.resolve':
        fields(c,['op','id','expected','expectedRecord','resolution']); id(c.id); check(['Ep','Ed','without'].includes(c.resolution),'Neplatné vyriešenie.');
        open=s.cases.find(x=>x.id===c.id); version(open,c.expected); check(open.state==='open','Prípad je už vyriešený.');
        record=s.records.find(x=>x.lessonId===open.lessonId && x.studentId===open.studentId); version(record,c.expectedRecord);
        Object.assign(open,{state:'resolved',resolution:c.resolution,resolvedAt:meta.at,resolvedBy:meta.actor,version:open.version+1});
        record.status=c.resolution==='without'?'!':c.resolution; record.version++; break;
      default: fail('VALIDATION','Neznáma operácia.');
    }
    s.events.push({...clone(meta),command:c}); s.revision++; if(!replay)capacity(s);return s;
  }
  function backup(s) { return {format:'PHE-Register',schema:1,events:clone(s.events)}; }
  function restore(b) {
    fields(b,['format','schema','events']); check(b.format==='PHE-Register' && b.schema===1 && Array.isArray(b.events) && b.events.length<=20000,'Neplatná alebo nepodporovaná záloha.');
    let s=empty();const seen=new Set();
    b.events.forEach(e=>{fields(e,['id','at','actor','command']); check(!seen.has(e.id),'Duplicitná udalosť v zálohe.'); seen.add(e.id); s=apply(s,e.command,{id:e.id,at:e.at,actor:e.actor},true);});
    capacity(s);return s;
  }
  function sorted(list) { return [...list].sort((a,b)=>a.lastName.localeCompare(b.lastName,'sk') || a.firstName.localeCompare(b.firstName,'sk')); }
  function today() { return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
  function semester(day) { const y=Number(day.slice(0,4)),m=Number(day.slice(5,7)); return m===1?[(y-1)+'-09-01',y+'-01-31']:m<9?[y+'-02-01',y+'-08-31']:[y+'-09-01',(y+1)+'-01-31']; }
  const demoNames = [
    ['Adam','Bielik','boys'],['Daniel','Dúha','boys'],['Filip','Horský','boys'],['Jakub','Javor','boys'],['Leo','Kamenár','boys'],['Lukáš','Lipový','boys'],['Matej','Makovec','boys'],['Oliver','Oblačný','boys'],['Samuel','Polárny','boys'],['Tomáš','Zelený','boys'],
    ['Adela','Brezová','girls'],['Barbora','Čerešňová','girls'],['Ema','Dúhová','girls'],['Hana','Hviezdna','girls'],['Laura','Javorová','girls'],['Lea','Lúčová','girls'],['Nina','Makovská','girls'],['Sofia','Oblačná','girls'],['Tamara','Slnečná','girls'],['Zora','Zelená','girls']
  ];
  function demo() { return apply(empty(),{op:'class.create',id:'demo-7a',name:'7. A',students:demoNames.map((x,i)=>({id:'demo-'+(i+1),firstName:x[0],lastName:x[1],group:x[2],active:true}))},{id:'demo-seed',actor:'Fiktívne údaje',at:'2026-09-01T08:00:00.000Z'}); }
  const api={MARKS,LABELS,empty,apply,facts,backup,restore,sorted,today,semester,demo,fail};
  root.PHE=api; if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
