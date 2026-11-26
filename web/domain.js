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
  const GROUPS={all:'Celá trieda',boys:'Chlapci',girls:'Dievčatá'};
  const PERIODS=[['08:00','08:45'],['08:50','09:35'],['09:50','10:35'],['10:50','11:35'],['11:45','12:30'],['12:40','13:25'],['13:30','14:15'],['14:25','15:10'],['15:20','16:05']].map(([start,end],i)=>({number:i+1,start,end}));
  const WEEK_PRESET=[[[1,'IV.MYP'],[4,'V.MYP'],[6,'V.PYP AJ']],[[1,'II.MYP'],[3,'III.MYP'],[5,'P.MYP'],[6,'I.MYP']],[[1,'III.MYP'],[3,'VI.A'],[4,'V.PYP AJ']],[[1,'V.MYP'],[2,'VI.A'],[5,'P.MYP'],[6,'I.MYP'],[7,'IV.MYP']],[[4,'P.MYP'],[5,'III.MYP'],[6,'II.MYP'],[7,'V.MYP']]].flatMap((rows,i)=>rows.map(([period,name])=>({day:i+1,period,name})));
  const classKey=name=>name.normalize('NFKC').toLocaleUpperCase('sk').replace(/\s+/g,'');
  function timetableSettings(s,actor) {return (s.timetableSettings||[]).find(x=>x.owner===actor)||{owner:actor,version:0,startOfDay:'06:00',periods:clone(PERIODS)};}
  function existingLesson(s,actor,c) {
    return s.lessons.find(l=>l.owner===actor&&l.classId===c.classId&&l.date===c.date&&((c.slotId&&l.slotId===c.slotId)||(l.start===c.start&&l.end===c.end&&l.group===c.group)));
  }
  function presetPreview(s,actor,bindings={}) {
    const periods=timetableSettings(s,actor).periods;
    return WEEK_PRESET.map(row=>{
      const matches=s.classes.filter(c=>classKey(c.name)===classKey(row.name)),cl=bindings[row.name]?s.classes.find(c=>c.id===bindings[row.name]):matches.length===1?matches[0]:null;
      const period=periods[row.period-1],conflict=(s.schedule||[]).find(e=>!e.deleted&&e.owner===actor&&e.day===row.day&&e.start<period.end&&period.start<e.end);
      return {...row,...period,period:row.period,classId:cl?.id||null,ambiguous:!bindings[row.name]&&matches.length>1,conflictId:conflict?.id||null};
    });
  }
  function group(v) {check(Object.hasOwn(GROUPS,v),'Neplatná skupina.');}
  function hours(start,end) {check(typeof start==='string'&&typeof end==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(end)&&start<end,'Koniec musí byť po začiatku; použite čas HH:MM.');}
  function roster(l) {return l.studentIds?l.roster.filter(p=>l.studentIds.includes(p.id)):l.roster;}
  function own(l,actor) {if(l.owner && l.owner!==actor)fail('FORBIDDEN','Hodina patrí inému učiteľovi. Najprv ju výslovne prevezmite.');}
  function revision(s,expected) {if(s.revision!==expected)fail('CONFLICT','Údaje sa medzitým zmenili. Obnovte prehľad a potvrďte zmenu znova.');}
  function collisions(s,l,ids) {return s.lessons.filter(x=>x.id!==l.id&&x.classId===l.classId&&x.date===l.date&&x.start&&l.start<x.end&&x.start<l.end&&roster(x).some(p=>ids.includes(p.id)));}
  function preset(s,classId,studentId,day) {return (s.excuses||[]).find(e=>!e.deleted&&e.classId===classId&&e.studentId===studentId&&e.from<=day&&(!e.to||day<=e.to));}
  function defaultRecord(s,l,p) {const e=preset(s,l.classId,p.id,l.date);return {lessonId:l.id,studentId:p.id,status:e?e.status:'✓',version:1,origin:e?'period':'default',periodId:e?.id||null};}
  function refreshDefaults(s) {
    s.lessons.filter(l=>l.owner&&!l.finished&&!l.confirmedAt).forEach(l=>roster(l).forEach(p=>{
      const r=s.records.find(r=>r.lessonId===l.id&&r.studentId===p.id);
      if(!r||!['default','period'].includes(r.origin))return;
      const next=defaultRecord(s,l,p);
      if(r.status!==next.status||r.periodId!==next.periodId){Object.assign(r,{status:next.status,periodId:next.periodId,origin:next.origin,version:r.version+1});}
    }));
  }
  function setGroup(s,l,selected,takeovers,meta) {
    group(selected);
    const ids=l.roster.filter(p=>selected==='all'||p.group===selected).map(p=>p.id);
    check(ids.length>0,'Vybraná skupina nemá žiakov.');
    const others=collisions(s,l,ids),approved=takeovers||[];
    check(Array.isArray(approved),'Neplatný zoznam prevzatí.');
    approved.forEach(x=>{fields(x,['id','version']);id(x.id);});
    check(new Set(approved.map(x=>x.id)).size===approved.length,'Duplicitné prevzatie.');
    if(others.length!==approved.length||others.some(x=>!approved.some(a=>a.id===x.id)))fail('OVERLAP','Pre týchto žiakov už existuje súbežná evidencia. Skontrolujte a výslovne potvrďte prevzatie.');
    for(const other of others) {
      version(other,approved.find(a=>a.id===other.id).version);
      const moved=roster(other).filter(p=>ids.includes(p.id));
      other.studentIds=roster(other).filter(p=>!ids.includes(p.id)).map(p=>p.id);other.version++;
      const remainingGroups=[...new Set(roster(other).map(p=>p.group))];if(remainingGroups.length)other.group=remainingGroups.length===1?remainingGroups[0]:'all';
      (l.transfers||(l.transfers=[])).push({from:other.id,owner:other.owner,topic:other.topic,students:moved.map(p=>p.id),at:meta.at,by:meta.actor});
      for(const p of moved) {
        const old=s.records.find(r=>r.lessonId===other.id&&r.studentId===p.id),target=s.records.find(r=>r.lessonId===l.id&&r.studentId===p.id);
        const values={status:old.status,origin:'transfer',periodId:old.periodId||null,fromLessonId:other.id};
        if(target)Object.assign(target,values,{version:target.version+1});else s.records.push({lessonId:l.id,studentId:p.id,version:1,...values});
        s.cases.filter(c=>c.lessonId===l.id&&c.studentId===p.id&&c.state==='open').forEach(c=>Object.assign(c,{state:'resolved',resolution:'correction:'+old.status,resolvedAt:meta.at,resolvedBy:meta.actor,version:c.version+1}));
        s.cases.filter(c=>c.lessonId===other.id&&c.studentId===p.id&&c.state==='open').forEach(c=>{c.sourceLessonId=c.sourceLessonId||other.id;c.lessonId=l.id;c.version++;});
      }
    }
    l.group=selected;l.studentIds=ids;
    for(const p of roster(l))if(!s.records.some(r=>r.lessonId===l.id&&r.studentId===p.id))s.records.push(defaultRecord(s,l,p));
  }
  function orderedClasses(s,actor) {
    const pref=(s.preferences||[]).find(p=>p.owner===actor),list=[...s.classes];
    return pref?.mode==='custom'?list.sort((a,b)=>{const rank=id=>{const i=pref.classIds.indexOf(id);return i<0?999:i;};return rank(a.id)-rank(b.id)||a.name.localeCompare(b.name,'sk',{numeric:true});}):list.sort((a,b)=>a.name.localeCompare(b.name,'sk',{numeric:true}));
  }
  function apply(source, command, meta, replay=false) {
    obj(command); fields(meta,['id','at','actor']); id(meta.id); str(meta.actor,150); check(typeof meta.at === 'string' && /^\d{4}-\d\d-\d\dT/.test(meta.at) && !isNaN(Date.parse(meta.at)),'Neplatný čas.');
    const duplicate = replay ? null : source.events.find(e => e.id === meta.id);
    if (duplicate) { check(JSON.stringify(duplicate.command) === JSON.stringify(command) && duplicate.actor === meta.actor,'ID požiadavky už bolo použité.'); return source; }
    const s = replay ? source : {...clone({...source,events:[]}),events:source.events.slice()}, c = clone(command);
    let cl, lesson, record, open;
    switch(c.op) {
      case 'timetable.settings': {
        fields(c,['op','expected','startOfDay','periods']);check(typeof c.startOfDay==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(c.startOfDay),'Neplatný čas začiatku dňa.');
        check(Array.isArray(c.periods)&&c.periods.length===9,'Zadajte deväť vyučovacích hodín.');
        c.periods.forEach((p,i)=>{fields(p,['number','start','end']);check(p.number===i+1,'Čísla hodín musia byť 1 až 9.');hours(p.start,p.end);if(i)check(c.periods[i-1].end<=p.start,'Časy vyučovacích hodín sa prekrývajú.');});
        const old=timetableSettings(s,meta.actor);version(old,c.expected);
        const entries=s.schedule||[],proposed=entries.map(e=>e.owner===meta.actor&&e.period&&!e.deleted?{...e,start:c.periods[e.period-1].start,end:c.periods[e.period-1].end}:e);
        for(const e of proposed.filter(e=>e.owner===meta.actor&&!e.deleted))check(!proposed.some(x=>x.id!==e.id&&!x.deleted&&x.owner===meta.actor&&x.day===e.day&&x.start<e.end&&e.start<x.end),'Nové časy kolidujú s vlastnou položkou rozvrhu. Najprv upravte túto položku.');
        proposed.forEach((e,i)=>{if(e!==entries[i]&&(e.start!==entries[i].start||e.end!==entries[i].end))Object.assign(entries[i],{start:e.start,end:e.end,version:e.version+1});});
        const list=s.timetableSettings||(s.timetableSettings=[]),entry=list.find(x=>x.owner===meta.actor),data={owner:meta.actor,version:old.version+1,startOfDay:c.startOfDay,periods:c.periods};if(entry)Object.assign(entry,data);else list.push(data);break;
      }
      case 'schedule.preset': {
        fields(c,['op','id','expectedRevision','validFrom','bindings']);id(c.id);check(c.id.length<=60,'Príliš dlhé ID prednastavenia.');date(c.validFrom);revision(s,c.expectedRevision);
        const bindings=c.bindings||{};obj(bindings);check(Object.keys(bindings).every(k=>WEEK_PRESET.some(r=>r.name===k)),'Neznáma trieda prednastavenia.');
        Object.values(bindings).forEach(v=>{id(v);check(s.classes.some(x=>x.id===v),'Priradená trieda neexistuje.');});
        const preview=presetPreview(s,meta.actor,bindings);check(!preview.some(r=>r.ambiguous&&!r.conflictId),'Existuje viac tried s rovnakým názvom. Najprv vyberte priradenie triedy.');
        const entries=s.schedule||(s.schedule=[]),resolved={...bindings};
        for(const row of preview.filter(r=>!r.conflictId)){
          let classId=resolved[row.name]||row.classId;
          if(!classId){check(s.classes.length<50,'Limit 50 tried.');classId=c.id+'-c'+s.classes.length;id(classId);check(!s.classes.some(x=>x.id===classId),'ID triedy už existuje.');s.classes.push({id:classId,name:row.name,students:[],version:1});}
          resolved[row.name]=classId;const slotId=c.id+'-s'+row.day+'-'+row.period;check(!entries.some(x=>x.id===slotId),'ID prednastavenia už bolo použité.');
          entries.push({id:slotId,owner:meta.actor,day:row.day,start:row.start,end:row.end,classId,group:'boys',period:row.period,validFrom:c.validFrom,validTo:null,version:1,deleted:false});
        }break;
      }
      case 'schedule.upsert': {
        fields(c,['op','id','expected','day','start','end','classId','group','validFrom','validTo','period']); id(c.id); id(c.classId);
        if(c.period!==undefined&&c.period!==null){check(Number.isInteger(c.period)&&c.period>=1&&c.period<=9,'Neplatné číslo hodiny.');const p=timetableSettings(s,meta.actor).periods[c.period-1];check(c.start===p.start&&c.end===p.end,'Čas nezodpovedá číslu hodiny; zvoľte Vlastný čas.');}
        if(c.group!==undefined)group(c.group);
        if(c.validFrom!==undefined)date(c.validFrom);
        if(c.validTo!==undefined&&c.validTo!==null){date(c.validTo);check(!c.validFrom||c.validTo>=c.validFrom,'Neplatné obdobie rozvrhu.');}
        check(Number.isInteger(c.day) && c.day>=1 && c.day<=5,'Rozvrh možno nastaviť pre pondelok až piatok.');
        check(typeof c.start==='string' && typeof c.end==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.end) && c.start<c.end,'Koniec musí byť po začiatku; použite čas HH:MM.');
        check(s.classes.some(x=>x.id===c.classId),'Vyberte existujúcu triedu.');
        const entries=s.schedule||[], entry=entries.find(x=>x.id===c.id);
        if(entry) {check(entry.owner===meta.actor,'Tento rozvrh patrí inému učiteľovi.');version(entry,c.expected);check(!entry.deleted,'Položka rozvrhu bola odstránená.');}
        else if(c.expected!==0)fail('CONFLICT','Položka rozvrhu už neexistuje. Obnovte údaje.');
        check(!entries.some(x=>!x.deleted && x.owner===meta.actor && x.day===c.day && x.id!==c.id && c.start<x.end && x.start<c.end),'Hodiny v rozvrhu sa nesmú časovo prekrývať.');
        const data={id:c.id,owner:meta.actor,day:c.day,start:c.start,end:c.end,classId:c.classId,version:entry?entry.version+1:1,deleted:false};
        if(c.group!==undefined)data.group=c.group;
        if(c.period!==undefined)data.period=c.period;
        if(c.validFrom!==undefined)data.validFrom=c.validFrom;
        if(c.validTo!==undefined)data.validTo=c.validTo;
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
      case 'preferences.set': {
        fields(c,['op','expected','mode','classIds']);check(['alpha','custom'].includes(c.mode),'Neplatné poradie.');
        check(Array.isArray(c.classIds)&&new Set(c.classIds).size===c.classIds.length&&c.classIds.every(id=>s.classes.some(x=>x.id===id)),'Neplatný zoznam tried.');
        const list=s.preferences||(s.preferences=[]),p=list.find(p=>p.owner===meta.actor);
        if(p)version(p,c.expected);else check(c.expected===0,'Neplatná verzia poradia.');
        const data={owner:meta.actor,mode:c.mode,classIds:c.classIds,version:p?p.version+1:1};if(p)Object.assign(p,data);else list.push(data);break;
      }
      case 'lesson.create':
        fields(c,['op','id','classId','expectedClass','date','topic','group','start','end','slotId','expectedRevision','takeovers','openExisting']); id(c.id); id(c.classId); date(c.date); str(c.topic,200,true);
        if(c.openExisting!==undefined){check(typeof c.openExisting==='boolean','Neplatné otvorenie hodiny.');group(c.group);hours(c.start,c.end);if(c.slotId!==undefined&&c.slotId!==null)id(c.slotId);if(c.openExisting&&!replay&&existingLesson(source,meta.actor,c))return source;}
        cl=s.classes.find(x=>x.id===c.classId); version(cl,c.expectedClass);
        check(!s.lessons.some(x=>x.id===c.id),'Hodina už existuje.');
        check(cl.students.some(x=>x.active),'Najprv pridajte žiakov.');
        lesson={id:c.id,classId:cl.id,className:cl.name,date:c.date,topic:c.topic,finished:false,version:1,roster:clone(cl.students.filter(x=>x.active)),createdAt:meta.at};
        if(c.group!==undefined) {
          hours(c.start,c.end);revision(s,c.expectedRevision);
          if(c.slotId!==undefined&&c.slotId!==null)id(c.slotId);
          if(c.slotId){const slot=(s.schedule||[]).find(x=>x.id===c.slotId);check(slot&&!slot.deleted&&slot.owner===meta.actor&&slot.classId===cl.id,'Vyberte vlastnú existujúcu hodinu rozvrhu.');check(slot.day===new Date(c.date+'T12:00:00Z').getUTCDay()&&slot.start===c.start&&slot.end===c.end&&(!slot.validFrom||slot.validFrom<=c.date)&&(!slot.validTo||slot.validTo>=c.date),'Dátum a čas nezodpovedajú rozvrhu.');check(!(s.skipped||[]).some(x=>x.slotId===c.slotId&&x.date===c.date&&x.owner===meta.actor&&x.skipped),'Najprv zrušte označenie Neuskutočnená.');}
          if(c.slotId&&s.lessons.some(l=>l.owner===meta.actor&&l.slotId===c.slotId&&l.date===c.date))fail('CONFLICT','Táto naplánovaná hodina už má záznam. Otvorte ho z prehľadu.');
          Object.assign(lesson,{owner:meta.actor,start:c.start,end:c.end,slotId:c.slotId||null,confirmedAt:null,confirmedBy:null});
          setGroup(s,lesson,c.group,c.takeovers,meta);s.lessons.push(lesson);break;
        }
        s.lessons.push(lesson);
        lesson.roster.forEach(x=>s.records.push({lessonId:lesson.id,studentId:x.id,status:'✓',version:1})); break;
      case 'lesson.update':
        fields(c,['op','id','expected','date','topic','finished','start','end','expectedRevision']); id(c.id); date(c.date); str(c.topic,200,true); check(typeof c.finished==='boolean','Neplatný stav hodiny.');
        lesson=s.lessons.find(x=>x.id===c.id); version(lesson,c.expected);
        own(lesson,meta.actor);
        if(c.finished&&c.expectedRevision!==undefined)revision(s,c.expectedRevision);
        if(lesson.owner) {
          if(c.finished)revision(s,c.expectedRevision);
          const changed={...lesson,date:c.date,start:c.start??lesson.start,end:c.end??lesson.end};hours(changed.start,changed.end);
          if(collisions(s,changed,roster(lesson).map(p=>p.id)).length)fail('OVERLAP','Zmena času alebo dátumu by vytvorila duplicitnú dochádzku.');
          lesson.start=changed.start;lesson.end=changed.end;
          if(c.finished){check(roster(lesson).length>0,'Prázdna prevzatá skupina sa nedá potvrdiť.');lesson.confirmedAt=meta.at;lesson.confirmedBy=meta.actor;}
        }
        lesson.date=c.date; lesson.topic=c.topic; lesson.finished=c.finished; lesson.version++;if(lesson.owner&&!lesson.finished&&!lesson.confirmedAt)refreshDefaults(s); break;
      case 'lesson.group': {
        fields(c,['op','id','expected','expectedRevision','group','takeovers']);id(c.id);
        lesson=s.lessons.find(x=>x.id===c.id);version(lesson,c.expected);own(lesson,meta.actor);revision(s,c.expectedRevision);
        check(!!lesson.owner&&!lesson.finished,'Skupinu možno meniť v rozpracovanej hodine 1.2.');
        setGroup(s,lesson,c.group,c.takeovers,meta);lesson.version++;break;
      }
      case 'lesson.takeover': {
        fields(c,['op','id','expected','expectedRevision']);id(c.id);lesson=s.lessons.find(x=>x.id===c.id);version(lesson,c.expected);revision(s,c.expectedRevision);
        check(!!lesson.owner&&lesson.owner!==meta.actor,'Vyberte hodinu iného učiteľa.');
        lesson.previousOwners=[...(lesson.previousOwners||[]),{owner:lesson.owner,at:meta.at,by:meta.actor}];lesson.owner=meta.actor;lesson.finished=false;lesson.version++;break;
      }
      case 'excuse.upsert': {
        fields(c,['op','id','expected','classId','studentId','status','from','to']);id(c.id);id(c.classId);id(c.studentId);date(c.from);if(c.to!==null)date(c.to);
        check(c.to===null||c.to>=c.from,'Koniec obdobia je pred začiatkom.');check(['Ed','Ep','–'].includes(c.status),'Pre obdobie vyberte Ed, Ep alebo –.');
        check(s.classes.some(x=>x.id===c.classId&&x.students.some(p=>p.id===c.studentId)),'Žiak nie je v triede.');
        const list=s.excuses||(s.excuses=[]),e=list.find(x=>x.id===c.id);if(e){version(e,c.expected);check(!e.deleted,'Obdobie bolo odstránené.');check(e.classId===c.classId&&e.studentId===c.studentId,'Obdobie nemožno priradiť inému žiakovi.');}else check(c.expected===0,'Neplatná verzia.');
        check(!list.some(x=>x.id!==c.id&&!x.deleted&&x.classId===c.classId&&x.studentId===c.studentId&&x.from<=(c.to||'2100-12-31')&&c.from<=(x.to||'2100-12-31')),'Obdobia žiaka sa nesmú prekrývať.');
        const data={id:c.id,classId:c.classId,studentId:c.studentId,status:c.status,from:c.from,to:c.to,version:e?e.version+1:1,deleted:false,updatedBy:meta.actor};if(e)Object.assign(e,data);else list.push(data);refreshDefaults(s);break;
      }
      case 'excuse.delete': {
        fields(c,['op','id','expected']);const e=(s.excuses||[]).find(x=>x.id===c.id);version(e,c.expected);e.deleted=true;e.version++;refreshDefaults(s);break;
      }
      case 'calendar.upsert': {
        fields(c,['op','id','expected','kind','from','to']);id(c.id);date(c.from);date(c.to);check(c.to>=c.from&&['teaching','break'].includes(c.kind),'Neplatné obdobie kalendára.');
        const list=s.calendar||(s.calendar=[]),e=list.find(x=>x.id===c.id);if(e){version(e,c.expected);check(e.owner===meta.actor&&!e.deleted,'Cudzie alebo odstránené obdobie.');}else check(c.expected===0,'Neplatná verzia.');
        const data={id:c.id,owner:meta.actor,kind:c.kind,from:c.from,to:c.to,version:e?e.version+1:1,deleted:false};if(e)Object.assign(e,data);else list.push(data);break;
      }
      case 'calendar.delete': {
        fields(c,['op','id','expected']);const e=(s.calendar||[]).find(x=>x.id===c.id);version(e,c.expected);check(e.owner===meta.actor,'Cudzie obdobie.');e.deleted=true;e.version++;break;
      }
      case 'occurrence.skip': {
        fields(c,['op','slotId','date','expected','skipped']);id(c.slotId);date(c.date);check(typeof c.skipped==='boolean','Neplatné zrušenie.');
        const slot=(s.schedule||[]).find(x=>x.id===c.slotId);check(slot&&slot.owner===meta.actor,'Cudzia alebo neexistujúca hodina.');
        check(!s.lessons.some(l=>l.owner===meta.actor&&l.slotId===c.slotId&&l.date===c.date),'Hodina už má evidenciu; nemožno ju označiť bez záznamu.');
        const list=s.skipped||(s.skipped=[]),e=list.find(x=>x.slotId===c.slotId&&x.date===c.date&&x.owner===meta.actor);if(e)version(e,c.expected);else check(c.expected===0,'Neplatná verzia.');
        const data={slotId:c.slotId,date:c.date,owner:meta.actor,skipped:c.skipped,version:e?e.version+1:1};if(e)Object.assign(e,data);else list.push(data);break;
      }
      case 'record.set':
        fields(c,['op','lessonId','studentId','expected','status']); id(c.lessonId); id(c.studentId); check(MARKS.includes(c.status),'Neplatná značka.');
        record=s.records.find(x=>x.lessonId===c.lessonId && x.studentId===c.studentId); version(record,c.expected);
        lesson=s.lessons.find(x=>x.id===c.lessonId);
        own(lesson,meta.actor);check(roster(lesson).some(p=>p.id===c.studentId),'Žiak už nie je v tejto skupine.');
        check(!lesson.finished,'Najprv znovu otvorte hodinu na úpravu.');
        open=s.cases.find(x=>x.lessonId===c.lessonId && x.studentId===c.studentId && x.state==='open');
        if (open && c.status !== '!') Object.assign(open,{state:'resolved',resolution:['Ep','Ed'].includes(c.status)?c.status:'correction:'+c.status,resolvedAt:meta.at,resolvedBy:meta.actor,version:open.version+1});
        if(c.status==='!' && !open) s.cases.push({id:meta.id,lessonId:c.lessonId,studentId:c.studentId,originalStatus:'!',originalDate:lesson.date,openedAt:meta.at,openedBy:meta.actor,state:'open',resolution:null,resolvedAt:null,resolvedBy:null,version:1});
        record.status=c.status; record.version++;if(lesson.owner){record.origin='manual';record.periodId=null;} break;
      case 'case.resolve':
        fields(c,['op','id','expected','expectedRecord','resolution']); id(c.id); check(['Ep','Ed','without'].includes(c.resolution),'Neplatné vyriešenie.');
        open=s.cases.find(x=>x.id===c.id); version(open,c.expected); check(open.state==='open','Prípad je už vyriešený.');
        record=s.records.find(x=>x.lessonId===open.lessonId && x.studentId===open.studentId); version(record,c.expectedRecord);
        lesson=s.lessons.find(l=>l.id===open.lessonId);own(lesson,meta.actor);
        Object.assign(open,{state:'resolved',resolution:c.resolution,resolvedAt:meta.at,resolvedBy:meta.actor,version:open.version+1});
        record.status=c.resolution==='without'?'!':c.resolution; record.version++;if(lesson.owner){record.origin='manual';record.periodId=null;} break;
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
  const api={MARKS,LABELS,GROUPS,PERIODS,WEEK_PRESET,classKey,timetableSettings,presetPreview,existingLesson,roster,collisions,preset,orderedClasses,empty,apply,facts,backup,restore,sorted,today,semester,demo,fail};
  root.PHE=api; if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
