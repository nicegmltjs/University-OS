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
  await page.locator('[data-action="addSubjectRecord"][data-kind="journals"]').click();
  await page.locator('#journalForm [name="title"]').fill('Smoke lecture note');
  await page.locator('#journalForm [name="body"]').fill('A note with **bold** text');
  await page.locator('#journalForm button[type="submit"],#journalForm button:not([type])').first().click();
  assert.equal(await page.getByText('Smoke lecture note').count()>0,true,'Lecture journal creation failed');
  // Exercise subject-first navigation and the complete journal editing lifecycle.
  await page.locator('[data-action="editjournal"]').first().click();
  await page.locator('#journalForm [name="title"]').fill('Smoke lecture edited');
  await page.locator('#journalForm [name="body"]').fill('Draft content must survive searching');
  await page.locator('#journalSearch').fill('Smoke');
  assert.equal(await page.locator('#journalForm [name="title"]').inputValue(),'Smoke lecture edited','Journal title draft lost during search');
  assert.equal(await page.locator('#journalForm [name="body"]').inputValue(),'Draft content must survive searching','Journal body draft lost during search');
  await page.locator('#journalForm button[type="submit"],#journalForm button:not([type])').first().click();
  assert.equal(await page.getByText('Smoke lecture edited').count()>0,true,'Journal edit failed');
  await page.locator('[data-action="deljournal"]').first().click();
  assert.equal(await page.getByText('Smoke lecture edited').count(),0,'Journal deletion failed');
  await page.locator('[data-action="backSubjects"][data-kind="journals"]').click();
  assert.equal(await page.locator('[data-action="selectSubject"][data-kind="journals"]').count()>0,true,'Journal subject picker missing');
  await page.locator('[data-page="materials"]').first().click();
  assert.equal(await page.locator('#materialForm').count(),0,'Materials form should be closed initially');
  await page.locator('[data-action="addSubjectRecord"][data-kind="materials"]').click();
  await page.locator('#materialForm [name="title"]').fill('Smoke material');
  await page.locator('#materialForm [name="url"]').fill('https://example.com/smoke');
  await page.locator('#materialForm button[type="submit"],#materialForm button:not([type])').first().click();
  assert.equal(await page.getByText('Smoke material').count()>0,true,'Material creation failed');
  await page.locator('[data-action="editmaterial"]').first().click();
  await page.locator('#materialForm [name="title"]').fill('Smoke material edited');
  await page.locator('#materialSearch').fill('Smoke');
  assert.equal(await page.locator('#materialForm [name="title"]').inputValue(),'Smoke material edited','Material draft lost during search');
  await page.locator('#materialForm button[type="submit"],#materialForm button:not([type])').first().click();
  assert.equal(await page.getByText('Smoke material edited').count()>0,true,'Material edit failed');
  await page.reload();
  await page.locator('[data-page="materials"]').first().click();
  await page.locator('[data-action="selectSubject"][data-kind="materials"][data-id=""]').click();
  assert.equal(await page.getByText('Smoke material edited').count()>0,true,'Material not persisted after reload');
  await page.locator('[data-action="delmaterial"]').first().click();
  assert.equal(await page.getByText('Smoke material edited').count(),0,'Material deletion failed');
  console.log('Browser smoke passed: mobile task CRUD, persistence, calendar, journal/material CRUD, subject navigation and draft preservation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
