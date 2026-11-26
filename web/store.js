(function(root) {
  'use strict';
  const uuid=()=>crypto.randomUUID ? crypto.randomUUID() : 'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  class LocalStore {
    constructor(actor='Lokálny učiteľ') {this.actor=actor;}
    async init() {
      this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('phe-register-v1',1); r.onupgradeneeded=()=>r.result.createObjectStore('data'); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); r.onblocked=()=>reject(new Error('Zatvorte ostatné karty aplikácie.'));});
      this.db.onversionchange=()=>this.db.close();
      const state=await this.transact((state,store)=>{this.fresh=!state;const marker=store.get('upgrade-v1.2-initialized');marker.onsuccess=()=>{if(!marker.result){if(state)store.put(state,'before-v1.2');store.put(true,'upgrade-v1.2-initialized');}};return state || {...PHE.demo(),storageEpoch:uuid()};});this.epoch=state.storageEpoch;return state;
    }
    transact(change) {
      return new Promise((resolve,reject)=>{
        const tx=this.db.transaction('data','readwrite'), store=tx.objectStore('data'); let result,problem;
        const r=store.get('state');
        r.onsuccess=()=>{try { result=change(r.result,store); store.put(result,'state'); } catch(e) {problem=e;tx.abort();}};
        tx.oncomplete=()=>resolve(result); tx.onabort=()=>reject(problem || tx.error || new Error('Zmena sa neuložila.')); tx.onerror=()=>{};
      });
    }
    read() { return new Promise((resolve,reject)=>{const r=this.db.transaction('data').objectStore('data').get('state');r.onsuccess=()=>{this.epoch=r.result.storageEpoch;resolve(r.result);};r.onerror=()=>reject(r.error);}); }
    command(command, requestId=uuid()) { const epoch=this.epoch,actor=this.actor;return this.transact(state=>{if(state.storageEpoch!==epoch)PHE.fail('CONFLICT','V inej karte bola obnovená záloha. Obnovte údaje a vyberte zmenu znova.');return PHE.apply(state,command,{id:requestId,at:new Date().toISOString(),actor});}); }
    upgradeBackup() {return new Promise((resolve,reject)=>{const r=this.db.transaction('data').objectStore('data').get('before-v1.2');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
    async restore(backup,expected,expectedEpoch=this.epoch) {
      const imported=PHE.restore(backup);
      const result=await this.transact((current,store)=>{if(current.revision!==expected||current.storageEpoch!==expectedEpoch) PHE.fail('CONFLICT','Údaje sa zmenili. Zopakujte obnovu z aktuálneho prehľadu.');store.put(current,'before-restore');return {...imported,storageEpoch:uuid()};});this.epoch=result.storageEpoch;return result;
    }
  }
  class GoogleStore {
    call(action,payload={}) { return new Promise((resolve,reject)=>google.script.run.withSuccessHandler(r=>{if(r.ok) {this.actor=r.actor;resolve(r.state);}else {const e=new Error(r.message);e.code=r.code;reject(e);}}).withFailureHandler(()=>reject(new Error('Spojenie so školským serverom zlyhalo. Obnovte údaje; server mohol zmenu uložiť.'))).api({action,...payload})); }
    init() {return this.read();} read() {return this.call('read');}
    command(command,requestId=uuid()) {return this.call('command',{command,requestId});}
  }
  root.PHEStore={LocalStore,GoogleStore,uuid};
})(globalThis);
