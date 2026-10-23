(function(root) {
  'use strict';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function matrix(s,classId,from,to) {
    const lessons=s.lessons.filter(l=>l.classId===classId && l.date>=from && l.date<=to).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
    const people=new Map();
    lessons.forEach(l=>l.roster.forEach(p=>people.set(p.id,p)));
    (s.classes.find(c=>c.id===classId)?.students||[]).filter(p=>p.active).forEach(p=>people.set(p.id,p));
    const pupils=['boys','girls'].flatMap(g=>PHE.sorted([...people.values()].filter(p=>p.group===g)));
    const counts={};
    const labels=lessons.map(l=>`${l.date} · ${counts[l.date]=(counts[l.date]||0)+1}${l.topic?' · '+l.topic:''}`);
    const rows=[['Žiak','Skupina',...labels],...pupils.map(p=>[p.lastName+' '+p.firstName,p.group==='boys'?'Chlapci':'Dievčatá',...lessons.map(l=>s.records.find(r=>r.lessonId===l.id&&r.studentId===p.id)?.status||'')])];
    return {rows,lessons,pupils};
  }
  function csv(rows) {
    return '\uFEFF'+rows.map(row=>row.map(v=>{let t=String(v??''); if(/^[\s]*[=+\-@\t\r\n]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');
  }
  // A small, dependency-free ZIP writer (STORE, UTF-8) for the five OOXML parts.
  const enc=new TextEncoder();
  function crc32(bytes) {let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
  function zip(files) {
    const chunks=[],central=[];let offset=0;
    const header=(len)=>{const b=new Uint8Array(len);return [b,new DataView(b.buffer)];};
    for(const [name,text] of Object.entries(files)) {
      const n=enc.encode(name),d=enc.encode(text),crc=crc32(d); const [h,v]=header(30);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,n.length,true);
      chunks.push(h,n,d); const [c,w]=header(46);
      w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,crc,true);w.setUint32(20,d.length,true);w.setUint32(24,d.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);
      central.push(c,n);offset+=h.length+n.length+d.length;
    }
    const size=central.reduce((n,b)=>n+b.length,0),[end,e]=header(22);
    e.setUint32(0,0x06054b50,true);e.setUint16(8,Object.keys(files).length,true);e.setUint16(10,Object.keys(files).length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
    const all=[...chunks,...central,end],out=new Uint8Array(offset+size+22);let p=0;all.forEach(b=>{out.set(b,p);p+=b.length;});return out;
  }
  function col(n) {let t='';for(n++;n;n=Math.floor((n-1)/26))t=String.fromCharCode(65+(n-1)%26)+t;return t;}
  function xlsx(rows) {
    const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const sheet=xml+`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="1" topLeftCell="C2" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="26" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="16384" width="20" customWidth="1"/></cols><sheetData>`+rows.map((r,i)=>`<row r="${i+1}">`+r.map((v,j)=>`<c r="${col(j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join('')+'</row>').join('')+'</sheetData></worksheet>';
    return zip({
      '[Content_Types].xml':xml+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels':xml+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':xml+`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="PHE Register" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels':xml+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml':sheet
    });
  }
  function download(data,name,type) {const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  const api={esc,matrix,csv,xlsx,download};root.PHEExport=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
