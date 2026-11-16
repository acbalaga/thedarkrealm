'use strict';
/* File export and import, and the Backups list, under the real header CSP. Run with `npm run e2e`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { serve, openKeeping } = require('./server');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }

test('download a save as a file, import it from the file, and restore the replaced realm', { skip: !chromium && 'playwright is not installed' }, async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ acceptDownloads: true });
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
    });
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForTimeout(400);
    for (let i = 0; i < 5; i++) await page.click('#well');
    await openKeeping(page);

    await page.getByRole('button', { name: 'Export save' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download file' }).click()]);
    assert.match(dl.suggestedFilename(), /^dark-realm-fathom-1-\d{4}-\d{2}-\d{2}\.tdr\.txt$/);
    const file = await dl.path();
    assert.match(fs.readFileSync(file, 'utf8'), /^TDR2\./);
    await page.getByRole('button', { name: 'Done' }).click();

    // Change the realm, then import the file. The changed realm must be recoverable.
    for (let i = 0; i < 20; i++) await page.click('#well');
    const gloomBefore = await page.textContent('#r-gloom');
    await page.getByRole('button', { name: 'Import save' }).click();
    await page.setInputFiles('input[type=file]', file);
    await page.waitForFunction(() => document.querySelector('#io').value.startsWith('TDR2.'));
    await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Import', exact: true }).click()]);
    await page.waitForTimeout(300);
    assert.notEqual(await page.textContent('#r-gloom'), gloomBefore);

    await openKeeping(page);
    await page.locator('text=Before the last import, restore or erase').waitFor();
    await page.getByRole('button', { name: 'Restore' }).click();
    await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Restore', exact: true }).last().click()]);
    await page.waitForTimeout(300);
    assert.equal(await page.textContent('#r-gloom'), gloomBefore, 'the realm replaced by the import came back');

    assert.deepEqual(await page.evaluate(() => window.__csp), []);
    assert.deepEqual(problems, []);
  } finally { await browser.close(); srv.close(); }
});
