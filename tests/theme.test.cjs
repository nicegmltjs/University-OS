const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const index=fs.readFileSync('index.html','utf8');
const demo=fs.readFileSync('demo.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=html=>html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const names=['sage','rose','peach','lavender','blue','mono'];
test('production and demo use identical CSS',()=>{
 assert.equal(css(index),css(demo));
});
test('all six themes define complete light and dark color palettes',()=>{
 const sheet=css(index);
 const backgrounds=new Set();
 for(const theme of names)for(const dark of [false,true]){
  const selector='body[data-theme="'+theme+'"]'+(dark?'[data-dark="true"]':'');
  const block=sheet.slice(sheet.indexOf(selector+'{')+selector.length+1).split('}')[0];
  assert.ok(sheet.includes(selector+'{'),'missing '+selector);
  for(const token of ['--page-bg','--sidebar-bg','--surface-bg','--text','--line','--accent','--accent-soft','--accent-ink','--field-line','--schedule-bg']){
   assert.match(block,new RegExp(token+':#[0-9a-f]{3,8}'),'missing '+token+' in '+selector);
  }
  backgrounds.add(block.match(/--page-bg:(#[0-9a-f]+)/)[1]);
 }
 assert.equal(backgrounds.size,12,'each palette/mode should have a distinct page color');
});
test('theme colors cover the full UI rather than only primary buttons',()=>{
 const sheet=css(index);
 for(const component of ['.shell','.sidebar','.nav.active','.card','.field input','.item','.day.today','.tt-day','.tt-event','.editor-preview','.tag']){
  assert.ok(sheet.includes('body[data-theme] '+component),'missing theme selector '+component);
 }
});
test('timetable cards mix their per-course colors with the selected theme',()=>{
 for(const script of [app,demo]){
  assert.ok(script.includes('color-mix(in srgb, var(--accent-soft)'));
  assert.ok(script.includes('"var(--accent)"'));
 }
});
