/* Pure timetable selection: never creates or changes attendance lessons. */
(function(root) {
  'use strict';
  const DAYS=['Pondelok','Utorok','Streda','Štvrtok','Piatok'];
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function clock(now=new Date()) {
    const p=Object.fromEntries(formatter.formatToParts(now).map(x=>[x.type,x.value]));
    const date=p.year+'-'+p.month+'-'+p.day;
    return {date,day:new Date(date+'T12:00:00Z').getUTCDay(),time:p.hour+':'+p.minute};
  }
  function entries(state,actor) {return (state.schedule||[]).filter(e=>!e.deleted && e.owner===actor);}
  function candidate(state,actor,now=new Date()) {
    const at=clock(now);
    if(at.day<1||at.day>5)return null;
    const today=entries(state,actor).filter(e=>e.day===at.day && state.classes.some(c=>c.id===e.classId)).sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
    const current=today.find(e=>e.start<=at.time && at.time<e.end);
    const next=current||today.find(e=>e.start>at.time);
    return next?{...next,reason:current?'current':'next',date:at.date}:null;
  }
  function select(state,context) {
    const exists=id=>state.classes.some(c=>c.id===id),current=exists(context.currentClassId)?context.currentClassId:null;
    // Both saved unfinished lessons and unsaved form edits protect the current class.
    if(current && (context.busy||context.editing||context.working||context.historical))return {classId:current,reason:'protected',slot:null};
    if(current && context.manual)return {classId:current,reason:'manual',slot:null};
    const slot=candidate(state,context.actor,context.now);
    if(slot)return {classId:slot.classId,reason:slot.reason,slot};
    return {classId:exists(context.lastManualClassId)?context.lastManualClassId:current||state.classes[0]?.id,reason:'fallback',slot:null};
  }
  const api={DAYS,clock,entries,candidate,select};
  root.PHETimetable=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
