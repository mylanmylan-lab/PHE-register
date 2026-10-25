(async function() {
  'use strict';
  const $=s=>document.querySelector(s), E=PHEExport.esc, uuid=PHEStore.uuid;
  const remote=typeof google!=='undefined' && google.script && google.script.run;
  const store=remote?new PHEStore.GoogleStore():new PHEStore.LocalStore();
  let state,view='lesson',classId,lessonId,expanded=null,historyFor=null,busy=false,saveText='',saveError=false,pendingBackup=null,search='';
  const T=PHETimetable;
  let interactionVersion=0,finishFailed=false;
  let selectedGroup='all',groupEditor=false,transferPending=null,excuseDraft=null,exportGroup='all',exportTeacher='',missingFrom=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  if(!remote){try{store.actor=sessionStorage.getItem('phe-local-actor')||store.actor;}catch{}}
  let manualOverride=false,historyPinned=false,dirty=false,lastManualClassId=null,autoSlotKey=null,selectionReason='fallback',scheduleDraft=null,storageWarning=false;
  let [from,to]=PHE.semester(PHE.today());
  const icons={lesson:'M5 4h14v17H5z M9 2v4 M15 2v4 M8 11h8 M8 15h5',matrix:'M3 4h18v16H3z M3 10h18 M9 4v16 M15 4v16',cases:'M12 3 2 21h20L12 3z M12 9v5 M12 17v1',classes:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4',data:'M4 4h16v5H4z M4 12h16v8H4z M8 16h2'};
  icons.settings='M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6';
  const navs=[['lesson','Hodiny'],['matrix','Polrok'],['cases','Prípady'],['classes','Triedy'],['data','Údaje'],['settings','Nastavenia']];
  const svg=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k]}"/></svg>`;
  const cls=()=>state.classes.find(c=>c.id===classId);
  const lesson=()=>state.lessons.find(l=>l.id===lessonId&&l.classId===classId);
  const record=(l,p)=>state.records.find(r=>r.lessonId===l&&r.studentId===p);
  const name=p=>p.lastName+' '+p.firstName;
  const date=d=>d.slice(8,10)+'. '+Number(d.slice(5,7))+'. '+d.slice(0,4);
  const time=t=>new Intl.DateTimeFormat('sk-SK',{timeZone:'Europe/Bratislava',dateStyle:'short',timeStyle:'short'}).format(new Date(t));
  const markClass=m=>m==='✓'?'ok':m==='–'?'absent':m==='A'?'kit':m==='!'?'issue':'excused';
  const mark=m=>`<span class="mark ${markClass(m)}" title="${E(PHE.LABELS[m])}">${E(m)}</span>`;
  const options=()=>PHE.orderedClasses(state,store.actor).map(c=>`<option value="${E(c.id)}" ${c.id===classId?'selected':''}>${E(c.name)}</option>`).join('');
  function chooseClass(id) {
    classId=id;lastManualClassId=id;manualOverride=true;historyPinned=false;lessonId=undefined;expanded=null;
    const at=T.clock(),items=T.entries(state,store.actor).filter(e=>e.classId===id&&(!e.validFrom||e.validFrom<=at.date)&&(!e.validTo||e.validTo>=at.date)).sort((a,b)=>a.day-b.day||a.start.localeCompare(b.start));
    const entry=items.find(e=>e.day===at.day&&e.end>at.time)||items.find(e=>e.day===at.day)||items[0];selectedGroup=entry?.group||'all';
    preference(()=>localStorage.setItem(preferenceKey()+':manual',id));
  }
  function toast(message,bad=false) { const n=$('#notice');n.textContent=message;n.className='show'+(bad?' bad':'');clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.className='',bad?11000:4500); }
  function selectValid() {
    if(!cls())classId=state.classes[0]?.id;
    if(lessonId && !lesson())lessonId=undefined;
    // null deliberately means a selected class without an attendance lesson.
    if(lessonId===undefined)lessonId=state.lessons.filter(l=>l.classId===classId&&(!l.owner||l.owner===store.actor)&&PHE.roster(l).length).at(-1)?.id;
  }
  const preferenceKey=()=>`phe-register-ui:${remote?'school':'local'}:${store.actor}`;
  function preference(action) {
    try {return action();}catch {if(!storageWarning){storageWarning=true;toast('Prehliadač neumožnil zapamätať výber triedy. Údaje evidencie tým nie sú zmenené.',true);}return null;}
  }
  function loadSelection() {
    lastManualClassId=preference(()=>localStorage.getItem(preferenceKey()+':manual'));
    const saved=preference(()=>JSON.parse(sessionStorage.getItem(preferenceKey()+':lesson')||'null'));
    if(saved && saved.epoch===(state.storageEpoch||'school')) {
      const l=state.lessons.find(l=>l.id===saved.lessonId && l.classId===saved.classId);
      if(l && (saved.pinned||!l.finished)) {classId=l.classId;lessonId=l.id;historyPinned=!!saved.pinned;}
    }
  }
  function rememberSelection() {
    const l=lesson(),pinned=historyPinned||!!l&&l.date!==T.clock().date;
    preference(()=>{
      if(l && (!l.finished||pinned))sessionStorage.setItem(preferenceKey()+':lesson',JSON.stringify({classId,lessonId:l.id,pinned,epoch:state.storageEpoch||'school'}));
      else sessionStorage.removeItem(preferenceKey()+':lesson');
    });
  }
  function selectBySchedule(initial=false) {
    if(!state || view!=='lesson')return false;
    const l=lesson(),result=T.select(state,{actor:store.actor,now:new Date(),currentClassId:classId,lastManualClassId,manual:manualOverride,busy,editing:dirty||!!expanded||!!document.activeElement?.matches('input,select,textarea'),working:!!l&&!l.finished,historical:historyPinned||!!l&&l.date!==T.clock().date});
    if(['protected','manual'].includes(result.reason))return false;
    const slotKey=result.slot?result.slot.date+':'+result.slot.id:null;
    const changed=result.classId!==classId || slotKey!==autoSlotKey || selectionReason!==result.reason;
    if(changed) {
      classId=result.classId;autoSlotKey=slotKey;selectionReason=result.reason;selectedGroup=result.slot?.group||'all';
      if(result.slot || !initial)lessonId=null;
      historyPinned=false;expanded=null;historyFor=null;
    }
    return changed;
  }
  function scheduleTick() {if(selectBySchedule())render();}
  function scheduleHint() {
    const l=lesson(),slot=T.candidate(state,store.actor);
    const protectedLesson=historyPinned||l&&(!l.finished||l.date!==T.clock().date);
    let text=manualOverride?'Manuálny výber triedy.':selectionReason==='fallback'?'Mimo rozvrhu · posledná zvolená trieda.':`Podľa rozvrhu · ${slot?.reason==='current'?'prebieha':'nasleduje'} ${slot?slot.start+' – '+slot.end:''}`;
    if(protectedLesson)text='Otvorená hodina · automatické prepnutie je pozastavené.';
    return `<div class="schedule-hint"><small>${E(text)}</small>${protectedLesson?(historyPinned||l?.date!==T.clock().date?'<button class="plain" data-action="leave-lesson">Späť na rozvrh</button>':''):`<button class="plain" data-action="use-schedule">Použiť rozvrh</button>`}</div>`;
  }
  function legend() {return `<div class="legend">${PHE.MARKS.map(m=>`<span>${mark(m)} ${E(PHE.LABELS[m])}</span>`).join('')}</div>`;}
  function heading(title,sub,action='') {return `<div class="heading"><div><div class="eyebrow">Physical & Health Education</div><h1>${title}</h1><p>${sub}</p></div>${action}</div>`;}
  function historyHTML(events) {return `<div class="history">${events.length?events.slice().reverse().map(e=>`<div class="history-item">${E(eventLabel(e))}<small>${E(time(e.at))} · ${E(e.actor)}</small></div>`).join(''):'Zatiaľ bez zmien.'}</div>`;}
  function eventLabel(e) {
    const c=e.command,l=state.lessons.find(l=>l.id===(c.lessonId||c.id)),p=l?.roster.find(p=>p.id===c.studentId);
    if(c.op==='record.set')return `${p?name(p):c.studentId}: ${c.status} · ${l?date(l.date):''}`;
    if(c.op==='case.resolve') {const ca=state.cases.find(x=>x.id===c.id),le=state.lessons.find(x=>x.id===ca?.lessonId),pe=le?.roster.find(x=>x.id===ca?.studentId);return `${pe?name(pe):'Prípad'}: vyriešenie ${c.resolution==='without'?'bez ospravedlnenia':c.resolution}`;}
    if(c.op==='lesson.create')return `Vytvorená hodina ${date(c.date)}; ${c.group?PHE.GROUPS[c.group]+' · nepotvrdená dochádzka':'všetci ✓'}`;
    if(c.op==='lesson.update')return `Úprava hodiny: ${date(c.date)}, ${c.topic||'bez témy'}, ${c.finished?'ukončená':'otvorená'}`;
    if(c.op==='schedule.upsert')return `Rozvrh: ${T.DAYS[c.day-1]} ${c.start} – ${c.end} · ${state.classes.find(x=>x.id===c.classId)?.name||c.classId}`;
    if(c.op==='schedule.delete')return 'Odstránená položka rozvrhu';
    const labels={'lesson.group':'Úprava alebo prevzatie skupiny','lesson.takeover':'Prevzatie hodiny pri suplovaní','excuse.upsert':'Ospravedlnenie na obdobie','excuse.delete':'Odstránenie obdobia','preferences.set':'Poradie tried','calendar.upsert':'Obdobie školského kalendára','calendar.delete':'Odstránenie obdobia kalendára','occurrence.skip':'Zmena uskutočnenia plánovanej hodiny'};
    if(labels[c.op])return labels[c.op]+(c.group?' · '+PHE.GROUPS[c.group]:'')+(c.status?' · '+c.status+' · '+c.from+' – '+(c.to||'do odvolania'):'');
    return `${c.op==='class.create'?'Vytvorená':'Upravená'} trieda ${c.name}`;
  }
  function studentHistory(l,p) {
    const ids=new Set([l]),pending=[l];
    while(pending.length){const id=pending.pop();for(const t of state.lessons.find(x=>x.id===id)?.transfers||[])if(t.students.includes(p)&&!ids.has(t.from)){ids.add(t.from);pending.push(t.from);}}
    return state.events.filter(e=>ids.has(e.command.lessonId)&&e.command.studentId===p||e.command.op.startsWith('lesson.')&&ids.has(e.command.id)||e.command.op==='case.resolve'&&state.cases.some(c=>c.id===e.command.id&&c.studentId===p&&(ids.has(c.lessonId)||ids.has(c.sourceLessonId))));
  }
  const groupOptions=value=>Object.entries(PHE.GROUPS).map(([key,label])=>`<option value="${key}" ${key===value?'selected':''}>${label}</option>`).join('');
  const owned=l=>!l.owner||l.owner===store.actor;
  function workflowPanel(l) {
    let html=transferPending?`<section class="danger-box" role="alert"><h2>Existujúca evidencia vyžaduje prevzatie</h2><p class="hint">${E(transferPending.message)} Pôvodné značky, témy a história zostanú zachované. Prevzatí žiaci sa vyradia z pôvodnej skupiny, aby nevznikla dvojitá dochádzka. Zmenu uvidí aj druhý učiteľ.</p><button class="danger" data-action="confirm-transfer">Potvrdiť prevzatie evidencie</button><button data-action="cancel-transfer">Zrušiť</button></section>`:'';
    if(!l)return html+`<p class="hint">Predvolená skupina: <strong>${PHE.GROUPS[selectedGroup]}</strong>. Naplánovaná hodina zatiaľ nemá potvrdenú dochádzku.</p>`;
    if(!l.finished)html+=`<div class="draft-warning" role="status">Rozpracovaná hodina: značky sú priebežne uložené, dochádzka ešte nie je potvrdená.${owned(l)?' Dokončite ju tlačidlom Uložiť a ukončiť hodinu.':''}</div>`;
    if(l.owner)html+=`<section class="panel panel-body"><div class="row wrap"><strong>${E(l.owner)} · ${PHE.GROUPS[l.group]}</strong><span>${PHE.roster(l).length} žiakov</span>${owned(l)?`<button data-action="edit-group" ${l.finished?'disabled':''}>Upraviť skupinu</button>`:'<button data-action="takeover">Prevziať hodinu pri suplovaní</button>'}</div><div class="filters"><label>Začiatok<input id="lesson-start" type="time" value="${l.start}" ${l.finished||!owned(l)?'disabled':''}></label><label>Koniec<input id="lesson-end" type="time" value="${l.end}" ${l.finished||!owned(l)?'disabled':''}></label></div>${groupEditor&&owned(l)?`<form id="lesson-group-form"><label>Skupina len tejto hodiny<select name="group">${groupOptions(l.group)}</select></label><p class="hint">Rozvrh sa nezmení. Vyradené zápisy zostanú v histórii. Výber žiakov z viacerých tried je pripravený na budúce rozšírenie.</p><button type="submit">Uložiť skupinu</button><button type="button" data-action="cancel-group">Zrušiť</button></form>`:''}${l.confirmedAt?`<p class="hint">Naposledy potvrdené: ${time(l.confirmedAt)} · ${E(l.confirmedBy)}</p>`:''}${(l.transfers||[]).map(t=>`<p class="hint">Prevzatá téma: ${E(t.owner)} · ${E(t.topic||'bez témy')}</p>`).join('')}</section>`;
    else html+='<p class="hint">Historická spoločná hodina 1.0/1.1. Pôvodná evidencia a dátum sú zachované; nové skupiny vytvárajte v novej hodine.</p>';
    return html;
  }
  function workflowOverview() {
    const drafts=state.lessons.filter(l=>!l.finished&&owned(l)&&PHE.roster(l).length),missing=T.missing(state,store.actor,missingFrom,PHE.today());
    return `<details class="panel panel-body workflow-overview"><summary>Prehľad hodín · rozpracované ${drafts.length} · bez záznamu ${missing.length}</summary>${drafts.map(l=>`<div class="compact-item"><span>${E(l.className)} · ${date(l.date)} · ${l.start||''} · ${E(l.topic)}</span><button data-open-lesson="${l.id}">Pokračovať</button></div>`).join('')}<h3>Minulé naplánované hodiny bez záznamu</h3><p class="hint">Informačný zoznam podľa aktuálneho rozvrhu, nie potvrdená dochádzka. Zobrazí sa až po nastavení skutočných období výučby a voľna v Nastaveniach. Rozvrh sám nevytvára evidenciu.</p><label>Zobraziť od (najviac 366 dní)<input id="missing-from" type="date" value="${missingFrom}" max="${PHE.today()}"></label>${missing.map(e=>`<div class="compact-item"><span>${date(e.date)} · ${e.start} · ${E(state.classes.find(c=>c.id===e.classId)?.name)} · ${PHE.GROUPS[e.group||'all']}</span><div class="row wrap"><button data-plan-slot="${e.id}" data-plan-date="${e.date}">Doplniť</button><button data-skip-slot="${e.id}" data-plan-date="${e.date}">Neuskutočnená</button></div></div>`).join('')}${(state.skipped||[]).filter(e=>e.owner===store.actor&&e.skipped).map(e=>`<div class="compact-item"><small>Neuskutočnená · ${date(e.date)} · ${E(state.schedule.find(s=>s.id===e.slotId)?.start||'')}</small><button data-unskip-slot="${e.slotId}" data-plan-date="${e.date}">Znova plánovať</button></div>`).join('')}</details>`;
  }
  function classOrderPanel() {
    const classes=PHE.orderedClasses(state,store.actor),pref=(state.preferences||[]).find(p=>p.owner===store.actor);
    return `<section class="panel panel-body"><div class="row wrap"><h2>Všetky triedy</h2><button data-action="sort-alpha">Abecedné poradie</button><small>${pref?.mode==='custom'?'Vlastné poradie':'Abecedne'} · šípkami upravíte poradie</small></div><div class="class-list">${classes.map((c,i)=>`<div class="compact-item"><button class="plain" data-choose-class="${c.id}" aria-pressed="${c.id===classId}">${E(c.name)} <small>(${c.students.filter(p=>p.active).length})</small></button><div class="row"><button data-move-class="${c.id}" data-direction="-1" ${i===0?'disabled':''} aria-label="Posunúť ${E(c.name)} vyššie">↑</button><button data-move-class="${c.id}" data-direction="1" ${i===classes.length-1?'disabled':''} aria-label="Posunúť ${E(c.name)} nižšie">↓</button></div></div>`).join('')}</div></section>`;
  }
  function excusesPanel() {
    const c=cls();if(!c)return '';
    const list=(state.excuses||[]).filter(e=>!e.deleted&&e.classId===classId),d=excuseDraft;
    return `<details class="panel panel-body" ${d?'open':''}><summary>Ospravedlnenia a neprítomnosť na obdobie · ${E(c.name)}</summary><p class="hint">Ed, Ep alebo – bez diagnózy. Prázdny koniec znamená až do manuálneho ukončenia. Obdobie predvyplní nové a doteraz nepotvrdené hodiny; manuálna značka má prednosť. Potvrdené historické dochádzky sa nemenia. Jednu hodinu upravte priamo cez značku žiaka.</p><button data-action="new-excuse" ${!c.students.length?'disabled':''}>Pridať obdobie</button>${list.map(e=>`<div class="compact-item"><span>${E(name(c.students.find(p=>p.id===e.studentId)))} · ${e.status} · ${date(e.from)} – ${e.to?date(e.to):'do odvolania'}</span><div class="row wrap"><button data-edit-excuse="${e.id}">Upraviť / ukončiť</button><button data-delete-excuse="${e.id}">Odstrániť obdobie</button></div></div>`).join('')}${d?`<form id="excuse-form" class="form-grid"><label>Žiak<select name="studentId" ${d.expected?'disabled':''}>${PHE.sorted(c.students).map(p=>`<option value="${p.id}" ${p.id===d.studentId?'selected':''}>${E(name(p))}</option>`).join('')}</select></label><label>Značka<select name="status">${['Ed','Ep','–'].map(m=>`<option ${d.status===m?'selected':''}>${m}</option>`).join('')}</select></label><label>Od<input name="from" type="date" value="${d.from}" required></label><label>Do · voliteľné<input name="to" type="date" value="${d.to||''}"></label><button class="primary" type="submit">Uložiť obdobie</button><button type="button" data-action="cancel-excuse">Zrušiť</button></form>`:''}</details>`;
  }
  function teacherPanel() {
    if(remote)return `<section class="panel panel-body"><h2>Učiteľ</h2><p class="hint">${E(store.actor)} · identita overená školským serverom.</p></section>`;
    return `<section class="panel panel-body"><h2>Lokálny testovací učiteľ</h2><p class="hint">Na skúšku spoločnej práce používajte v dvoch kartách rôzne fiktívne mená. Triedy sú spoločné; rozvrh, témy a dochádzka patria učiteľovi. Toto nie je prihlásenie ani synchronizácia medzi počítačmi.</p><form id="teacher-form" class="row wrap"><label>Meno testovacieho učiteľa<input name="actor" value="${E(store.actor)}" maxlength="150" required></label><button type="submit">Použiť učiteľa</button></form></section>`;
  }
  function calendarPanel() {
    const entries=(state.calendar||[]).filter(e=>!e.deleted&&e.owner===store.actor);
    return `<details class="panel panel-body"><summary>Obdobia výučby, prázdniny a voľno</summary><p class="hint">Pre prehľad nezaznamenaných hodín najprv pridajte obdobie výučby. Zadajte aj všetky prázdniny, sviatky a školské voľno ako obdobia Bez výučby (majú prednosť). Kalendár školy sa nesťahuje automaticky. Bez nastavenia období nevznikajú upozornenia na minulé hodiny.</p>${entries.map(e=>`<div class="compact-item"><span>${e.kind==='teaching'?'Výučba':'Bez výučby'} · ${date(e.from)} – ${date(e.to)}</span><button data-delete-calendar="${e.id}">Odstrániť</button></div>`).join('')}<form id="calendar-form" class="form-grid"><label>Typ<select name="kind"><option value="break">Bez výučby</option><option value="teaching">Výučba</option></select></label><label>Od<input name="from" type="date" required></label><label>Do<input name="to" type="date" required></label><label class="check"><input type="checkbox" required> Obdobia som overil podľa školského kalendára.</label><button type="submit">Uložiť do kalendára</button></form></details>`;
  }
  async function orderClasses(mode,ids) {const p=(state.preferences||[]).find(x=>x.owner===store.actor);return mutate({op:'preferences.set',expected:p?.version||0,mode,classIds:ids});}
  function newExcuse(studentId) {excuseDraft={id:uuid(),expected:0,classId,studentId:studentId||cls().students[0]?.id,status:'Ed',from:PHE.today(),to:null};view='classes';render();}
  async function attemptGroup(command,preview) {
    const ids=preview.roster.filter(p=>command.group==='all'||p.group===command.group).map(p=>p.id),conflicts=PHE.collisions(state,preview,ids);
    if(conflicts.length){transferPending={command:{...command,takeovers:conflicts.map(l=>({id:l.id,version:l.version}))},message:conflicts.map(l=>`${l.owner} · ${l.start} – ${l.end} · ${l.topic||'bez témy'} (${PHE.roster(l).length} žiakov)`).join('; ')};render();return;}
    await saveWorkflow(command);
  }
  async function saveWorkflow(command) {return mutate(command,()=>{transferPending=null;groupEditor=false;if(command.op==='lesson.create'){classId=command.classId;lessonId=command.id;historyPinned=command.date!==PHE.today();expanded=null;search='';view='lesson';}});}
  async function startLesson(slot=null,day=PHE.today()) {
    const candidate=slot||(!manualOverride?T.candidate(state,store.actor):null),planned=candidate?.classId===classId?candidate:null;
    if(planned){const existing=state.lessons.find(l=>l.owner===store.actor&&l.slotId===planned.id&&l.date===day);if(existing){lessonId=existing.id;historyPinned=true;render();toast('Táto hodina už má evidenciu. Otvoril sa existujúci záznam.');return;}}
    const c=cls();let start=planned?.start||T.clock().time,end=planned?.end;
    if(!planned){const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));let at=Math.min(minutes(start),1394);const previous=state.lessons.filter(l=>l.owner===store.actor&&l.classId===classId&&l.date===day&&l.start);while(previous.some(l=>minutes(l.start)<at+45&&at<minutes(l.end)))at=Math.max(...previous.filter(l=>minutes(l.start)<at+45&&at<minutes(l.end)).map(l=>minutes(l.end)));if(at+45>1439){toast('Dnešný deň už nemá voľný 45-minútový interval. Upravte čas existujúcej hodiny.',true);return;}const fmt=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');start=fmt(at);end=fmt(at+45);}
    const command={op:'lesson.create',id:uuid(),classId,expectedClass:c.version,date:day,topic:'',group:planned?.group||selectedGroup,start,end,slotId:planned?.id||null,expectedRevision:state.revision};
    await attemptGroup(command,{...command,roster:c.students.filter(p=>p.active)});
  }
  async function finishLesson() {
    const l=lesson();if(!owned(l))return;
    const finished=!l.finished,patch={finished};
    if(finished){patch.date=$('#lesson-date').value;patch.topic=$('#lesson-topic').value;if(l.owner){patch.start=$('#lesson-start').value;patch.end=$('#lesson-end').value;}}
    finishFailed=false;
    if(await mutate(lessonUpdate(patch))){if(finished){scheduleTick();indicate('Dochádzka potvrdená a uložená');toast('Hodina je uložená a ukončená. Aplikáciu môžete bezpečne zatvoriť.');}else toast('Hodina je znovu otvorená. Opravy zostanú v histórii.');}else if(finished){finishFailed=true;indicate('Ukončenie nepotvrdené',true);}
  }
  // Commit the visible topic/date together with confirmation; blur must not eat the finish click.
  $('#app').addEventListener('pointerdown',e=>{if(e.target.closest('[data-action="finish"]'))e.preventDefault();});
  async function workflowClick(b) {
    if(b.dataset.chooseClass){chooseClass(b.dataset.chooseClass);excuseDraft=null;render();return true;}
    if(b.dataset.moveClass){const ids=PHE.orderedClasses(state,store.actor).map(c=>c.id),i=ids.indexOf(b.dataset.moveClass),j=i+Number(b.dataset.direction);if(j>=0&&j<ids.length){[ids[i],ids[j]]=[ids[j],ids[i]];await orderClasses('custom',ids);}return true;}
    if(b.dataset.excuseStudent){newExcuse(b.dataset.excuseStudent);return true;}
    if(b.dataset.editExcuse){const e=state.excuses.find(e=>e.id===b.dataset.editExcuse);excuseDraft={id:e.id,expected:e.version,classId:e.classId,studentId:e.studentId,status:e.status,from:e.from,to:e.to};render();return true;}
    if(b.dataset.deleteExcuse){const e=state.excuses.find(e=>e.id===b.dataset.deleteExcuse);await mutate({op:'excuse.delete',id:e.id,expected:e.version});return true;}
    if(b.dataset.deleteCalendar){const e=state.calendar.find(e=>e.id===b.dataset.deleteCalendar);await mutate({op:'calendar.delete',id:e.id,expected:e.version});return true;}
    if(b.dataset.planSlot){const slot=state.schedule.find(e=>e.id===b.dataset.planSlot);classId=slot.classId;selectedGroup=slot.group||'all';await startLesson(slot,b.dataset.planDate);return true;}
    if(b.dataset.skipSlot||b.dataset.unskipSlot){const id=b.dataset.skipSlot||b.dataset.unskipSlot,old=(state.skipped||[]).find(e=>e.slotId===id&&e.date===b.dataset.planDate&&e.owner===store.actor);await mutate({op:'occurrence.skip',slotId:id,date:b.dataset.planDate,expected:old?.version||0,skipped:!!b.dataset.skipSlot});return true;}
    switch(b.dataset.action){
      case 'sort-alpha':await orderClasses('alpha',[]);break;
      case 'edit-group':groupEditor=true;render();break;
      case 'cancel-group':groupEditor=false;render();break;
      case 'new-excuse':newExcuse();break;
      case 'cancel-excuse':excuseDraft=null;render();break;
      case 'cancel-transfer':transferPending=null;render();break;
      case 'confirm-transfer':if(transferPending)await saveWorkflow(transferPending.command);break;
      case 'takeover':{const l=lesson();transferPending={message:`Prevezmete hodinu učiteľa ${l.owner} s témou ${l.topic||'bez témy'}.`,command:{op:'lesson.takeover',id:l.id,expected:l.version,expectedRevision:state.revision}};render();break;}
      case 'upgrade-backup':{const old=await store.upgradeBackup();if(old)PHEExport.download(JSON.stringify(PHE.backup(old),null,2),'PHE-pred-verziou-1.2.json','application/json');else toast('Predchádzajúca evidencia nebola nájdená. Použite úplnú zálohu.');break;}
      default:return false;
    }return true;
  }
  async function workflowSubmit(form) {
    if(form.id==='lesson-group-form'){const l=lesson();await attemptGroup({op:'lesson.group',id:l.id,expected:l.version,expectedRevision:state.revision,group:form.elements.group.value},l);return true;}
    if(form.id==='excuse-form'){excuseDraft={...excuseDraft,studentId:form.elements.studentId.value,status:form.elements.status.value,from:form.elements.from.value,to:form.elements.to.value||null};await mutate({op:'excuse.upsert',...excuseDraft},()=>{excuseDraft=null;});return true;}
    if(form.id==='calendar-form'){await mutate({op:'calendar.upsert',id:uuid(),expected:0,kind:form.elements.kind.value,from:form.elements.from.value,to:form.elements.to.value});return true;}
    if(form.id==='teacher-form'&&!remote){const actor=form.elements.actor.value.trim();if(!actor)return true;store.actor=actor;preference(()=>sessionStorage.setItem('phe-local-actor',actor));classId=undefined;lessonId=null;historyPinned=false;manualOverride=false;autoSlotKey=null;selectedGroup='all';scheduleDraft=null;loadSelection();render();toast('Používate testovacieho učiteľa '+actor);return true;}
    return false;
  }
  function lessonView() {
    const l=lesson();
    let html=heading('Evidencia hodiny','Malé zápisy. Jasný prehľad o celej triede.',`<button class="primary" data-action="new-lesson" ${!cls()||!cls().students.some(p=>p.active)?'disabled':''}>＋ Nová hodina</button>`);
    html+=`<section class="panel"><div class="lesson-tools"><label>Trieda<select id="class-select" aria-label="Trieda">${options()}</select></label><label>Hodina<select id="lesson-select" aria-label="Hodina"><option value="" ${!l?'selected':''} disabled>Vyberte hodinu</option>${state.lessons.filter(x=>x.classId===classId).slice().reverse().map((x,i,a)=>`<option value="${x.id}" ${x.id===lessonId?'selected':''}>${date(x.date)} · ${x.start||'#'+(a.length-i)}${x.owner?' · '+E(x.owner)+' · '+E(PHE.GROUPS[x.group]):''}${x.topic?' · '+E(x.topic):''}</option>`).join('')}</select></label><span class="status-pill">${l?(l.finished?'Ukončená hodina':'Rozpracovaná · nepotvrdená dochádzka'):'Naplánovaná · bez dochádzky'}</span></div>`;
    if(l)html+=`<div class="lesson-meta"><label>Dátum<input id="lesson-date" type="date" min="2000-01-01" max="2100-12-31" value="${l.date}" ${l.finished||l.owner&&l.owner!==store.actor?'disabled':''}></label><label>Téma hodiny · voliteľné<input id="lesson-topic" maxlength="200" value="${E(l.topic)}" placeholder="Napr. loptové hry" ${l.finished||l.owner&&l.owner!==store.actor?'disabled':''}></label><button class="primary" data-action="finish" ${l.owner&&l.owner!==store.actor?'disabled':''}>${l.finished?'Znovu otvoriť':'Uložiť a ukončiť hodinu'}</button></div>`;
    html+='</section>'+scheduleHint()+workflowPanel(l)+workflowOverview();
    if(!l)return html+`<div class="empty"><h2>Začnite novú hodinu</h2><p>Každý žiak bude automaticky označený ✓. Zmeníte iba výnimky.</p>${cls()?'':'<button data-view="classes" class="primary">Vytvoriť triedu</button>'}</div>`+legend();
    const records=state.records.filter(r=>r.lessonId===l.id&&PHE.roster(l).some(p=>p.id===r.studentId)),n=m=>records.filter(r=>r.status===m).length;
    html+=`<div class="stats"><div class="stat"><div><div class="stat-label">Prítomní</div><strong>${records.length-n('–')} <small>/ ${records.length}</small></strong></div><span class="icon-circle">✓</span></div><div class="stat"><div><div class="stat-label">Cvičia</div><strong>${n('✓')}</strong></div><span class="icon-circle">✓</span></div><div class="stat"><div><div class="stat-label">Necvičia</div><strong>${records.length-n('✓')-n('–')}</strong></div><span class="icon-circle">–</span></div><div class="stat alert"><div><div class="stat-label">Otvorené prípady</div><strong>${state.cases.filter(c=>c.lessonId===l.id&&c.state==='open').length}</strong></div><span class="icon-circle">!</span></div></div>`;
    html+=`<div class="section-heading"><div><h2>Zoznam žiakov</h2><small>${l.finished?'Hodina je ukončená. Pre zmenu ju znovu otvorte.':'Ťuknite na meno a vyberte značku.'}</small></div><input id="search" class="search" type="search" aria-label="Hľadať žiaka" placeholder="Hľadať žiaka…" value="${E(search)}"></div><div class="groups">`;
    for(const g of ['boys','girls']) {
      const pupils=PHE.sorted(PHE.roster(l).filter(p=>p.group===g));if(!pupils.length)continue;
      html+=`<section class="group"><h3 class="group-heading">${g==='boys'?'Chlapci':'Dievčatá'} <span>${pupils.length}</span></h3>`;
      html+=pupils.filter(p=>name(p).toLocaleLowerCase('sk').includes(search.toLocaleLowerCase('sk'))).map(p=>{
        const r=record(l.id,p.id),open=expanded===p.id,closed=r.status==='!'&&!state.cases.some(c=>c.lessonId===l.id&&c.studentId===p.id&&c.state==='open');
        return `<div class="student ${open?'open':''}"><button class="student-toggle" data-student="${p.id}" aria-expanded="${open}" aria-controls="choices-${p.id}"><span>${E(name(p))}</span><span aria-label="${E(PHE.LABELS[r.status])}${closed?', prípad uzavretý':''}">${mark(r.status)}</span></button>${open?`<div id="choices-${p.id}" class="choices">${l.finished||l.owner&&l.owner!==store.actor?'':PHE.MARKS.map(m=>`<button data-mark="${E(m)}" data-pupil="${p.id}" aria-pressed="${r.status===m}" aria-label="${E(PHE.LABELS[m])}">${mark(m)}${E(PHE.LABELS[m])}</button>`).join('')}<div class="wide">${r.status==='–'?'Neprítomnosť: úbor a necvičenie sa nevyhodnocujú.':r.status==='A'?'Nemá úbor a necvičí. Nevzniká otvorený prípad.':r.status==='Ed'||r.status==='Ep'?'Ospravedlnené necvičenie. Úbor sa nevyhodnocuje.':closed?'Prípad bol uzavretý bez ospravedlnenia.':''}</div><button class="wide" data-history="${p.id}">História zápisov</button><button class="wide" data-excuse-student="${p.id}">Ed / Ep / – na obdobie</button><small class="wide">${r.origin==='period'?'Predvyplnené obdobím; potvrďte dochádzku celej hodiny.':'Jednorazová značka platí iba pre túto hodinu.'}</small></div>${historyFor===p.id?historyHTML(studentHistory(l.id,p.id)):''}`:''}</div>`;
      }).join('');
      html+='</section>';
    }
    return html+'</div>'+legend()+`<p class="bottom-note">Každá zmena sa ukladá automaticky. Značka A nevytvára nevyriešený prípad.</p><div class="row wrap" style="margin-top:14px"><button data-action="print">Tlač / PDF hodiny</button></div>`;
  }
  function matrixView() {
    const m=PHEExport.matrix(state,classId,from,to,{group:exportGroup,teacher:exportTeacher});
    return heading('Polročný prehľad','Každý žiak, každá hodina. Všetko v jednej tabuľke.')+`<div class="filters"><label>Trieda<select id="class-select">${options()}</select></label><label>Od<input id="date-from" type="date" value="${from}"></label><label>Do<input id="date-to" type="date" value="${to}"></label><label>Skupina<select id="export-group">${groupOptions(exportGroup)}</select></label><label>Učiteľ<select id="export-teacher"><option value="">Všetci učitelia</option>${[...new Set(state.lessons.map(l=>l.owner).filter(Boolean))].map(a=>`<option value="${E(a)}" ${a===exportTeacher?'selected':''}>${E(a)}</option>`).join('')}</select></label><button data-action="semester">Aktuálny polrok</button></div><div class="row wrap" style="margin-bottom:18px"><button data-action="csv">↓ CSV</button><button data-action="xlsx">↓ Excel XLSX</button><button data-action="print">Tlač / PDF</button><small>${m.lessons.length} hodín · ${m.pupils.length} žiakov</small></div><div class="table-wrap"><table class="matrix"><thead><tr><th scope="col">Žiak</th>${m.lessons.map((l,i)=>`<th scope="col">${date(l.date)} · ${l.start||'#'+(i+1)}<small>${l.finished?' · potvrdená':' · rozpracovaná'}</small>${l.members.map(m=>`<button class="plain" data-open-lesson="${m.id}" title="Otvoriť hodinu"><small>${E(m.owner||'Spoločná hodina')} · ${E(m.topic)}</small></button>`).join('')}</th>`).join('')}</tr></thead><tbody>${m.pupils.map(p=>`<tr><td>${E(name(p))}</td>${m.lessons.map(l=>{const value=PHEExport.cell(state,l,p.id);return `<td>${PHE.MARKS.includes(value)?mark(value):value?E(value):'<span title="Žiak nebol v zozname tejto hodiny">·</span>'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`+legend()+`<p class="hint">Kliknutím na dátum otvoríte hodinu. Prázdne pole znamená, že žiak nebol v jej zozname. Stav uzavretia ! nájdete v Prípadoch. Export obsahuje aj skupinu žiaka.</p>`;
  }
  function casesView() {
    const list=[...state.cases].sort((a,b)=>(a.state==='open'?0:1)-(b.state==='open'?0:1)||b.openedAt.localeCompare(a.openedAt));
    return heading('Nevyriešené prípady','Doplňte ospravedlnenie, keď príde. História zostáva zachovaná.',`<button data-action="print">Tlač / PDF</button>`)+(!list.length?'<div class="empty"><h2>Všetko je vybavené</h2><p>Značka ! vytvorí prípad na tomto mieste. Značka A ho nevytvára.</p></div>':list.map(c=>{
      const l=state.lessons.find(l=>l.id===c.lessonId),p=l.roster.find(p=>p.id===c.studentId);
      return `<article class="case-card ${c.state==='open'?'open-case':''}"><div class="row" style="justify-content:space-between;margin:0"><h3>${E(name(p))}</h3><span class="mark ${c.state==='open'?'issue':'excused'}">${c.state==='open'?'!':'✓'}</span></div><p>${E(l.className)} · ${date(l.date)} ${E(l.topic)}<br>Pôvodný stav: ! · pôvodný dátum ${date(c.originalDate)}<br>${c.state==='open'?'Čaká na vyriešenie':`Vyriešené: ${E(c.resolution==='without'?'bez ospravedlnenia':c.resolution.startsWith('correction:')?'oprava na '+c.resolution.slice(11):c.resolution)} · ${time(c.resolvedAt)} · ${E(c.resolvedBy)}`}</p>${c.state==='open'&&(!l.owner||l.owner===store.actor)?`<div class="row"><button data-resolve="Ep" data-case="${c.id}">Ep · rodič</button><button data-resolve="Ed" data-case="${c.id}">Ed · lekár</button><button class="danger" data-resolve="without" data-case="${c.id}">Uzavrieť bez ospr.</button></div>`:''}<details><summary>História a pôvodný zápis</summary>${historyHTML(studentHistory(l.id,p.id))}</details><button class="plain" data-open-lesson="${l.id}">Otvoriť hodinu ↗</button></article>`;
    }).join(''))+`<p class="hint">Uzavretie bez ospravedlnenia ponechá značku !, ale prípad už nie je otvorený. Aplikácia neurčuje žiadne výchovné opatrenia. Oprava ! na inú značku sa tiež uloží do histórie.</p>`;
  }
  function editorRow(p) {return `<div class="edit-pupil ${p.active?'':'archived'}" data-id="${p.id}" data-active="${p.active}"><input name="firstName" aria-label="Krstné meno" maxlength="60" value="${E(p.firstName)}" required placeholder="Meno"><input name="lastName" aria-label="Priezvisko" maxlength="60" value="${E(p.lastName)}" required placeholder="Priezvisko"><select name="group" aria-label="Skupina"><option value="boys" ${p.group==='boys'?'selected':''}>Chlapci</option><option value="girls" ${p.group==='girls'?'selected':''}>Dievčatá</option></select><button type="button" data-archive title="${p.active?'Archivovať žiaka':'Obnoviť žiaka'}" aria-label="${p.active?'Archivovať žiaka':'Obnoviť žiaka'}">${p.active?'−':'↶'}</button></div>`;}
  function classesView() {
    const c=cls();
    return heading('Triedy a žiaci','Spoločný zoznam pre celú triedu. Chlapci a dievčatá prehľadne.')+classOrderPanel()+excusesPanel()+`<form id="new-class" class="panel panel-body"><h2>Nová trieda</h2><div class="row" style="margin-top:14px"><input name="name" aria-label="Názov novej triedy" placeholder="Napr. 8. B" maxlength="60" required><button class="primary" type="submit">Vytvoriť</button></div></form>${c?`<div class="panel panel-body"><label>Upraviť triedu<select id="class-select">${options()}</select></label><form id="class-form" data-version="${c.version}"><label style="margin-top:18px">Názov triedy<input name="className" value="${E(c.name)}" maxlength="60" required></label><p class="hint">Zmeny zoznamu platia pre nové hodiny. Staršie hodiny si zachovajú pôvodné mená aj skupiny. Tlačidlo − archivuje žiaka.</p><div class="roster-editor">${['boys','girls'].flatMap(g=>PHE.sorted(c.students.filter(p=>p.group===g))).map(editorRow).join('')}</div><div class="row wrap" style="margin-top:18px"><button type="button" data-action="add-student">＋ Pridať žiaka</button><button type="submit" class="primary">Uložiť triedu</button></div><p class="hint">Platné úpravy sa uložia automaticky po opustení poľa. Pri novom žiakovi doplňte meno aj priezvisko.</p></form></div>`:''}`;
  }
  function settingsView() {
    const entries=T.entries(state,store.actor);
    const form=d=>`<form id="schedule-form" class="schedule-form" data-day="${d.day}"><label>Deň<select name="day">${T.DAYS.map((n,i)=>`<option value="${i+1}" ${d.day===i+1?'selected':''}>${n}</option>`).join('')}</select></label><label>Začiatok<input name="start" type="time" step="60" value="${E(d.start)}" required></label><label>Koniec<input name="end" type="time" step="60" value="${E(d.end)}" required></label><label class="schedule-class">Trieda<select name="classId" required><option value="" disabled ${!d.classId?'selected':''}>Vyberte triedu</option>${state.classes.map(c=>`<option value="${E(c.id)}" ${d.classId===c.id?'selected':''}>${E(c.name)}</option>`).join('')}</select></label><label>Skupina<select name="group">${groupOptions(d.group||'all')}</select></label><label>Platí od<input type="date" name="validFrom" value="${d.validFrom||PHE.today()}" required></label><label>Platí do · voliteľné<input type="date" name="validTo" value="${d.validTo||''}"></label><div class="row wrap"><button class="primary" type="submit">Uložiť do rozvrhu</button><button type="button" data-action="cancel-schedule">Zrušiť</button></div></form>`;
    return heading('Nastavenia','Rozvrh pre rýchly výber triedy.',`<span class="badge">VERZIA 1.2</span>`)+teacherPanel()+calendarPanel()+`<section class="panel panel-body"><h2>Rozvrh</h2><p class="hint">Hodinu presuniete cez Upraviť zmenou dňa alebo času. Predvolená skupina sa použije pri novej evidencii.</p><p class="hint">Nastavte si hodiny od pondelka do piatka. Počet položiek si určujete sami. Časy sa vyhodnocujú pre Bratislavu. Počas prestávky sa ponúkne nasledujúca trieda z dnešného rozvrhu.</p><p class="hint">Manuálny výber má prednosť do opätovného otvorenia aplikácie alebo voľby Použiť rozvrh. Rozpracovaná a historická hodina zostávajú otvorené. Rozvrh nikdy nevytvorí nový zápis hodiny.</p><small>${remote?'Každý oprávnený učiteľ má vlastný rozvrh podľa školského účtu.':'Rozvrh patrí lokálnemu učiteľovi v tomto prehliadači.'} Je súčasťou úplnej zálohy JSON.</small></section>${!state.classes.length?'<div class="empty"><h2>Najprv vytvorte triedu</h2><p>Rozvrh používa triedy z vašej evidencie.</p><button data-view="classes">Otvoriť triedy</button></div>':''}<div class="schedule-days">${T.DAYS.map((label,i)=>{
      const day=i+1,items=entries.filter(e=>e.day===day).sort((a,b)=>a.start.localeCompare(b.start));
      return `<section class="panel panel-body schedule-day" data-day="${day}"><div class="row" style="justify-content:space-between"><h2>${label}</h2><button data-schedule-add="${day}" ${!state.classes.length?'disabled':''}>＋ Pridať hodinu</button></div>${items.length?items.map(e=>`<div class="schedule-item" data-schedule-id="${e.id}"><div><strong>${E(e.start)} – ${E(e.end)}</strong><span>${E(state.classes.find(c=>c.id===e.classId)?.name||'Neznáma trieda')} · ${E(PHE.GROUPS[e.group||'all'])}</span></div><div class="row"><button data-schedule-edit="${e.id}" aria-label="Upraviť ${label} ${E(e.start)}">Upraviť</button><button class="danger" data-schedule-delete="${e.id}" aria-label="Odstrániť ${label} ${E(e.start)}">Odstrániť</button></div></div>`).join(''):'<p class="hint">Zatiaľ bez hodín.</p>'}${scheduleDraft?.day===day?form(scheduleDraft):''}</section>`;
    }).join('')}</div>`;
  }
  function dataView() {
    return heading('Údaje a zálohy','Vaša evidencia pod kontrolou.',`<span class="badge">PROTOTYP 1.2</span>`)+`<div class="data-grid"><section class="panel panel-body"><h2>Úplná záloha</h2><p>JSON obsahuje triedy, hodiny, skupiny, učiteľov, značky, rozvrh, obdobia, kalendár, poradie tried, prípady a celú históriu. Uchovajte si ho na bezpečnom mieste.</p><button class="primary" data-action="backup">↓ Stiahnuť zálohu</button>${remote?'':'<button data-action="upgrade-backup">Záloha pred prvým otvorením 1.2</button>'}</section><section class="panel panel-body"><h2>Obnoviť zo zálohy</h2><p>${remote?'Obnovu školského úložiska vykonáva správca do novej prázdnej tabuľky podľa technického návodu.':'Vyberte JSON zálohu. Pred nahradením údajov uvidíte jej obsah a počet záznamov.'}</p>${remote?'':`<label>Vybrať súbor zálohy<input id="import-file" type="file" accept=".json,application/json"></label>`}</section></div>${pendingBackup?`<div class="danger-box"><h3>Záloha je platná</h3><p class="hint">${pendingBackup.state.classes.length} tried · ${pendingBackup.state.lessons.length} hodín · ${pendingBackup.state.events.length} udalostí. Obnova nahradí aktuálnu lokálnu evidenciu. Súčasné údaje sa najprv stiahnu ako záloha a uchovajú aj v databáze pod before-restore.</p><button class="danger" data-action="restore">Nahradiť lokálne údaje</button><button data-action="cancel-restore">Zrušiť</button></div>`:''}<section class="panel panel-body"><h2>${remote?'Školské úložisko':'Lokálny režim · fiktívne údaje'}</h2><p class="hint">${remote?'Údaje sa ukladajú do školského Google Sheets. Používateľa, oprávnenia a verziu zápisu kontroluje server.':'Údaje sú uložené iba v tomto prehliadači pomocou IndexedDB. Zariadenia sa nesynchronizujú. Vymazanie dát prehliadača odstráni evidenciu, preto pravidelne vytvárajte zálohu. Tento režim používajte s fiktívnymi údajmi.'}</p><div class="row wrap"><span class="badge">${state.lessons.length} hodín</span><span class="badge">${state.events.length} zmien</span><span class="badge">${state.cases.filter(c=>c.state==='open').length} otvorených prípadov</span></div></section><section class="panel panel-body"><h2>História úprav</h2><p class="hint">Zobrazených posledných 100 zmien. Úplná história je v zálohe JSON.</p>${historyHTML(state.events.slice(-100))}</section>`;
  }
  function render() {
    selectValid();dirty=false;rememberSelection();
    const n=state.cases.filter(c=>c.state==='open').length;
    $('#app').innerHTML=`<div class="layout"><aside class="sidebar"><div class="brand"><span class="brand-icon">P</span><div>PHE Register<small>Priestor pre pohyb</small></div></div><div class="nav-label">VAŠA EVIDENCIA</div><nav class="nav" aria-label="Hlavná navigácia">${navs.map(([k,t])=>`<button data-view="${k}" ${view===k?'class="active" aria-current="page"':''}>${svg(k)}<span>${t}</span>${k==='cases'&&n?`<span class="count">${n}</span>`:''}</button>`).join('')}</nav><div class="sidebar-foot"><span class="mode-dot"></span>${remote?'Školský režim':'Lokálny prototyp'}<br><small>${remote?'Google Workspace':'Iba fiktívne údaje'}<br>PHE Register / 1.2</small></div></aside><div class="workspace"><header class="topbar"><span class="crumb">Pracovný priestor &nbsp; / &nbsp; <strong>${navs.find(x=>x[0]===view)[1]}</strong></span><span class="mobile-brand"><span class="brand-icon">P</span>PHE Register</span><div class="top-right"><span class="save ${saveError?'error':''}" role="status">${busy?'◌':saveError?'!':'✓'} ${E(saveText||(remote?'Načítané zo školy':'Uložené lokálne'))}</span><button class="plain refresh" data-action="refresh" aria-label="Obnoviť údaje">↻ Obnoviť</button><span class="avatar">PHE</span></div></header><main class="main">${n?`<div class="alert-banner" role="alert"><span class="alert-symbol">!</span><div><strong>Otvorené prípady: ${n}</strong><br>Čakajú na doplnenie alebo uzavretie.</div><button data-view="cases">Zobraziť prípady →</button></div>`:''}${({lesson:lessonView,matrix:matrixView,cases:casesView,classes:classesView,data:dataView,settings:settingsView}[view])()}</main></div></div>`;
    if(busy)$('#app').querySelectorAll('button,input,select').forEach(e=>e.disabled=true);
  }
  function indicate(text,error=false) {if(finishFailed&&!busy&&!error){text='Ukončenie nepotvrdené · skúste znova';error=true;}saveText=text;saveError=error;const e=$('.save');if(e){e.textContent=(error?'! ':busy?'◌ ':'✓ ')+text;e.classList.toggle('error',error);}}
  async function mutate(command,after) {
    const editingLesson=lessonId,visibleValues=Object.fromEntries(['lesson-date','lesson-topic','lesson-start','lesson-end'].filter(id=>$('#'+id)).map(id=>[id,$('#'+id).value]));
    if(busy)return;interactionVersion++;busy=true;indicate('Ukladám…');$('#app').querySelectorAll('button,input,select').forEach(e=>e.disabled=true);
    try {state=await store.command(command);busy=false;indicate(remote?'Uložené v škole':'Uložené lokálne');if(after)after();channel?.postMessage('changed');render();return true;}
    catch(e) {busy=false;try{state=await store.read();}catch{}indicate('Zmena nepotvrdená',true);render();if(lessonId===editingLesson){for(const [id,value] of Object.entries(visibleValues)){if($('#'+id)&&!$('#'+id).disabled){$('#'+id).value=value;dirty=true;}}}toast(e.message,true);return false;}
  }
  async function refresh(manual=true) {
    if(busy||!manual&&(dirty||scheduleDraft||document.activeElement?.matches('input,select')))return;
    const generation=interactionVersion;
    try {
      const latest=await store.read();
      if(busy||generation!==interactionVersion||!manual&&dirty)return;
      if(latest.storageEpoch===state.storageEpoch&&latest.revision<state.revision)return;
      if(manual||latest.revision!==state.revision||latest.storageEpoch!==state.storageEpoch){state=latest;if(manual)finishFailed=false;indicate(remote?'Načítané zo školy':'Uložené lokálne');render();if(manual)toast('Údaje sú aktuálne.');}
      scheduleTick();
    }catch(e){indicate('Načítanie zlyhalo',true);if(manual)toast(e.message,true);}
  }
  function lessonUpdate(patch) {const l=lesson();return {op:'lesson.update',id:l.id,expected:l.version,date:l.date,topic:l.topic,finished:l.finished,expectedRevision:state.revision,...(l.owner?{start:l.start,end:l.end}:{}),...patch};}
  function report() {
    if(view==='cases')return {title:'Prípady · všetky triedy',rows:[['Žiak','Trieda / hodina','Pôvodný stav / dátum','Stav prípadu'],...state.cases.map(c=>{const l=state.lessons.find(l=>l.id===c.lessonId),p=l.roster.find(p=>p.id===c.studentId);return [name(p),l.className+' / '+date(l.date),'! / '+date(c.originalDate),c.state==='open'?'Otvorený':c.resolution==='without'?'Uzavretý bez ospravedlnenia':c.resolution];})]};
    if(view==='lesson'&&lesson()){const l=lesson();return {title:l.className+' · '+date(l.date)+(l.topic?' · '+l.topic:'')+(l.owner?' · '+l.owner+' · '+PHE.GROUPS[l.group]:'')+(l.finished?' · POTVRDENÁ':' · ROZPRACOVANÁ'),rows:[['Žiak','Skupina','Značka','Otvorený prípad'],...['boys','girls'].flatMap(g=>PHE.sorted(PHE.roster(l).filter(p=>p.group===g))).map(p=>[name(p),p.group==='boys'?'Chlapci':'Dievčatá',record(l.id,p.id).status,state.cases.some(c=>c.lessonId===l.id&&c.studentId===p.id&&c.state==='open')?'Áno':'Nie'])]};}
    return {title:(cls()?.name||'Trieda')+' · '+PHE.GROUPS[exportGroup]+(exportTeacher?' · '+exportTeacher:'')+' · '+date(from)+' – '+date(to),rows:PHEExport.matrix(state,classId,from,to,{group:exportGroup,teacher:exportTeacher}).rows};
  }
  function printReport() {const r=report(),chunks=[];if(view==='matrix'){for(let i=2;i<Math.max(3,r.rows[0].length);i+=8)chunks.push(r.rows.map(row=>[...row.slice(0,2),...row.slice(i,i+8)]));}else chunks.push(r.rows);$('#print-area').innerHTML=chunks.map((rows,i)=>`<section class="print-page"><h1>PHE Register · ${E(r.title)}</h1><p>Vytlačené ${date(PHE.today())}${chunks.length>1?' · časť '+(i+1)+' / '+chunks.length:''}</p><table><thead><tr>${rows[0].map(v=>`<th>${E(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row=>'<tr>'+row.map(v=>`<td>${E(v)}</td>`).join('')+'</tr>').join('')}</tbody></table><p>✓ pripravený, cvičí · – neprítomný · A nemá úbor · ! bez ospravedlnenia · Ep rodič · Ed lekár</p><p>Stav otvorenia alebo uzavretia ! je v prehľade Prípady. Prázdne pole: žiak nebol v zozname hodiny.</p></section>`).join('');window.print();}
  $('#app').addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b||busy)return;
    if(await workflowClick(b))return;
    if(b.dataset.scheduleAdd){scheduleDraft={id:uuid(),expected:0,day:Number(b.dataset.scheduleAdd),start:'',end:'',classId:classId||state.classes[0]?.id||'',group:'all',validFrom:PHE.today(),validTo:null};render();$('#schedule-form input').focus();return;}
    if(b.dataset.scheduleEdit){const e=T.entries(state,store.actor).find(e=>e.id===b.dataset.scheduleEdit);scheduleDraft={id:e.id,expected:e.version,day:e.day,start:e.start,end:e.end,classId:e.classId,group:e.group||'all',validFrom:e.validFrom||PHE.today(),validTo:e.validTo||null};render();$('#schedule-form input').focus();return;}
    if(b.dataset.scheduleDelete){const e=T.entries(state,store.actor).find(e=>e.id===b.dataset.scheduleDelete);await mutate({op:'schedule.delete',id:e.id,expected:e.version},()=>{if(scheduleDraft?.id===e.id)scheduleDraft=null;});return;}
    if(b.dataset.view){view=b.dataset.view;expanded=null;render();return;}
    if(b.dataset.student){expanded=expanded===b.dataset.student?null:b.dataset.student;historyFor=null;render();return;}
    if(b.dataset.history){historyFor=historyFor===b.dataset.history?null:b.dataset.history;render();return;}
    if(b.dataset.mark){const r=record(lessonId,b.dataset.pupil);await mutate({op:'record.set',lessonId,studentId:r.studentId,expected:r.version,status:b.dataset.mark},()=>{expanded=null;historyFor=null;});return;}
    if(b.dataset.resolve){const c=state.cases.find(c=>c.id===b.dataset.case),r=record(c.lessonId,c.studentId);await mutate({op:'case.resolve',id:c.id,expected:c.version,expectedRecord:r.version,resolution:b.dataset.resolve});return;}
    if(b.dataset.openLesson){const l=state.lessons.find(l=>l.id===b.dataset.openLesson);classId=l.classId;lessonId=l.id;historyPinned=true;view='lesson';expanded=null;render();window.scrollTo(0,0);return;}
    if(b.hasAttribute('data-archive')){const row=b.closest('.edit-pupil'),active=row.dataset.active!=='true';row.dataset.active=String(active);row.classList.toggle('archived',!active);b.textContent=active?'−':'↶';b.setAttribute('aria-label',active?'Archivovať žiaka':'Obnoviť žiaka');if(!cls().students.some(p=>p.id===row.dataset.id)&&![...row.querySelectorAll('input')].some(i=>i.value.trim()))row.remove();await saveClass($('#class-form'));return;}
    switch(b.dataset.action) {
      case 'leave-lesson':
        if(dirty)break;
        lessonId=null;historyPinned=false;manualOverride=false;selectBySchedule();render();break;
      case 'cancel-schedule':scheduleDraft=null;saveText=remote?'Načítané zo školy':'Uložené lokálne';saveError=false;render();break;
      case 'use-schedule':
        if(dirty||historyPinned||lesson()&&(!lesson().finished||lesson().date!==T.clock().date))break;
        manualOverride=false;selectBySchedule();render();break;
      case 'new-lesson': await startLesson();break;
      case 'finish': await finishLesson();break;
      case 'refresh':await refresh();break;
      case 'semester':[from,to]=PHE.semester(PHE.today());render();break;
      case 'add-student': $('.roster-editor').insertAdjacentHTML('beforeend',editorRow({id:uuid(),firstName:'',lastName:'',group:'boys',active:true}));$('.edit-pupil:last-child input').focus();break;
      case 'csv':PHEExport.download(PHEExport.csv(report().rows),'PHE-prehlad.csv','text/csv;charset=utf-8');break;
      case 'xlsx':PHEExport.download(PHEExport.xlsx(report().rows),'PHE-prehlad.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');break;
      case 'print':printReport();break;
      case 'backup':PHEExport.download(JSON.stringify(PHE.backup(state),null,2),'PHE-zaloha-'+PHE.today()+'.json','application/json');break;
      case 'cancel-restore':pendingBackup=null;render();break;
      case 'restore':
        if(!pendingBackup||remote)return;
        busy=true;indicate('Obnovujem…');
        try {PHEExport.download(JSON.stringify(PHE.backup(state),null,2),'PHE-pred-obnovou-'+PHE.today()+'.json','application/json');state=await store.restore(pendingBackup.backup,pendingBackup.expected,pendingBackup.epoch);pendingBackup=null;expanded=null;busy=false;saveError=false;saveText='Záloha obnovená';channel?.postMessage('changed');render();toast('Údaje boli obnovené.');}catch(err){busy=false;indicate('Obnova zlyhala',true);toast(err.message,true);}break;
    }
  });
  $('#app').addEventListener('change',async e=>{
    const t=e.target;if(busy||!t.isConnected)return;
    if(t.closest('#class-form')){await saveClass(t.closest('#class-form'));return;}
    if(t.id==='class-select'){chooseClass(t.value);render();}
    if(t.id==='lesson-select'){lessonId=t.value;historyPinned=true;expanded=null;render();}
    if(t.id==='lesson-date'){if(t.checkValidity()&&t.value)await mutate(lessonUpdate({date:t.value}));else{toast('Vyberte platný dátum.',true);render();}}
    if(t.id==='lesson-start'||t.id==='lesson-end'){if(t.checkValidity())await mutate(lessonUpdate({start:$('#lesson-start').value,end:$('#lesson-end').value}));return;}
    if(t.id==='export-group'||t.id==='export-teacher'){exportGroup=$('#export-group').value;exportTeacher=$('#export-teacher').value;render();return;}
    if(t.id==='missing-from'){missingFrom=t.value||missingFrom;render();return;}
    if(t.id==='lesson-topic')await mutate(lessonUpdate({topic:t.value}));
    if(t.id==='date-from'||t.id==='date-to'){const nextFrom=t.id==='date-from'?t.value:from,nextTo=t.id==='date-to'?t.value:to;if(!nextFrom||!nextTo||nextFrom>nextTo){toast('Začiatok obdobia musí byť pred koncom.',true);render();return;}from=nextFrom;to=nextTo;render();}
    if(t.id==='import-file'&&t.files[0]){try{if(t.files[0].size>15*1024*1024)throw new Error('Záloha prekračuje 15 MB.');const backup=JSON.parse(await t.files[0].text()),restored=PHE.restore(backup);pendingBackup={backup,state:restored,expected:state.revision,epoch:state.storageEpoch};render();}catch(err){toast('Zálohu nemožno načítať: '+err.message,true);}}
  });
  $('#app').addEventListener('input',e=>{if(e.target.closest('#class-form')||e.target.id==='lesson-topic'||e.target.id==='lesson-date'||e.target.closest('#schedule-form')||e.target.closest('#excuse-form')||e.target.closest('#calendar-form')||e.target.id==='lesson-start'||e.target.id==='lesson-end'){dirty=true;indicate('Neuložené úpravy');}if(e.target.id==='search'){const pos=e.target.selectionStart;search=e.target.value;render();$('#search').focus();try{$('#search').setSelectionRange(pos,pos);}catch{}}});
  async function saveClass(form) {
    if(!form.checkValidity()){indicate('Neuložené: doplňte mená',true);return;}
    const pupils=[...form.querySelectorAll('.edit-pupil')].map(row=>({id:row.dataset.id,active:row.dataset.active==='true',firstName:row.querySelector('[name=firstName]').value.trim(),lastName:row.querySelector('[name=lastName]').value.trim(),group:row.querySelector('select').value}));
    return mutate({op:'class.update',id:classId,expected:Number(form.dataset.version),name:form.elements.className.value.trim(),students:pupils});
  }
  $('#app').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const form=e.target;
    if(await workflowSubmit(form))return;
    if(form.id==='schedule-form') {
      scheduleDraft={...scheduleDraft,start:form.elements.start.value,end:form.elements.end.value,classId:form.elements.classId.value,day:Number(form.elements.day.value),group:form.elements.group.value,validFrom:form.elements.validFrom.value,validTo:form.elements.validTo.value||null};
      await mutate({op:'schedule.upsert',...scheduleDraft},()=>{scheduleDraft=null;});return;
    }
    if(form.id==='new-class'){const id=uuid();await mutate({op:'class.create',id,name:form.elements.name.value.trim(),students:[]},()=>{chooseClass(id);lessonId=null;});}
    if(form.id==='class-form')await saveClass(form);
  });
  let channel=null;
  try {state=await store.init();loadSelection();selectBySchedule(true);if('BroadcastChannel' in window&&!remote){channel=new BroadcastChannel('phe-register');channel.onmessage=()=>refresh(false);}render();setInterval(scheduleTick,1000);window.addEventListener('focus',()=>refresh(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false);});}
  catch(e){$('#app').innerHTML=`<div class="fatal"><h1>Evidenciu nemožno otvoriť</h1><p>${E(e.message)}</p><p>${remote?'Skontrolujte školské prihlásenie a kontaktujte správcu.':'Povoľte úložisko prehliadača. Na iPhone otvorte aplikáciu cez HTTP server podľa README; nepoužívajte náhľad súboru. Žiadne dáta neboli automaticky vymazané.'}</p><button onclick="location.reload()">Skúsiť znova</button></div>`;}
})();
