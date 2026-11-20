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

const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const luminance=h=>rgb(h).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const blend=(a,b,p)=>'#'+rgb(a).map((v,i)=>Math.round(v*p+rgb(b)[i]*(1-p)).toString(16).padStart(2,'0')).join('');
const courseColors=['#d8e9dd','#dce8f8','#f1ddeb','#f8e7d6','#e3ddf3','#e4eee1','#f6e6df'];
test('dark mode maintains WCAG AA contrast for text, links, inputs, and all course tile colors',()=>{
 const sheet=css(index);
 assert.ok(sheet.includes('--event-blend:94%'));
 assert.ok(sheet.includes('color-scheme:dark'));
 assert.ok(sheet.includes('body[data-theme] input::placeholder'));
 assert.ok(sheet.includes('body[data-theme] a{color:var(--link-ink)'));
 for(const theme of names){
  const selector='body[data-theme="'+theme+'"][data-dark="true"]';
  const block=sheet.slice(sheet.indexOf(selector+'{')+selector.length+1).split('}')[0];
  const values=Object.fromEntries([...block.matchAll(/(--[\w-]+):(#[\da-f]{6})/g)].map(m=>[m[1],m[2]]));
  for(const [fg,bg] of [
   ['--text','--page-bg'],['--text','--surface-bg'],['--muted-ink','--surface-bg'],
   ['--muted-ink','--sidebar-bg'],['--accent-ink','--accent-soft'],['--accent-ink','--surface-bg']
  ])assert.ok(contrast(values[fg],values[bg])>=4.5,theme+' contrast '+fg+' on '+bg);
  for(const color of courseColors)assert.ok(contrast(values['--accent-ink'],blend(values['--accent-soft'],color,.94))>=4.5,theme+' timetable contrast');
  assert.ok(contrast('#b5efc8',values['--surface-bg'])>=4.5,theme+' success status contrast');
 }
});
test('both scripts use adaptive event blend to preserve dark-mode text contrast',()=>{
 for(const script of [app,demo])assert.ok(script.includes('color-mix(in srgb, var(--accent-soft) var(--event-blend)'));
});

test('refined dark palettes keep crisp text and distinct card surfaces',()=>{
 const sheet=css(index);
 for(const theme of names){
  const selector='body[data-theme="'+theme+'"][data-dark="true"]';
  const block=sheet.slice(sheet.indexOf(selector+'{')+selector.length+1).split('}')[0];
  const tokens=Object.fromEntries([...block.matchAll(/(--[\w-]+):(#[\da-f]{6})/g)].map(m=>[m[1],m[2]]));
  assert.notEqual(tokens['--page-bg'],tokens['--surface-bg'],theme+' card must stand out');
  assert.ok(contrast(tokens['--text'],tokens['--surface-bg'])>=7,theme+' main text must remain crisp');
  assert.ok(contrast(tokens['--muted-ink'],tokens['--surface-bg'])>=4.5,theme+' secondary text must remain legible');
  assert.ok(contrast('#17201b',tokens['--accent'])>=4.5,theme+' primary button contrast');
 }
 assert.ok(sheet.includes('body[data-theme="sage"][data-dark="true"]{--page-bg:#242b29;--sidebar-bg:#293430;--surface-bg:#303c37'), 'approved sage dark palette should remain consistent');
 assert.ok(sheet.includes('--text:#e8f0eb;--muted-ink:#bacdc1;--accent:#83b69a'), 'approved crisp text and accent colors');
});
