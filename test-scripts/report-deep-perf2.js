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

  // AI 深度诊断
  const diagBtn = page.locator('main button', { hasText: /深度诊断|AI 深度|定制诊断/ }).first();
  out.hasDiagBtn = await diagBtn.count() > 0;
  if (await diagBtn.count() > 0) {
    await diagBtn.click();
    await page.waitForTimeout(3500);
    out.diagResult = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const m = bodyText.match(/Gemini 3.7 定制诊断[：:][^\n]{0,80}/);
      const hasDiag = bodyText.includes('定制诊断');
      const errText = bodyText.match(/诊断失败|暂时无法|服务不可用[^\n]{0,40}/);
      return { m: m ? m[0] : null, hasDiag, errText: errText ? errText[0] : null };
    });
  }

  // 性能（不 reload，直接用导航性能数据）
  out.perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    const resources = performance.getEntriesByType('resource');
    const jsTotal = resources.filter((r) => r.name.endsWith('.js')).reduce((s, r) => s + (r.transferSize || 0), 0);
    return {
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
      loadEventMs: Math.round(nav.loadEventEnd),
      jsTransferBytes: jsTotal,
      resourceCount: resources.length
    };
  });
  return JSON.stringify(out, null, 1);
}
