(function(){
 const enabled=false; // Enabled only in the built HTTPS application.
 if(!enabled)return;
 if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol)||typeof google!=='undefined')return;
 const box=document.createElement('div');box.className='pwa-status';box.setAttribute('role','status');document.body.prepend(box);
 box.textContent='Pripravujem offline aplikáciu…';
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
  let updateReady=!!reg.waiting;
  const show=()=>{box.textContent=(updateReady||reg.waiting)?'Nová verzia je pripravená. Uložte zápis a zatvorte všetky okná PHE Register. Potom aplikáciu otvorte znova.':reg.active?'Offline aplikácia pripravená · Údaje → záloha aspoň raz týždenne.':'Pripravujem offline aplikáciu…';};
  const watch=()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&reg.active)updateReady=true;show();});show();};
  reg.addEventListener('updatefound',watch);watch();navigator.serviceWorker.addEventListener('controllerchange',show);
  navigator.serviceWorker.ready.then(show);
  let checked=Date.now();
  const check=()=>{if(!document.hidden&&navigator.onLine&&Date.now()-checked>60000){checked=Date.now();reg.update().catch(()=>{});}};
  document.addEventListener('visibilitychange',check);window.addEventListener('online',check);
 }).catch(()=>{box.textContent='Offline aplikácia sa nepripravila. Pripojte sa na internet a otvorte ju znova.';});
})();
