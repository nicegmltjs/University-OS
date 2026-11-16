// Run: node --test tests/recurring-tasks.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');
const from=src.indexOf('function localDay(');
const to=src.indexOf('function home(){',from);
assert.ok(from>=0&&to>from,"recurrence helpers should be present");
const sandbox={workspace:{tasks:[]},Date};
vm.createContext(sandbox);
vm.runInContext(src.slice(from,to),sandbox);
const {occursOn,occurrenceDone,datedTasks,pendingUpcoming}=sandbox;
test('weekly occurrence only on matching weekdays',()=>{
 const t={id:'x',date:'2026-11-16',repeat:'weekly',doneDates:{}};
 assert.equal(occursOn(t,'2026-11-16'),true);
 assert.equal(occursOn(t,'2026-11-17'),false);
 assert.equal(occursOn(t,'2026-11-23'),true);
 assert.equal(occursOn(t,'2026-11-09'),false);
});
test('daily task appears on dates after start',()=>{
 const t={id:'y',date:'2026-11-16',repeat:'daily',doneDates:{}};
 assert.equal(occursOn(t,'2026-11-17'),true);
 assert.equal(occursOn(t,'2026-11-15'),false);
});
test('completion status stays separate for each occurrence',()=>{
 const t={id:'x',date:'2026-11-16',repeat:'weekly',doneDates:{'2026-11-16':true}};
 assert.equal(occurrenceDone(t,'2026-11-16'),true);
 assert.equal(occurrenceDone(t,'2026-11-23'),false);
});
test('legacy one-time task retains completed boolean',()=>{
 const t={id:'z',date:'2026-11-16',done:true};
 assert.equal(occurrenceDone(t,'2026-11-16'),true);
 assert.equal(occursOn(t,'2026-11-23'),false);
});
test('outstanding old one-off tasks remain visible, old repeated instances do not flood home',()=>{
 sandbox.workspace.tasks=[
 {id:'old',title:'old',date:'2026-11-01',done:false},
 {id:'week',title:'week',date:'2026-11-02',repeat:'weekly',done:false,doneDates:{}}
 ];
 const result=pendingUpcoming('2026-11-16',7);
 assert.ok(result.some(x=>x.id==='old'&&x.occurrenceDate==='2026-11-01'));
 assert.equal(result.filter(x=>x.id==='week').length,1);
 assert.equal(result.find(x=>x.id==='week').occurrenceDate,'2026-11-16');
});
