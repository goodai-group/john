async page => {
  const out = {};
  // 进入报告页
  await page.locator('button', { hasText: '体检报告' }).first().click();
  await page.waitForTimeout(1200);
  out.reportBtns = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return [];
    return Array.from(main.querySelectorAll('button'))
      .filter((b) => b.offsetParent !== null)
      .map((b) => b.textContent.trim().replace(/\s+/g, ' ').slice(0, 40));
  });

  // 找 AI 深度诊断按钮
  const diagBtn = page.locator('main button', { hasText: /深度诊断|AI 深度|定制诊断/ }).first();
  out.hasDiagBtn = await diagBtn.count() > 0;
  if (await diagBtn.count() > 0) {
    await diagBtn.click();
    await page.waitForTimeout(3000);
    out.diagResult = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const m = bodyText.match(/Gemini 3.7 定制诊断[：:][^\n]{0,80}/);
      const hasDiagnosis = bodyText.includes('定制诊断') || bodyText.includes('深度诊断');
      return { m: m ? m[0] : null, hasDiagnosis };
    });
  }

  // 性能测量：reload 后测量
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      loadComplete: Math.round(nav.loadEventEnd),
      transferSize: nav.transferSize
    };
  });
  out.perfBefore = perf;

  // reload 并测量
  const t0 = Date.now();
  await page.reload({ waitUntil: 'networkidle' });
  const t1 = Date.now();
  out.reloadMs = t1 - t0;
  out.perfAfter = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const jsTotal = resources.filter((r) => r.name.endsWith('.js')).reduce((s, r) => s + r.transferSize, 0);
    return {
      loadEvent: Math.round(nav.loadEventEnd),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      jsBytes: jsTotal
    };
  });
  return JSON.stringify(out, null, 1);
}
