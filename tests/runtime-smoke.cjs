const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const frontend=path.join(root,'frontend');
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.isFile()&&p.endsWith('.js'))files.push(p)}}
walk(path.join(frontend,'scripts'));
for(const file of files){execFileSync(process.execPath,['--check',file],{stdio:'inherit'})}
const forbidden=['locacollection.github.io','qvvrjogeqranowfseivh.supabase.co','product_reviews','order_customer_actions','archived_orders','admin_users','contact_email'];
const text=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
for(const token of forbidden){if(text.includes(token))throw new Error('Forbidden legacy/schema reference remains in frontend scripts: '+token)}
const config=fs.readFileSync(path.join(frontend,'scripts','config.js'),'utf8');
if(!config.includes('ewldqjmyijfhrdenwqfn.supabase.co'))throw new Error('Bhatti Supabase configuration missing');
if(!fs.existsSync(path.join(frontend,'index.html')))throw new Error('Storefront entrypoint missing');
if(!fs.existsSync(path.join(frontend,'admin','index.html')))throw new Error('Admin entrypoint missing');
console.log('PASS: Bhatti frontend scripts parse and legacy schema/backend references are absent.');
