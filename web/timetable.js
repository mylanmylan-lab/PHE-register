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
  function calendarDay(state,actor,day,requireTeaching=false) {
    const entries=(state.calendar||[]).filter(e=>!e.deleted&&e.owner===actor),within=e=>e.from<=day&&day<=e.to;
    if(entries.some(e=>e.kind==='break'&&within(e)))return false;
    const teaching=entries.filter(e=>e.kind==='teaching');
    return teaching.length?teaching.some(within):!requireTeaching;
  }
  function skipped(state,actor,id,date) {return (state.skipped||[]).some(e=>e.owner===actor&&e.slotId===id&&e.date===date&&e.skipped);}
  function candidate(state,actor,now=new Date()) {
    const at=clock(now);
    if(at.day<1||at.day>5||!calendarDay(state,actor,at.date))return null;
    const today=entries(state,actor).filter(e=>e.day===at.day && (!e.validFrom||e.validFrom<=at.date)&&(!e.validTo||at.date<=e.validTo)&&!skipped(state,actor,e.id,at.date)&&state.classes.some(c=>c.id===e.classId)).sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
    const current=today.find(e=>e.start<=at.time && at.time<e.end);
    const next=current||today.find(e=>e.start>at.time);
    return next?{...next,reason:current?'current':'next',date:at.date}:null;
  }
  // A read-only checklist, never attendance. Teaching intervals must be configured explicitly.
  function missing(state,actor,from,to,now=new Date()) {
    const at=clock(now),out=[];let day=from,count=0;
    while(day<=to&&day<=at.date&&count++<366) {
      const weekday=new Date(day+'T12:00:00Z').getUTCDay();
      if(weekday>0&&weekday<6&&calendarDay(state,actor,day,true))for(const slot of entries(state,actor)) {
        const created=state.events.find(e=>e.command.op==='schedule.upsert'&&e.command.id===slot.id)?.at.slice(0,10);
        if(slot.day!==weekday||day<(slot.validFrom||created||at.date)||(slot.validTo&&day>slot.validTo)||day===at.date&&slot.end>at.time)continue;
        if(skipped(state,actor,slot.id,day)||state.lessons.some(l=>l.owner===actor&&l.slotId===slot.id&&l.date===day))continue;
        // Existing manual or legacy attendance is never counted as a missing scheduled record.
        if(state.lessons.some(l=>l.classId===slot.classId&&l.date===day&&(!l.start||l.owner===actor&&l.start<slot.end&&slot.start<l.end)))continue;
        out.push({...slot,date:day});
      }
      const next=new Date(day+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);day=next.toISOString().slice(0,10);
    }
    return out;
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
  const api={DAYS,clock,entries,calendarDay,skipped,candidate,missing,select};
  root.PHETimetable=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
