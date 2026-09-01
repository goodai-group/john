async page => {
  const out = {};
  // 打开使用指南 -> AI 抽屉
  await page.locator('button[title="使用指南"]').click();
  await page.waitForTimeout(800);
  await page.locator('button', { hasText: '呼叫 AI 大白话助手答疑' }).click();
  await page.waitForTimeout(1000);

  // 输入框（placeholder 可见）
  const input = page.locator('input[placeholder*="新手"]').first();
  out.inputCount = await input.count();
  if (await input.count() > 0) {
    await input.fill('请问毛利多少算健康？');
    out.typed = true;
  } else {
    out.typed = false;
  }
  await page.waitForTimeout(300);
  // 点击"提问"按钮
  const askBtn = page.locator('button', { hasText: '提问' }).first();
  out.btnCount = await askBtn.count();
  if (await askBtn.count() > 0) {
    await askBtn.click();
    out.sent = true;
  } else {
    out.sent = false;
  }
  await page.waitForTimeout(5000);
  // 获取回答
  out.answer = await page.evaluate(() => {
    // 抽屉通常是 fixed 定位
    const fixed = Array.from(document.querySelectorAll('div, aside')).filter((el) => {
      const s = getComputedStyle(el);
      return s.position === 'fixed' && el.textContent.trim().length > 200;
    });
    const panelTexts = fixed.map((el) => el.textContent.trim().replace(/\s+/g, ' '));
    return panelTexts[panelTexts.length - 1] ? panelTexts[panelTexts.length - 1].slice(-800) : null;
  });
  // 截图
  await page.screenshot({ path: './test-08-ai-answer.png', scale: 'css', type: 'png' });
  out.screenshot = 'ok';
  return JSON.stringify(out, null, 1);
}
