const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('app.js','utf8');
const sql = fs.readFileSync('supabase/schema.sql','utf8');
test('server rejects missing arrays and requires future PRO expiry',()=>{
 assert.match(sql,/jsonb_typeof\(new\.data->counts\[i\]\) is distinct from 'array'/);
 assert.match(sql,/p='pro' and expiry>now\(\)/);
 assert.match(app,/!!ent\.expires_at&&new Date\(ent\.expires_at\)>new Date\(\)/);
});
test('cloud saves use conditional updates and do not retry stale writes as inserts',async()=>{
 const calls=[], alerts=[];
 let version='v1';
 const context={structuredClone,workspace:{courses:[]},user:{id:'u'},alert:m=>alerts.push(m),supa:{from(){return {update(){calls.push('update');return this},insert(){calls.push('insert');return this},eq(k,v){calls.push([k,v]);return this},select(){return this},async maybeSingle(){return {data:version?{updated_at:version}:null,error:null}}}}}};
 vm.createContext(context);
 const source=app.slice(app.indexOf('let writeQueue='),app.indexOf('const limits='));
 vm.runInContext(source+';cloudVersion="v0";',context);
 assert.equal(await vm.runInContext('persist()',context),true);
 assert.deepEqual(calls,[ 'update',['user_id','u'],['updated_at','v0'] ]);
 calls.length=0;version=null;
 assert.equal(await vm.runInContext('persist()',context),false);
 assert.deepEqual(calls,['update',['user_id','u'],['updated_at','v1']]);
 assert.equal(alerts.length,1);
 calls.length=0;
 assert.equal(await vm.runInContext('persist()',context),false);
 assert.equal(calls[0],'update');
});
