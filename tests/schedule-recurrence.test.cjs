const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
for(const file of ['app.js','demo.html']){
 const source=fs.readFileSync(file,'utf8');
 const start=source.indexOf('function localDay(');
 const end=source.indexOf('function home(){',start);
 assert.ok(start>=0&&end>start,'Schedule functions must exist');
 const ctx={Date,workspace:{tasks:[]}};
 vm.createContext(ctx);
 vm.runInContext(source.slice(start,end),ctx);
 const task={id:'t',title:'Weekly',date:'2027-03-01',kind:'task',repeat:'weekly',done:false,doneDates:{'2027-03-08':true}};
 test(file+' weekly recurrence occurs on matching weekdays',()=>{
  assert.equal(ctx.occursOn(task,'2027-03-01'),true);
  assert.equal(ctx.occursOn(task,'2027-03-08'),true);
  assert.equal(ctx.occursOn(task,'2027-03-09'),false);
  assert.equal(ctx.occursOn(task,'2027-02-22'),false);
 });
 test(file+' completion is tracked per recurrence',()=>{
  assert.equal(ctx.occurrenceDone(task,'2027-03-08'),true);
  assert.equal(ctx.occurrenceDone(task,'2027-03-15'),false);
 });
 test(file+' upcoming excludes event kind and completed occurrences',()=>{
  ctx.workspace.tasks=[task,{id:'e',title:'Event',date:'2027-03-08',kind:'event',repeat:'none',done:false}];
  const upcoming=ctx.pendingUpcoming('2027-03-08',8);
  assert.equal(upcoming.some(t=>t.kind==='event'),false);
  assert.equal(upcoming.some(t=>t.occurrenceDate==='2027-03-08'),false);
  assert.equal(upcoming.some(t=>t.occurrenceDate==='2027-03-15'),true);
 });
 test(file+' next weekly occurrence respects start date',()=>{
  assert.equal(ctx.nextOccurrenceDate(task,'2027-03-09'),'2027-03-15');
 });
}
