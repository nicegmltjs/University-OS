const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
const start=source.indexOf('let writeQueue=Promise.resolve();');
const end=source.indexOf('const limits=',start);
assert.ok(start>=0&&end>start,'Cloud persistence function must exist');
const code=source.slice(start,end)+'\nthis.persist=persist;this.setWorkspace=x=>{workspace=x};this.setUser=x=>{user=x};';
function harness(upsert){
 const calls=[];
 const ctx={
  Promise,structuredClone,workspace:{tasks:[]},user:{id:'owner-A'},
  supa:{from:table=>{assert.equal(table,'workspaces');return {upsert:async(payload,opts)=>{calls.push({payload,opts});return upsert(payload);}}}},
  alert:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext(code,ctx);
 return {ctx,calls};
}
test('cloud persistence snapshots data at submission time',async()=>{
 let release;
 const wait=new Promise(resolve=>{release=resolve});
 const h=harness(async()=>{await wait;return {error:null}});
 const first=h.ctx.persist();
 h.ctx.workspace.tasks.push({id:'later'});
 const second=h.ctx.persist();
 release();
 assert.equal(await first,true);
 assert.equal(await second,true);
 assert.equal(h.calls.length,2);
 assert.equal(h.calls[0].payload.data.tasks.length,0);
 assert.equal(h.calls[1].payload.data.tasks.length,1);
});
test('cloud persistence never writes a different user id',async()=>{
 const h=harness(async()=>({error:null}));
 await h.ctx.persist();
 assert.equal(h.calls[0].payload.user_id,'owner-A');
 assert.equal(h.calls[0].opts.onConflict,'user_id');
});
test('failed cloud write does not block subsequent saves',async()=>{
 let count=0;
 const h=harness(async()=>++count===1?{error:new Error('network')}:{error:null});
 assert.equal(await h.ctx.persist(),false);
 assert.equal(await h.ctx.persist(),true);
 assert.equal(h.calls.length,2);
});
test('unauthenticated save is rejected',async()=>{
 const h=harness(async()=>({error:null}));
 h.ctx.setUser(null);
 assert.equal(await h.ctx.persist(),false);
 assert.equal(h.calls.length,0);
});
