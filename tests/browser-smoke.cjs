// Browser-level smoke test for the local demo. Run after: npm install --no-save playwright
// and npx playwright install chromium. Serve the repo with python3 -m http.server 8765.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:8765/demo.html');
  await page.locator('[data-page="tasks"]').first().click();
  await page.locator('#taskForm [name="title"]').fill('Browser smoke assignment');
  await page.locator('#taskForm [name="date"]').fill('2027-03-15');
  await page.locator('#taskForm button[type="submit"],#taskForm button:not([type])').first().click();
  await page.waitForTimeout(100);
  assert.equal(await page.getByText('Browser smoke assignment').count()>0,true,'Task creation failed');
  await page.reload();
  await page.locator('[data-page="tasks"]').first().click();
  assert.equal(await page.getByText('Browser smoke assignment').count()>0,true,'Task did not persist after reload');
  await page.locator('[data-action="edittask"]').first().click();
  await page.locator('#taskForm [name="title"]').fill('Browser smoke edited');
  await page.locator('#taskForm button[type="submit"],#taskForm button:not([type])').first().click();
  assert.equal(await page.getByText('Browser smoke edited').count()>0,true,'Task edit failed');
  await page.locator('[data-page="calendar"]').first().click();
  await page.locator('[data-action="nextMonth"]').first().click();
  assert.equal(await page.locator('.calendar-grid').count(),1,'Calendar navigation failed');
  await page.locator('[data-page="journals"]').first().click();
  await page.locator('#journalForm [name="title"]').fill('Smoke lecture note');
  await page.locator('#journalForm [name="body"]').fill('A note with **bold** text');
  await page.locator('#journalForm button[type="submit"],#journalForm button:not([type])').first().click();
  assert.equal(await page.getByText('Smoke lecture note').count()>0,true,'Lecture journal creation failed');
  console.log('Browser smoke passed: mobile viewport, task CRUD, reload persistence, calendar and journal');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
