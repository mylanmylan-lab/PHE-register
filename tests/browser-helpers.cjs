/* Keep regression fixtures on the pre-preset database. Fresh-install behavior is
   tested separately; this helper never touches a user's browser profile. */
async function seedLegacy(page) {
  const url=process.env.PHE_TEST_URL||'http://127.0.0.1:4173';
  const blank=route=>route.fulfill({contentType:'application/javascript',body:''});
  await page.route('**/app.js',blank);await page.goto(url);
  await page.evaluate(async()=>{const s=new PHEStore.LocalStore();await s.init();});
  await page.unroute('**/app.js',blank);
}
async function history(page,id) {
  await page.locator('.lesson-history').evaluate(el=>el.open=true);
  await page.locator('#lesson-select').selectOption(id);
}
async function entry(page,block) {
  if(await page.locator('[data-action=new-entry]').count())await page.locator('[data-action=new-entry]').click();
  if(block)await page.locator('#attendance-block').selectOption(block);
}
module.exports={seedLegacy,history,entry};
