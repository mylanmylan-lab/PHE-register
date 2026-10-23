/* Generates an editor-only Apps Script helper. It never connects to Google. */
const fs=require('node:fs'),path=require('node:path'),PHE=require('../web/domain.js');
const [input,output]=process.argv.slice(2);
if(!input||!output){console.error('Použitie: node tools/prepare-restore.cjs zaloha.json work/RestoreData.gs');process.exit(1);}
const text=fs.readFileSync(input,'utf8');if(Buffer.byteLength(text)>15*1024*1024)throw new Error('Limit 15 MB.');
const backup=JSON.parse(text),state=PHE.restore(backup);
if(state.events.length>10000||state.events.some(e=>JSON.stringify(e).length>40000))throw new Error('Záloha prekračuje limity prototypu Apps Script.');
const code=`/* Generated offline. Contains backup data. Keep private; delete after verified restore.
   Only restores into an initialized, EMPTY Events sheet. Run from the editor as admin. */
function restoreBackupIntoEmpty_() {
  var user=admin_();
  var backup=${JSON.stringify(backup)};
  var state=PHE.restore(backup);
  return locked_(function() {
    var sh=sheet_(user.config);
    if(sh.getLastRow()!==1)PHE.fail('CONFIG','Obnova vyžaduje nové prázdne úložisko. Existujúce údaje sa neprepíšu.');
    if(state.events.length) {
      sh.getRange(2,1,state.events.length,2).setValues(state.events.map(function(e,i){return [i+1,JSON.stringify(e)];}));
      SpreadsheetApp.flush();
    }
    var check=stateFromSheet_(sh);
    if(JSON.stringify(PHE.backup(check))!==JSON.stringify(backup))PHE.fail('STORAGE','Obnovu sa nepodarilo overiť.');
    return 'Obnovené: '+check.events.length+' udalostí. Správca: '+user.email+'. Pred sprístupnením vykonajte akceptačné testy.';
  });
}
`;
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,code,{flag:'wx'});console.log('Pripravené pre nové prázdne úložisko: '+output+'. Žiadne údaje neboli odoslané.');
