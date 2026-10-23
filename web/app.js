(async function() {
  'use strict';
  const $=s=>document.querySelector(s), E=PHEExport.esc, uuid=PHEStore.uuid;
  const remote=typeof google!=='undefined' && google.script && google.script.run;
  const store=remote?new PHEStore.GoogleStore():new PHEStore.LocalStore();
  let state,view='lesson',classId,lessonId,expanded=null,historyFor=null,busy=false,saveText='',saveError=false,pendingBackup=null,search='';
  let [from,to]=PHE.semester(PHE.today());
  const icons={lesson:'M5 4h14v17H5z M9 2v4 M15 2v4 M8 11h8 M8 15h5',matrix:'M3 4h18v16H3z M3 10h18 M9 4v16 M15 4v16',cases:'M12 3 2 21h20L12 3z M12 9v5 M12 17v1',classes:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4',data:'M4 4h16v5H4z M4 12h16v8H4z M8 16h2'};
  const navs=[['lesson','Hodiny'],['matrix','Polrok'],['cases','Prípady'],['classes','Triedy'],['data','Údaje']];
  const svg=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k]}"/></svg>`;
  const cls=()=>state.classes.find(c=>c.id===classId);
  const lesson=()=>state.lessons.find(l=>l.id===lessonId&&l.classId===classId);
  const record=(l,p)=>state.records.find(r=>r.lessonId===l&&r.studentId===p);
  const name=p=>p.lastName+' '+p.firstName;
  const date=d=>d.slice(8,10)+'. '+Number(d.slice(5,7))+'. '+d.slice(0,4);
  const time=t=>new Intl.DateTimeFormat('sk-SK',{timeZone:'Europe/Bratislava',dateStyle:'short',timeStyle:'short'}).format(new Date(t));
  const markClass=m=>m==='✓'?'ok':m==='–'?'absent':m==='A'?'kit':m==='!'?'issue':'excused';
  const mark=m=>`<span class="mark ${markClass(m)}" title="${E(PHE.LABELS[m])}">${E(m)}</span>`;
  const options=()=>state.classes.map(c=>`<option value="${E(c.id)}" ${c.id===classId?'selected':''}>${E(c.name)}</option>`).join('');
  function toast(message,bad=false) { const n=$('#notice');n.textContent=message;n.className='show'+(bad?' bad':'');clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.className='',bad?11000:4500); }
  function selectValid() {if(!cls())classId=state.classes[0]?.id;if(!lesson())lessonId=state.lessons.filter(l=>l.classId===classId).at(-1)?.id;}
  function legend() {return `<div class="legend">${PHE.MARKS.map(m=>`<span>${mark(m)} ${E(PHE.LABELS[m])}</span>`).join('')}</div>`;}
  function heading(title,sub,action='') {return `<div class="heading"><div><div class="eyebrow">Physical & Health Education</div><h1>${title}</h1><p>${sub}</p></div>${action}</div>`;}
  function historyHTML(events) {return `<div class="history">${events.length?events.slice().reverse().map(e=>`<div class="history-item">${E(eventLabel(e))}<small>${E(time(e.at))} · ${E(e.actor)}</small></div>`).join(''):'Zatiaľ bez zmien.'}</div>`;}
  function eventLabel(e) {
    const c=e.command,l=state.lessons.find(l=>l.id===(c.lessonId||c.id)),p=l?.roster.find(p=>p.id===c.studentId);
    if(c.op==='record.set')return `${p?name(p):c.studentId}: ${c.status} · ${l?date(l.date):''}`;
    if(c.op==='case.resolve') {const ca=state.cases.find(x=>x.id===c.id),le=state.lessons.find(x=>x.id===ca?.lessonId),pe=le?.roster.find(x=>x.id===ca?.studentId);return `${pe?name(pe):'Prípad'}: vyriešenie ${c.resolution==='without'?'bez ospravedlnenia':c.resolution}`;}
    if(c.op==='lesson.create')return `Vytvorená hodina ${date(c.date)}; všetci ✓`;
    if(c.op==='lesson.update')return `Úprava hodiny: ${date(c.date)}, ${c.topic||'bez témy'}, ${c.finished?'ukončená':'otvorená'}`;
    return `${c.op==='class.create'?'Vytvorená':'Upravená'} trieda ${c.name}`;
  }
  function studentHistory(l,p) {return state.events.filter(e=>e.command.op==='lesson.create'&&e.command.id===l || e.command.lessonId===l&&e.command.studentId===p || e.command.op==='case.resolve'&&state.cases.some(c=>c.id===e.command.id&&c.lessonId===l&&c.studentId===p));}
  function lessonView() {
    const l=lesson();
    let html=heading('Evidencia hodiny','Malé zápisy. Jasný prehľad o celej triede.',`<button class="primary" data-action="new-lesson" ${!cls()||!cls().students.some(p=>p.active)?'disabled':''}>＋ Nová hodina</button>`);
    html+=`<section class="panel"><div class="lesson-tools"><label>Trieda<select id="class-select" aria-label="Trieda">${options()}</select></label><label>Hodina<select id="lesson-select" aria-label="Hodina"><option value="" ${!l?'selected':''} disabled>Vyberte hodinu</option>${state.lessons.filter(x=>x.classId===classId).slice().reverse().map((x,i,a)=>`<option value="${x.id}" ${x.id===lessonId?'selected':''}>${date(x.date)} · #${a.length-i}${x.topic?' · '+E(x.topic):''}</option>`).join('')}</select></label><span class="status-pill">${l?(l.finished?'Ukončená hodina':'Prebieha evidencia'):'Pripravené na hodinu'}</span></div>`;
    if(l)html+=`<div class="lesson-meta"><label>Dátum<input id="lesson-date" type="date" min="2000-01-01" max="2100-12-31" value="${l.date}" ${l.finished?'disabled':''}></label><label>Téma hodiny · voliteľné<input id="lesson-topic" maxlength="200" value="${E(l.topic)}" placeholder="Napr. loptové hry" ${l.finished?'disabled':''}></label><button class="soft" data-action="finish">${l.finished?'Znovu otvoriť':'Ukončiť hodinu'}</button></div>`;
    html+='</section>';
    if(!l)return html+`<div class="empty"><h2>Začnite novú hodinu</h2><p>Každý žiak bude automaticky označený ✓. Zmeníte iba výnimky.</p>${cls()?'':'<button data-view="classes" class="primary">Vytvoriť triedu</button>'}</div>`+legend();
    const records=state.records.filter(r=>r.lessonId===l.id),n=m=>records.filter(r=>r.status===m).length;
    html+=`<div class="stats"><div class="stat"><div><div class="stat-label">Prítomní</div><strong>${records.length-n('–')} <small>/ ${records.length}</small></strong></div><span class="icon-circle">✓</span></div><div class="stat"><div><div class="stat-label">Cvičia</div><strong>${n('✓')}</strong></div><span class="icon-circle">✓</span></div><div class="stat"><div><div class="stat-label">Necvičia</div><strong>${records.length-n('✓')-n('–')}</strong></div><span class="icon-circle">–</span></div><div class="stat alert"><div><div class="stat-label">Otvorené prípady</div><strong>${state.cases.filter(c=>c.lessonId===l.id&&c.state==='open').length}</strong></div><span class="icon-circle">!</span></div></div>`;
    html+=`<div class="section-heading"><div><h2>Zoznam žiakov</h2><small>${l.finished?'Hodina je ukončená. Pre zmenu ju znovu otvorte.':'Ťuknite na meno a vyberte značku.'}</small></div><input id="search" class="search" type="search" aria-label="Hľadať žiaka" placeholder="Hľadať žiaka…" value="${E(search)}"></div><div class="groups">`;
    for(const g of ['boys','girls']) {
      const pupils=PHE.sorted(l.roster.filter(p=>p.group===g));
      html+=`<section class="group"><h3 class="group-heading">${g==='boys'?'Chlapci':'Dievčatá'} <span>${pupils.length}</span></h3>`;
      html+=pupils.filter(p=>name(p).toLocaleLowerCase('sk').includes(search.toLocaleLowerCase('sk'))).map(p=>{
        const r=record(l.id,p.id),open=expanded===p.id,closed=r.status==='!'&&!state.cases.some(c=>c.lessonId===l.id&&c.studentId===p.id&&c.state==='open');
        return `<div class="student ${open?'open':''}"><button class="student-toggle" data-student="${p.id}" aria-expanded="${open}" aria-controls="choices-${p.id}"><span>${E(name(p))}</span><span aria-label="${E(PHE.LABELS[r.status])}${closed?', prípad uzavretý':''}">${mark(r.status)}</span></button>${open?`<div id="choices-${p.id}" class="choices">${l.finished?'':PHE.MARKS.map(m=>`<button data-mark="${E(m)}" data-pupil="${p.id}" aria-pressed="${r.status===m}" aria-label="${E(PHE.LABELS[m])}">${mark(m)}${E(PHE.LABELS[m])}</button>`).join('')}<div class="wide">${r.status==='–'?'Neprítomnosť: úbor a necvičenie sa nevyhodnocujú.':r.status==='A'?'Nemá úbor a necvičí. Nevzniká otvorený prípad.':r.status==='Ed'||r.status==='Ep'?'Ospravedlnené necvičenie. Úbor sa nevyhodnocuje.':closed?'Prípad bol uzavretý bez ospravedlnenia.':''}</div><button class="wide" data-history="${p.id}">História zápisov</button></div>${historyFor===p.id?historyHTML(studentHistory(l.id,p.id)):''}`:''}</div>`;
      }).join('');
      html+='</section>';
    }
    return html+'</div>'+legend()+`<p class="bottom-note">Každá zmena sa ukladá automaticky. Značka A nevytvára nevyriešený prípad.</p><div class="row wrap" style="margin-top:14px"><button data-action="print">Tlač / PDF hodiny</button></div>`;
  }
  function matrixView() {
    const m=PHEExport.matrix(state,classId,from,to);
    return heading('Polročný prehľad','Každý žiak, každá hodina. Všetko v jednej tabuľke.')+`<div class="filters"><label>Trieda<select id="class-select">${options()}</select></label><label>Od<input id="date-from" type="date" value="${from}"></label><label>Do<input id="date-to" type="date" value="${to}"></label><button data-action="semester">Aktuálny polrok</button></div><div class="row wrap" style="margin-bottom:18px"><button data-action="csv">↓ CSV</button><button data-action="xlsx">↓ Excel XLSX</button><button data-action="print">Tlač / PDF</button><small>${m.lessons.length} hodín · ${m.pupils.length} žiakov</small></div><div class="table-wrap"><table class="matrix"><thead><tr><th scope="col">Žiak</th>${m.lessons.map((l,i)=>`<th scope="col"><button class="plain" data-open-lesson="${l.id}" title="Otvoriť hodinu">${date(l.date)}<br><small>#${i+1} ${E(l.topic)}</small></button></th>`).join('')}</tr></thead><tbody>${m.pupils.map(p=>`<tr><td>${E(name(p))}</td>${m.lessons.map(l=>{const r=record(l.id,p.id);return `<td>${r?mark(r.status):'<span title="Žiak nebol v zozname tejto hodiny">·</span>'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`+legend()+`<p class="hint">Kliknutím na dátum otvoríte hodinu. Prázdne pole znamená, že žiak nebol v jej zozname. Stav uzavretia ! nájdete v Prípadoch. Export obsahuje aj skupinu žiaka.</p>`;
  }
  function casesView() {
    const list=[...state.cases].sort((a,b)=>(a.state==='open'?0:1)-(b.state==='open'?0:1)||b.openedAt.localeCompare(a.openedAt));
    return heading('Nevyriešené prípady','Doplňte ospravedlnenie, keď príde. História zostáva zachovaná.',`<button data-action="print">Tlač / PDF</button>`)+(!list.length?'<div class="empty"><h2>Všetko je vybavené</h2><p>Značka ! vytvorí prípad na tomto mieste. Značka A ho nevytvára.</p></div>':list.map(c=>{
      const l=state.lessons.find(l=>l.id===c.lessonId),p=l.roster.find(p=>p.id===c.studentId);
      return `<article class="case-card ${c.state==='open'?'open-case':''}"><div class="row" style="justify-content:space-between;margin:0"><h3>${E(name(p))}</h3><span class="mark ${c.state==='open'?'issue':'excused'}">${c.state==='open'?'!':'✓'}</span></div><p>${E(l.className)} · ${date(l.date)} ${E(l.topic)}<br>Pôvodný stav: ! · pôvodný dátum ${date(c.originalDate)}<br>${c.state==='open'?'Čaká na vyriešenie':`Vyriešené: ${E(c.resolution==='without'?'bez ospravedlnenia':c.resolution.startsWith('correction:')?'oprava na '+c.resolution.slice(11):c.resolution)} · ${time(c.resolvedAt)} · ${E(c.resolvedBy)}`}</p>${c.state==='open'?`<div class="row"><button data-resolve="Ep" data-case="${c.id}">Ep · rodič</button><button data-resolve="Ed" data-case="${c.id}">Ed · lekár</button><button class="danger" data-resolve="without" data-case="${c.id}">Uzavrieť bez ospr.</button></div>`:''}<details><summary>História a pôvodný zápis</summary>${historyHTML(studentHistory(l.id,p.id))}</details><button class="plain" data-open-lesson="${l.id}">Otvoriť hodinu ↗</button></article>`;
    }).join(''))+`<p class="hint">Uzavretie bez ospravedlnenia ponechá značku !, ale prípad už nie je otvorený. Aplikácia neurčuje žiadne výchovné opatrenia. Oprava ! na inú značku sa tiež uloží do histórie.</p>`;
  }
  function editorRow(p) {return `<div class="edit-pupil ${p.active?'':'archived'}" data-id="${p.id}" data-active="${p.active}"><input name="firstName" aria-label="Krstné meno" maxlength="60" value="${E(p.firstName)}" required placeholder="Meno"><input name="lastName" aria-label="Priezvisko" maxlength="60" value="${E(p.lastName)}" required placeholder="Priezvisko"><select name="group" aria-label="Skupina"><option value="boys" ${p.group==='boys'?'selected':''}>Chlapci</option><option value="girls" ${p.group==='girls'?'selected':''}>Dievčatá</option></select><button type="button" data-archive title="${p.active?'Archivovať žiaka':'Obnoviť žiaka'}" aria-label="${p.active?'Archivovať žiaka':'Obnoviť žiaka'}">${p.active?'−':'↶'}</button></div>`;}
  function classesView() {
    const c=cls();
    return heading('Triedy a žiaci','Spoločný zoznam pre celú triedu. Chlapci a dievčatá prehľadne.')+`<form id="new-class" class="panel panel-body"><h2>Nová trieda</h2><div class="row" style="margin-top:14px"><input name="name" aria-label="Názov novej triedy" placeholder="Napr. 8. B" maxlength="60" required><button class="primary" type="submit">Vytvoriť</button></div></form>${c?`<div class="panel panel-body"><label>Upraviť triedu<select id="class-select">${options()}</select></label><form id="class-form" data-version="${c.version}"><label style="margin-top:18px">Názov triedy<input name="className" value="${E(c.name)}" maxlength="60" required></label><p class="hint">Zmeny zoznamu platia pre nové hodiny. Staršie hodiny si zachovajú pôvodné mená aj skupiny. Tlačidlo − archivuje žiaka.</p><div class="roster-editor">${['boys','girls'].flatMap(g=>PHE.sorted(c.students.filter(p=>p.group===g))).map(editorRow).join('')}</div><div class="row wrap" style="margin-top:18px"><button type="button" data-action="add-student">＋ Pridať žiaka</button><button type="submit" class="primary">Uložiť triedu</button></div><p class="hint">Platné úpravy sa uložia automaticky po opustení poľa. Pri novom žiakovi doplňte meno aj priezvisko.</p></form></div>`:''}`;
  }
  function dataView() {
    return heading('Údaje a zálohy','Vaša evidencia pod kontrolou.',`<span class="badge">PROTOTYP 1.0</span>`)+`<div class="data-grid"><section class="panel panel-body"><h2>Úplná záloha</h2><p>JSON obsahuje triedy, hodiny, značky, otvorené aj vyriešené prípady a celú históriu. Uchovajte si ho na bezpečnom mieste.</p><button class="primary" data-action="backup">↓ Stiahnuť zálohu</button></section><section class="panel panel-body"><h2>Obnoviť zo zálohy</h2><p>${remote?'Obnovu školského úložiska vykonáva správca do novej prázdnej tabuľky podľa technického návodu.':'Vyberte JSON zálohu. Pred nahradením údajov uvidíte jej obsah a počet záznamov.'}</p>${remote?'':`<label>Vybrať súbor zálohy<input id="import-file" type="file" accept=".json,application/json"></label>`}</section></div>${pendingBackup?`<div class="danger-box"><h3>Záloha je platná</h3><p class="hint">${pendingBackup.state.classes.length} tried · ${pendingBackup.state.lessons.length} hodín · ${pendingBackup.state.events.length} udalostí. Obnova nahradí aktuálnu lokálnu evidenciu. Súčasné údaje sa najprv stiahnu ako záloha a uchovajú aj v databáze pod before-restore.</p><button class="danger" data-action="restore">Nahradiť lokálne údaje</button><button data-action="cancel-restore">Zrušiť</button></div>`:''}<section class="panel panel-body"><h2>${remote?'Školské úložisko':'Lokálny režim · fiktívne údaje'}</h2><p class="hint">${remote?'Údaje sa ukladajú do školského Google Sheets. Používateľa, oprávnenia a verziu zápisu kontroluje server.':'Údaje sú uložené iba v tomto prehliadači pomocou IndexedDB. Zariadenia sa nesynchronizujú. Vymazanie dát prehliadača odstráni evidenciu, preto pravidelne vytvárajte zálohu. Tento režim používajte s fiktívnymi údajmi.'}</p><div class="row wrap"><span class="badge">${state.lessons.length} hodín</span><span class="badge">${state.events.length} zmien</span><span class="badge">${state.cases.filter(c=>c.state==='open').length} otvorených prípadov</span></div></section><section class="panel panel-body"><h2>História úprav</h2><p class="hint">Zobrazených posledných 100 zmien. Úplná história je v zálohe JSON.</p>${historyHTML(state.events.slice(-100))}</section>`;
  }
  function render() {
    selectValid();
    const n=state.cases.filter(c=>c.state==='open').length;
    $('#app').innerHTML=`<div class="layout"><aside class="sidebar"><div class="brand"><span class="brand-icon">P</span><div>PHE Register<small>Priestor pre pohyb</small></div></div><div class="nav-label">VAŠA EVIDENCIA</div><nav class="nav" aria-label="Hlavná navigácia">${navs.map(([k,t])=>`<button data-view="${k}" ${view===k?'class="active" aria-current="page"':''}>${svg(k)}<span>${t}</span>${k==='cases'&&n?`<span class="count">${n}</span>`:''}</button>`).join('')}</nav><div class="sidebar-foot"><span class="mode-dot"></span>${remote?'Školský režim':'Lokálny prototyp'}<br><small>${remote?'Google Workspace':'Iba fiktívne údaje'}<br>PHE Register / 1.0</small></div></aside><div class="workspace"><header class="topbar"><span class="crumb">Pracovný priestor &nbsp; / &nbsp; <strong>${navs.find(x=>x[0]===view)[1]}</strong></span><span class="mobile-brand"><span class="brand-icon">P</span>PHE Register</span><div class="top-right"><span class="save ${saveError?'error':''}" role="status">${busy?'◌':saveError?'!':'✓'} ${E(saveText||(remote?'Načítané zo školy':'Uložené lokálne'))}</span><button class="plain refresh" data-action="refresh" aria-label="Obnoviť údaje">↻ Obnoviť</button><span class="avatar">PHE</span></div></header><main class="main">${n?`<div class="alert-banner" role="alert"><span class="alert-symbol">!</span><div><strong>Otvorené prípady: ${n}</strong><br>Čakajú na doplnenie alebo uzavretie.</div><button data-view="cases">Zobraziť prípady →</button></div>`:''}${({lesson:lessonView,matrix:matrixView,cases:casesView,classes:classesView,data:dataView}[view])()}</main></div></div>`;
    if(busy)$('#app').querySelectorAll('button,input,select').forEach(e=>e.disabled=true);
  }
  function indicate(text,error=false) {saveText=text;saveError=error;const e=$('.save');if(e){e.textContent=(error?'! ':busy?'◌ ':'✓ ')+text;e.classList.toggle('error',error);}}
  async function mutate(command,after) {
    if(busy)return;busy=true;indicate('Ukladám…');$('#app').querySelectorAll('button,input,select').forEach(e=>e.disabled=true);
    try {state=await store.command(command);busy=false;indicate(remote?'Uložené v škole':'Uložené lokálne');if(after)after();channel?.postMessage('changed');render();return true;}
    catch(e) {busy=false;try{state=await store.read();}catch{}indicate('Zmena nepotvrdená',true);render();toast(e.message,true);return false;}
  }
  async function refresh(manual=true) {if(busy)return;if(!manual&&document.activeElement?.matches('input,select'))return;try{const latest=await store.read();if(manual||latest.revision!==state.revision||latest.storageEpoch!==state.storageEpoch){state=latest;saveError=false;saveText=remote?'Načítané zo školy':'Uložené lokálne';render();if(manual)toast('Údaje sú aktuálne.');}}catch(e){indicate('Načítanie zlyhalo',true);if(manual)toast(e.message,true);}}
  function lessonUpdate(patch) {const l=lesson();return {op:'lesson.update',id:l.id,expected:l.version,date:l.date,topic:l.topic,finished:l.finished,...patch};}
  function report() {
    if(view==='cases')return {title:'Prípady · všetky triedy',rows:[['Žiak','Trieda / hodina','Pôvodný stav / dátum','Stav prípadu'],...state.cases.map(c=>{const l=state.lessons.find(l=>l.id===c.lessonId),p=l.roster.find(p=>p.id===c.studentId);return [name(p),l.className+' / '+date(l.date),'! / '+date(c.originalDate),c.state==='open'?'Otvorený':c.resolution==='without'?'Uzavretý bez ospravedlnenia':c.resolution];})]};
    if(view==='lesson'&&lesson()){const l=lesson();return {title:l.className+' · '+date(l.date)+(l.topic?' · '+l.topic:''),rows:[['Žiak','Skupina','Značka','Otvorený prípad'],...['boys','girls'].flatMap(g=>PHE.sorted(l.roster.filter(p=>p.group===g))).map(p=>[name(p),p.group==='boys'?'Chlapci':'Dievčatá',record(l.id,p.id).status,state.cases.some(c=>c.lessonId===l.id&&c.studentId===p.id&&c.state==='open')?'Áno':'Nie'])]};}
    return {title:(cls()?.name||'Trieda')+' · '+date(from)+' – '+date(to),rows:PHEExport.matrix(state,classId,from,to).rows};
  }
  function printReport() {const r=report(),chunks=[];if(view==='matrix'){for(let i=2;i<Math.max(3,r.rows[0].length);i+=8)chunks.push(r.rows.map(row=>[...row.slice(0,2),...row.slice(i,i+8)]));}else chunks.push(r.rows);$('#print-area').innerHTML=chunks.map((rows,i)=>`<section class="print-page"><h1>PHE Register · ${E(r.title)}</h1><p>Vytlačené ${date(PHE.today())}${chunks.length>1?' · časť '+(i+1)+' / '+chunks.length:''}</p><table><thead><tr>${rows[0].map(v=>`<th>${E(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row=>'<tr>'+row.map(v=>`<td>${E(v)}</td>`).join('')+'</tr>').join('')}</tbody></table><p>✓ pripravený, cvičí · – neprítomný · A nemá úbor · ! bez ospravedlnenia · Ep rodič · Ed lekár</p><p>Stav otvorenia alebo uzavretia ! je v prehľade Prípady. Prázdne pole: žiak nebol v zozname hodiny.</p></section>`).join('');window.print();}
  $('#app').addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b||busy)return;
    if(b.dataset.view){view=b.dataset.view;expanded=null;render();return;}
    if(b.dataset.student){expanded=expanded===b.dataset.student?null:b.dataset.student;historyFor=null;render();return;}
    if(b.dataset.history){historyFor=historyFor===b.dataset.history?null:b.dataset.history;render();return;}
    if(b.dataset.mark){const r=record(lessonId,b.dataset.pupil);await mutate({op:'record.set',lessonId,studentId:r.studentId,expected:r.version,status:b.dataset.mark},()=>{expanded=null;historyFor=null;});return;}
    if(b.dataset.resolve){const c=state.cases.find(c=>c.id===b.dataset.case),r=record(c.lessonId,c.studentId);await mutate({op:'case.resolve',id:c.id,expected:c.version,expectedRecord:r.version,resolution:b.dataset.resolve});return;}
    if(b.dataset.openLesson){const l=state.lessons.find(l=>l.id===b.dataset.openLesson);classId=l.classId;lessonId=l.id;view='lesson';expanded=null;render();window.scrollTo(0,0);return;}
    if(b.hasAttribute('data-archive')){const row=b.closest('.edit-pupil'),active=row.dataset.active!=='true';row.dataset.active=String(active);row.classList.toggle('archived',!active);b.textContent=active?'−':'↶';b.setAttribute('aria-label',active?'Archivovať žiaka':'Obnoviť žiaka');if(!cls().students.some(p=>p.id===row.dataset.id)&&![...row.querySelectorAll('input')].some(i=>i.value.trim()))row.remove();await saveClass($('#class-form'));return;}
    switch(b.dataset.action) {
      case 'new-lesson': {const id=uuid();await mutate({op:'lesson.create',id,classId,expectedClass:cls().version,date:PHE.today(),topic:''},()=>{lessonId=id;expanded=null;search='';});break;}
      case 'finish': await mutate(lessonUpdate({finished:!lesson().finished}));break;
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
    const t=e.target;if(busy)return;
    if(t.closest('#class-form')){await saveClass(t.closest('#class-form'));return;}
    if(t.id==='class-select'){classId=t.value;lessonId=null;expanded=null;render();}
    if(t.id==='lesson-select'){lessonId=t.value;expanded=null;render();}
    if(t.id==='lesson-date'){if(t.checkValidity()&&t.value)await mutate(lessonUpdate({date:t.value}));else{toast('Vyberte platný dátum.',true);render();}}
    if(t.id==='lesson-topic')await mutate(lessonUpdate({topic:t.value}));
    if(t.id==='date-from'||t.id==='date-to'){const nextFrom=t.id==='date-from'?t.value:from,nextTo=t.id==='date-to'?t.value:to;if(!nextFrom||!nextTo||nextFrom>nextTo){toast('Začiatok obdobia musí byť pred koncom.',true);render();return;}from=nextFrom;to=nextTo;render();}
    if(t.id==='import-file'&&t.files[0]){try{if(t.files[0].size>15*1024*1024)throw new Error('Záloha prekračuje 15 MB.');const backup=JSON.parse(await t.files[0].text()),restored=PHE.restore(backup);pendingBackup={backup,state:restored,expected:state.revision,epoch:state.storageEpoch};render();}catch(err){toast('Zálohu nemožno načítať: '+err.message,true);}}
  });
  $('#app').addEventListener('input',e=>{if(e.target.closest('#class-form')||e.target.id==='lesson-topic')indicate('Neuložené úpravy');if(e.target.id==='search'){const pos=e.target.selectionStart;search=e.target.value;render();$('#search').focus();try{$('#search').setSelectionRange(pos,pos);}catch{}}});
  async function saveClass(form) {
    if(!form.checkValidity()){indicate('Neuložené: doplňte mená',true);return;}
    const pupils=[...form.querySelectorAll('.edit-pupil')].map(row=>({id:row.dataset.id,active:row.dataset.active==='true',firstName:row.querySelector('[name=firstName]').value.trim(),lastName:row.querySelector('[name=lastName]').value.trim(),group:row.querySelector('select').value}));
    return mutate({op:'class.update',id:classId,expected:Number(form.dataset.version),name:form.elements.className.value.trim(),students:pupils});
  }
  $('#app').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const form=e.target;
    if(form.id==='new-class'){const id=uuid();await mutate({op:'class.create',id,name:form.elements.name.value.trim(),students:[]},()=>{classId=id;lessonId=null;});}
    if(form.id==='class-form')await saveClass(form);
  });
  let channel=null;
  try {state=await store.init();if('BroadcastChannel' in window&&!remote){channel=new BroadcastChannel('phe-register');channel.onmessage=()=>refresh(false);}render();window.addEventListener('focus',()=>refresh(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false);});}
  catch(e){$('#app').innerHTML=`<div class="fatal"><h1>Evidenciu nemožno otvoriť</h1><p>${E(e.message)}</p><p>${remote?'Skontrolujte školské prihlásenie a kontaktujte správcu.':'Povoľte úložisko prehliadača. Na iPhone otvorte aplikáciu cez HTTP server podľa README; nepoužívajte náhľad súboru. Žiadne dáta neboli automaticky vymazané.'}</p><button onclick="location.reload()">Skúsiť znova</button></div>`;}
})();
