const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
for(const file of ['app.js','demo.html']){
 const source=fs.readFileSync(file,'utf8');
 const start=source.indexOf('function subjectPicker('),end=source.indexOf('let selectedJournalCourse=',start);
 assert.ok(start>=0&&end>start,'Course-first UI helpers must exist');
 const ctx={
  workspace:{
   courses:[{id:'math',name:'Mathematics'},{id:'english',name:'English'}],
   journals:[{id:'j1',title:'Week one',body:'Review',date:'2027-03-01',course_id:'math'},{id:'j2',title:'English note',body:'Study',date:'2027-03-02',course_id:'english'}],
   materials:[{id:'m1',title:'Lecture PDF',url:'https://example.com',course_id:'math'}]
  },
  editing:null,journalQuery:'',materialQuery:'',
  selectedJournalCourse:null,selectedMaterialCourse:null,journalFormOpen:false,materialFormOpen:false,
  title:()=>{},safe:x=>String(x),courseName:id=>id==='math'?'Mathematics':id==='english'?'English':'기타',
  choices:()=>'<option value="">기타</option>',limits:()=>20,cur:()=> '2027-03-03',
  previewMarkdown:x=>x,action:(name,id,label)=>'<button data-action="'+name+'" data-id="'+id+'">'+label+'</button>',
  validResourceUrl:()=>true
 };
 vm.createContext(ctx);
 vm.runInContext(source.slice(start,end)+'\nthis.journals=journals;this.materials=materials;this.subjectPicker=subjectPicker',ctx);
 test(file+' first journal screen shows courses, not all records',()=>{
  const html=ctx.journals();
  assert.match(html,/Mathematics/);
  assert.match(html,/English/);
  assert.match(html,/data-action="selectSubject"/);
  assert.doesNotMatch(html,/Week one/);
  assert.doesNotMatch(html,/journalForm/);
 });
 test(file+' first materials screen shows course cards and compact add',()=>{
  const html=ctx.materials();
  assert.match(html,/data-action="addSubjectRecord"/);
  assert.doesNotMatch(html,/Lecture PDF/);
 });
 test(file+' selected course shows only matching journal entries',()=>{
  ctx.selectedJournalCourse='math';
  const html=ctx.journals();
  assert.match(html,/Week one/);
  assert.doesNotMatch(html,/English note/);
  assert.match(html,/data-action="backSubjects"/);
 });
 test(file+' selected course shows only matching material entries',()=>{
  ctx.selectedMaterialCourse='math';
  const html=ctx.materials();
  assert.match(html,/Lecture PDF/);
  assert.match(html,/자료 열기/);
 });
 test(file+' add button reveals form and preselects course',()=>{
  ctx.journalFormOpen=true;
  const html=ctx.journals();
  assert.match(html,/id="journalForm"/);
  assert.match(source,/choices\(entry\?\.course_id\|\|selectedJournalCourse\|\|""\)/);
 });
}
