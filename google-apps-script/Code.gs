/* PHE Register 1.2 — prepared backend, not deployed.
 * Deploy as USER_ACCESSING, domain-only. Never execute as owner.
 * Only api() and doGet() are public. Helpers end in underscore.
 * Sheet Events: one committed event per row; projections are rebuilt in memory.
 */
var PHE_MAX_EVENTS_ = 10000;

function config_() {
  var p=PropertiesService.getScriptProperties();
  var cfg={sheetId:p.getProperty('SPREADSHEET_ID'),domain:(p.getProperty('WORKSPACE_DOMAIN')||'').trim().toLowerCase(),teachers:(p.getProperty('ALLOWED_TEACHERS')||'').split(',').map(function(v){return v.trim().toLowerCase();}).filter(Boolean),admins:(p.getProperty('ADMIN_EMAILS')||'').split(',').map(function(v){return v.trim().toLowerCase();}).filter(Boolean)};
  if(!cfg.sheetId || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cfg.domain) || !cfg.teachers.length) PHE.fail('CONFIG','Školské prostredie ešte nie je nakonfigurované.');
  return cfg;
}
function teacher_() {
  var cfg=config_();
  var active=(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
  var effective=(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();
  if(!active || active!==effective || active.split('@').length!==2 || active.split('@')[1]!==cfg.domain || cfg.teachers.indexOf(active)<0) PHE.fail('FORBIDDEN','Prístup zamietnutý. Použite výslovne oprávnený školský účet; nasadenie musí bežať ako prihlásený používateľ.');
  return {email:active,config:cfg};
}
function admin_() {var user=teacher_();if(user.config.admins.indexOf(user.email)<0)PHE.fail('FORBIDDEN','Operácia je dostupná len nakonfigurovanému správcovi.');return user;}
function locked_(fn) {
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))PHE.fail('BUSY','Úložisko práve používa iný učiteľ. Skúste to znova.');
  try{return fn();}finally{lock.releaseLock();}
}
function sheet_(cfg) {
  var sh=SpreadsheetApp.openById(cfg.sheetId).getSheetByName('Events');
  if(!sh)PHE.fail('CONFIG','Správca musí najprv inicializovať úložisko.');
  var head=sh.getRange(1,1,1,2).getValues()[0];
  if(head[0]!=='sequence' || head[1]!=='event_json')PHE.fail('CORRUPT','Hlavička úložiska bola zmenená. Kontaktujte správcu.');
  return sh;
}
function stateFromSheet_(sh) {
  var count=sh.getLastRow()-1;
  if(count>PHE_MAX_EVENTS_)PHE.fail('LIMIT','Limit prototypu prekročený. Kontaktujte správcu; záznamy nevymazávajte.');
  var events=[];
  if(count>0) {
    var rows=sh.getRange(2,1,count,2).getValues();
    rows.forEach(function(row,i){
      if(row[0]!==i+1 || typeof row[1]!=='string' || row[1].length>40000)PHE.fail('CORRUPT','Nekonzistentné úložisko. Kontaktujte správcu.');
      try{events.push(JSON.parse(row[1]));}catch(e){PHE.fail('CORRUPT','Poškodený zápis v úložisku. Kontaktujte správcu.');}
    });
  }
  try{return PHE.restore({format:'PHE-Register',schema:1,events:events});}catch(e){PHE.fail('CORRUPT','História úložiska neprešla kontrolou. Kontaktujte správcu.');}
}
function doGet() {
  try {teacher_();return HtmlService.createHtmlOutputFromFile('Index').setTitle('PHE Register').addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');}
  catch(e) {return HtmlService.createHtmlOutput('<!doctype html><html lang="sk"><meta charset="utf-8"><title>PHE Register</title><body><h1>Prístup zamietnutý</h1><p>Otvorte aplikáciu oprávneným školským účtom. Ak problém pretrváva, kontaktujte správcu.</p></body></html>');}
}
function api(request) {
  try {
    var user=teacher_();
    if(!request || typeof request!=='object' || Array.isArray(request) || JSON.stringify(request).length>30000)PHE.fail('VALIDATION','Neplatná alebo príliš veľká požiadavka.');
    var fields=request.action==='read'?['action']:['action','command','requestId'];
    if(Object.keys(request).some(function(k){return fields.indexOf(k)<0;}))PHE.fail('VALIDATION','Neznáme pole požiadavky.');
    if(request.action!=='read' && request.action!=='command')PHE.fail('VALIDATION','Neznáma operácia.');
    return locked_(function(){
      var sh=sheet_(user.config),state=stateFromSheet_(sh);
      if(request.action==='read')return {ok:true,state:state,actor:user.email};
      // Legacy commands remain replayable for old backups, but new server writes
      // must use the 1.2 ownership/group/duplicate protections.
      if(request.command&&request.command.op==='lesson.create'&&request.command.group===undefined)PHE.fail('VALIDATION','Novú hodinu vytvorte aktualizovanou aplikáciou 1.2 so skupinou a časom.');
      if(request.command&&request.command.op==='lesson.update'&&request.command.finished&&typeof request.command.expectedRevision!=='number')PHE.fail('VALIDATION','Potvrdenie dochádzky vyžaduje aktuálny prehľad aplikácie 1.2.');
      var next=PHE.apply(state,request.command,{id:request.requestId,at:new Date().toISOString(),actor:user.email});
      if(next===state)return {ok:true,state:state,actor:user.email}; // retry after uncertain network result
      if(state.events.length>=PHE_MAX_EVENTS_)PHE.fail('LIMIT','Dosiahnutý limit 10 000 zmien prototypu. Vytvorte zálohu a kontaktujte správcu.');
      var event=next.events[next.events.length-1],json=JSON.stringify(event);
      if(json.length>40000)PHE.fail('VALIDATION','Záznam prekračuje kapacitu bunky.');
      // One range write, no separate mutable record/audit/case writes.
      var target=sh.getRange(next.revision+1,1,1,2);
      target.setValues([[next.revision,json]]);
      SpreadsheetApp.flush();
      var saved=target.getValues()[0];
      if(saved[0]!==next.revision || saved[1]!==json)PHE.fail('STORAGE','Zápis sa nepodarilo overiť. Obnovte údaje pred ďalšou zmenou.');
      return {ok:true,state:next,actor:user.email};
    });
  } catch(e) {
    var known=['CONFIG','FORBIDDEN','BUSY','CORRUPT','VALIDATION','CONFLICT','OVERLAP','NOT_FOUND','LIMIT','STORAGE'];
    return {ok:false,code:known.indexOf(e.code)>=0?e.code:'STORAGE',message:known.indexOf(e.code)>=0?e.message:'Úložisko neodpovedá alebo chýba oprávnenie k tabuľke. Obnovte údaje; zápis už mohol prebehnúť.'};
  }
}
// Run once in the editor as a configured administrator. Does not erase existing data.
function initialize_() {
  var user=admin_();
  return locked_(function(){
    var book=SpreadsheetApp.openById(user.config.sheetId),sh=book.getSheetByName('Events');
    if(sh && sh.getLastRow()>0)PHE.fail('CONFIG','Úložisko už existuje. Inicializácia ho neprepíše.');
    sh=sh || book.insertSheet('Events');sh.getRange(1,1,1,2).setValues([['sequence','event_json']]);sh.setFrozenRows(1);SpreadsheetApp.flush();
    return 'Úložisko je pripravené. Teraz vykonajte akceptačné testy s fiktívnymi údajmi.';
  });
}
function seedDemo_() {
  var user=admin_();
  return locked_(function(){var sh=sheet_(user.config);if(sh.getLastRow()!==1)PHE.fail('CONFIG','Fiktívne dáta možno vložiť iba do prázdneho úložiska.');var event=PHE.demo().events[0];event.actor=user.email;event.at=new Date().toISOString();event.id=Utilities.getUuid();sh.getRange(2,1,1,2).setValues([[1,JSON.stringify(event)]]);SpreadsheetApp.flush();return 'Vložená fiktívna trieda s 20 žiakmi.';});
}
