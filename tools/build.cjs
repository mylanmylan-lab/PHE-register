const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
let html=read('web/index.html').replace('<script src="pwa.js"></script>','').replace(/<link rel="(?:manifest|apple-touch-icon)"[^>]*>/g,'').replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+read('web/style.css')+'</style>');
for(const f of ['domain.js','store.js','export.js','timetable.js','app.js'])html=html.replace(`<script src="${f}"></script>`,()=>'<script>'+read('web/'+f).replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync(path.join(root,'PHE-Register.html'),html);
const PHE=require('../web/domain.js');
fs.writeFileSync(path.join(root,'examples/fiktivne-udaje.json'),JSON.stringify(PHE.backup(PHE.demo()),null,2)+'\n');
if(fs.existsSync(path.join(root,'google-apps-script/Code.gs'))) {
  fs.writeFileSync(path.join(root,'google-apps-script/Index.html'),html);
  fs.writeFileSync(path.join(root,'google-apps-script/Domain.gs'),read('web/domain.js'));
}
console.log('Hotové: PHE-Register.html, fiktívna záloha'+(fs.existsSync(path.join(root,'google-apps-script/Code.gs'))?', Apps Script Index.html a Domain.gs.':'.'));

// Publish only the static shell, never repository files or personal backups.
const crypto=require('node:crypto'),dest=path.join(root,'dist');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(path.join(root,'web'),dest,{recursive:true});
fs.writeFileSync(path.join(dest,'pwa.js'),read('web/pwa.js').replace('const enabled=false','const enabled=true'));
const files=fs.readdirSync(dest,{recursive:true}).filter(f=>fs.statSync(path.join(dest,f)).isFile()).sort();
const version=crypto.createHash('sha256').update(Buffer.concat(files.map(f=>fs.readFileSync(path.join(dest,f))))).digest('hex').slice(0,16);
fs.writeFileSync(path.join(dest,'sw.js'),read('web/sw.js').replace('__VERSION__',version));
