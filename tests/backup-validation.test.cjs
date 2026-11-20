// Run with: node --test tests/backup-validation.test.cjs
// Extract the exact production function so test and app logic cannot silently diverge.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
const first=source.indexOf('function validResourceUrl(');
const last=source.indexOf('document.addEventListener("change"',first);
assert.ok(first>=0&&last>first,'Validator must be defined');
const validate=vm.runInNewContext(source.slice(first,last)+'\nvalidateBackupFile',{URL});
const initial=()=>({
 version:2,data:{
  settings:{semester:'2027 봄',start:'2027-03-01',end:'2027-06-20',theme:'sage',dark:false},
  courses:[{id:'c',name:'수학',room:'101',meetings:[{day:1,start:'09:00',end:'10:15'}]}],
  tasks:[{id:'t',title:'과제',date:'2027-03-02',kind:'task',done:false,course_id:'c'}],
  journals:[],materials:[{id:'m',title:'자료',url:'https://example.com',course_id:'c'}]
 }
});
test('valid FREE backup',()=>assert.equal(validate(initial(),false).courses.length,1));
test('FREE rejects premium theme',()=>{const d=initial();d.data.settings.theme='rose';assert.throws(()=>validate(d,false));});
test('PRO allows premium theme',()=>{const d=initial();d.data.settings.theme='rose';assert.ok(validate(d,true));});
test('invalid class hours rejected',()=>{const d=initial();d.data.courses[0].meetings[0].end='08:00';assert.throws(()=>validate(d,true));});
test('unsafe resource URL rejected',()=>{const d=initial();d.data.materials[0].url='javascript:alert(1)';assert.throws(()=>validate(d,true));});
test('FREE journal cap enforced',()=>{const d=initial();d.data.journals=Array.from({length:21},(_,i)=>({id:'j'+i,title:'기록',body:'내용',date:'2027-03-02',course_id:'c'}));assert.throws(()=>validate(d,false));});
test('PRO can import 21 journals',()=>{const d=initial();d.data.journals=Array.from({length:21},(_,i)=>({id:'j'+i,title:'기록',body:'내용',date:'2027-03-02',course_id:'c'}));assert.ok(validate(d,true));});
test('duplicate IDs rejected',()=>{const d=initial();d.data.tasks[0].id='c';assert.throws(()=>validate(d,true));});

test('invalid calendar date rejected',()=>{const d=initial();d.data.tasks[0].date='2027-02-30';assert.throws(()=>validate(d,true));});
test('invalid recurring completion date rejected',()=>{const d=initial();d.data.tasks[0].repeat='weekly';d.data.tasks[0].doneDates={'2027-02-30':true};assert.throws(()=>validate(d,true));});
test('invalid recurring completion type rejected',()=>{const d=initial();d.data.tasks[0].doneDates={'2027-03-02':'yes'};assert.throws(()=>validate(d,true));});
test('resource URL credentials rejected',()=>{const d=initial();d.data.materials[0].url='https://name:password@example.com/';assert.throws(()=>validate(d,true));});

test('settings array rejected',()=>{const d=initial();d.data.settings=[];assert.throws(()=>validate(d,true));});
test('settings dark flag must be boolean',()=>{const d=initial();d.data.settings.dark='false';assert.throws(()=>validate(d,true));});
test('deleted course references remain importable for older backups',()=>{const d=initial();d.data.courses=[];assert.ok(validate(d,true));});
