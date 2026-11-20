// Run: node --test tests/editor-preview.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');
const start=src.indexOf('function previewMarkdown(');
const end=src.indexOf('function journals(){',start);
assert.ok(start>=0&&end>start);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sandbox={safe};vm.createContext(sandbox);
vm.runInContext(src.slice(start,end),sandbox);
const render=sandbox.previewMarkdown;
test('escapes script tags and inline markup',()=>assert.equal(render('<script>alert(1)</script>').includes('<script>'),false));
test('renders basic bold safely',()=>assert.match(render('**bold**'),/<strong>bold<\/strong>/));
test('renders headings',()=>assert.match(render('### title'),/<h4>title<\/h4>/));
test('renders lists',()=>assert.match(render('- point'),/• point/));
test('renders highlights',()=>assert.match(render('==key=='),/<mark>key<\/mark>/));
