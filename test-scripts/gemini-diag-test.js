async page => {
  const out = {};
  await page.locator('button', { hasText: '体检报告' }).first().click();
  await page.waitForTimeout(1000);
  // 点击深度诊断按钮
  const diagBtn = page.locator('main button', { hasText: '获取 Gemini' }).first();
  out.btnCount = await diagBtn.count();
  if (await diagBtn.count() > 0) {
    await diagBtn.click();
    out.clicked = true;
    await page.waitForTimeout(5000);
    out.afterDiag = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      // 诊断结果卡片（amber 色）
      const hasDiagnosisCard = bodyText.includes('定制诊断');
      const summary = (bodyText.match(/定制诊断[：:][^\n]{0,100}/) || [''])[0];
      const actionItems = (bodyText.match(/行动清单[^\n]{0,60}/) || [''])[0];
      const errorHint = bodyText.match(/无法|失败|超时|未配置[^\n]{0,50}/);
      return { hasDiagnosisCard, summary, actionItems, errorHint: errorHint ? errorHint[0] : null };
    });
    await page.screenshot({ path: './test-13-gemini-diag.png', scale: 'css', type: 'png' });
    out.shot = 'ok';
  }
  return JSON.stringify(out, null, 1);
}
