const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
let failed=false;
for(const file of fs.readdirSync(path.resolve(__dirname,'../tests')).filter(f=>f.endsWith('.test.cjs')).sort()) {
  const run=spawnSync(process.execPath,[path.resolve(__dirname,'../tests',file)],{stdio:'inherit'});
  if(run.status!==0){failed=true;if(run.error)console.error(run.error.message);}
}
process.exitCode=failed?1:0;
