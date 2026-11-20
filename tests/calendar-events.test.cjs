const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

for(const file of ['app.js','demo.html']){
 const source=fs.readFileSync(file,'utf8');
 test(file+' calendar shows non-class events, assignments, exams without scheduled classes',()=>{
  const start=source.indexOf('function calendar(){');
  const end=source.indexOf('function settings(){',start);
  assert.ok(start>=0&&end>start);
  const now=new Date();
  const date=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const items=[
   {title:'Standalone appointment',kind:'event',occurrenceComplete:false},
   {title:'Assignment deadline',kind:'task',occurrenceComplete:false},
   {title:'Exam date',kind:'exam',occurrenceComplete:true}
  ];
  const context={
   Date,monthOffset:0,workspace:{courses:[{name:'DO NOT DISPLAY CLASS',meetings:[{day:1,start:'09:00'}]}]},
   datedTasks:d=>d===date?items:[],cur:()=>date,safe:x=>String(x),title:()=>{}
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start,end),context);
  const html=context.calendar();
  assert.match(html,/Standalone appointment/);
  assert.match(html,/Assignment deadline/);
  assert.match(html,/Exam date/);
  assert.doesNotMatch(html,/DO NOT DISPLAY CLASS/);
  assert.match(html,/cal-event/);
  assert.match(html,/data-page="tasks"/);
 });
 test(file+' accepts independent event kind and excludes it from completion counts',()=>{
  assert.match(source,/\["task","exam","event"\]\.includes\(t\.kind\)/);
  assert.match(source,/\["event","기타 일정"\]/);
  assert.match(source,/filter\(x=>x\.kind!=="event"&&!x\.occurrenceComplete\)/);
  assert.match(source,/if\(item\.kind==="event"\)return/);
  assert.match(source,/t\.kind==="event"\?"":action\("toggle"/);
 });
}
