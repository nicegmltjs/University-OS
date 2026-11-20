const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const demo=fs.readFileSync('demo.html','utf8');
function recurrence(source){
 const from=source.indexOf('function localDay('),to=source.indexOf('function home(){',from);
 assert.ok(from>=0&&to>from);
 const ctx={workspace:{tasks:[]},Date};
 vm.createContext(ctx);vm.runInContext(source.slice(from,to),ctx);
 return ctx;
}
for(const [name,source] of [['app',app],['demo',demo]]){
 test(name+' weekly next occurrence is correct',()=>{
  const h=recurrence(source);
  const task={date:'2026-11-16',repeat:'weekly',doneDates:{}};
  assert.equal(h.nextOccurrenceDate(task,'2026-11-17'),'2026-11-23');
  assert.equal(h.nextOccurrenceDate(task,'2026-11-16'),'2026-11-16');
 });
 test(name+' meeting delete rolls back when persistence fails',()=>{
  assert.match(source,/const before=structuredClone\(target\.meetings\);target\.meetings\.splice\(index,1\);if\(!\(await persist\(\)\)\)target\.meetings=before/);
 });
 test(name+' repeat task list uses next occurrence for toggle',()=>{
  assert.match(source,/action\("toggle",t\.id\+"@"\+\(t\.repeat&&t\.repeat!=="none"\?nextOccurrenceDate/);
 });
}
test('production waits for pending writes before workspace wipe',()=>{
 assert.match(app,/await writeQueue\.catch\(\(\)=>\{\}\)/);
});
