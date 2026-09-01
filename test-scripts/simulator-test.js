async page => {
  const out = {};
  const clickTab = async (label) => {
    const btn = page.locator('button', { hasText: label }).first();
    if (await btn.count() > 0) { await btn.click(); return true; }
    return false;
  };
  // 切到沙盒试算
  await clickTab('沙盒试算');
  await page.waitForTimeout(800);
  out.page = await page.evaluate(() => {
    const h2 = document.querySelector('main h2') ? document.querySelector('main h2').textContent.trim() : '';
    const h3s = Array.from(document.querySelectorAll('main h3')).map((h) => h.textContent.trim().slice(0, 50));
    return { h2, h3s };
  });
  // 滑块数量
  out.rangeCount = await page.locator('input[type=range]').count();
  // 调整第一个滑块
  const firstRange = page.locator('input[type=range]').first();
  if (await firstRange.count() > 0) {
    await firstRange.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '75');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    out.sliderAdjusted = await page.evaluate(() => {
      const val = document.querySelector('input[type=range]').value;
      const scoreText = (document.body.textContent.match(/预估总分[:：]\s*\d+/) || [''])[0];
      const gradeText = (document.body.textContent.match(/Grade[:：]?\s*[A-F+]+/) || [''])[0];
      return { val, scoreText, gradeText };
    });
  }
  // 重置默认参数
  const resetBtn = page.locator('button', { hasText: '重置默认参数' }).first();
  if (await resetBtn.count() > 0) {
    await resetBtn.click();
    out.resetClicked = true;
    await page.waitForTimeout(600);
    out.afterReset = await page.evaluate(() => {
      const vals = Array.from(document.querySelectorAll('input[type=range]')).map((r) => r.value);
      return { vals: vals.slice(0, 5) };
    });
  }
  // 带入正式申报表
  const importBtn = page.locator('button', { hasText: '带入正式申报表' }).first();
  if (await importBtn.count() > 0) {
    await importBtn.click();
    out.importClicked = true;
    await page.waitForTimeout(800);
    out.afterImport = await page.evaluate(() => {
      const h3 = document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '';
      const name = document.querySelector('input[type=text]');
      return { h3, nameVal: name ? name.value : null };
    });
  }
  // 截图
  await page.screenshot({ path: './test-09-sandbox.png', scale: 'css', type: 'png' });
  out.screenshot = 'ok';
  return JSON.stringify(out, null, 1);
}
