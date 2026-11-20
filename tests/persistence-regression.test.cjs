const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function extract(source,begin,end){
 const start=source.indexOf(begin),stop=source.indexOf(end,start);
 assert.ok(start>=0&&stop>start,'Required persistence implementation is missing');
 return source.slice(start,stop);
}
for(const file of ['app.js','demo.html']){
 const source=fs.readFileSync(file,'utf8');
 const block=extract(source,'async function change(', 'document.addEventListener("click"',);
 test(file+' failed creation restores the original collection',async()=>{
  const context={workspace:{tasks:[{id:'old'}]},persist:async()=>false,render:()=>{},structuredClone};
  vm.createContext(context);
  vm.runInContext(block+'\nthis.change=change',context);
  const ok=await context.change('tasks',{id:'new'});
  assert.equal(ok,false);
  assert.deepEqual(context.workspace.tasks.map(t=>t.id),['old']);
 });
 test(file+' successful creation retains the new record',async()=>{
  const context={workspace:{tasks:[]},persist:async()=>true,render:()=>{},structuredClone};
  vm.createContext(context);
  vm.runInContext(block+'\nthis.change=change',context);
  assert.equal(await context.change('tasks',{id:'new'}),true);
  assert.deepEqual(context.workspace.tasks.map(t=>t.id),['new']);
 });
 test(file+' failed deletion restores the original collection',async()=>{
  const context={workspace:{tasks:[{id:'old'}]},persist:async()=>false,render:()=>{},structuredClone};
  vm.createContext(context);
  vm.runInContext(block+'\nthis.change=change',context);
  assert.equal(await context.change('tasks',{id:'old'},true),false);
  assert.deepEqual(context.workspace.tasks.map(t=>t.id),['old']);
 });
 test(file+' edit form retains edit state on save failure',()=>{
  assert.match(source,/const saved=await persist\(\);if\(!saved\)Object\.assign\(current,before\);else editing=null/);
 });
}
test('production cloud writes are queued and account scoped',()=>{
 const source=fs.readFileSync('app.js','utf8');
 assert.match(source,/const snap=structuredClone\(workspace\),owner=user\?\.id/);
 assert.match(source,/writeQueue\.catch\(\(\)=>\{\}\)\.then/);
 assert.match(source,/await writeQueue\.catch\(\(\)=>\{\}\);const \{data:\{user:u\}\}/);
});
test('demo handles localStorage quota errors',()=>{
 const source=fs.readFileSync('demo.html','utf8');
 assert.match(source,/async function persist\(\)\{try\{localStorage\.setItem/);
 assert.match(source,/catch\(err\)\{alert\("데모 데이터 저장 실패/);
});
