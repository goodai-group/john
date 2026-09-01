async page => {
  const out = {};
  // 切换到 EN
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'EN');
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  out.afterEn = await page.evaluate(() => {
    const h1 = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '';
    const stepLabels = Array.from(document.querySelectorAll('button')).map((b) => b.textContent.trim()).filter((t) => t.includes('STEP'));
    const hasChinese = /[\u4e00-\u9fff]/.test(document.body.textContent);
    const mainText = (document.querySelector('main') ? document.querySelector('main').textContent.trim().slice(0, 200) : '').replace(/\s+/g, ' ');
    return { h1, stepLabels: stepLabels.slice(0, 5), hasChinese, mainText };
  });
  await page.screenshot({ path: './test-18-en-home.png', scale: 'css', type: 'png' });
  // 报告页 EN
  await page.locator('button', { hasText: 'Report' }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  out.reportEn = await page.evaluate(() => {
    const hasChinese = /[\u4e00-\u9fff]/.test(document.body.textContent);
    const h2 = document.querySelector('main h2') ? document.querySelector('main h2').textContent.trim() : '';
    return { hasChinese, h2 };
  });
  await page.screenshot({ path: './test-19-en-report.png', scale: 'css', type: 'png' });
  // 切回中文
  await page.locator('button', { hasText: '中文' }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  return JSON.stringify(out, null, 1);
}
