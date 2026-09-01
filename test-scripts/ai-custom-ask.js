async page => {
  const out = {};
  // 打开 AI 抽屉（使用指南入口）
  await page.locator('button[title="使用指南"]').click();
  await page.waitForTimeout(700);
  await page.locator('button', { hasText: '呼叫 AI 大白话助手答疑' }).click();
  await page.waitForTimeout(900);
  // 找到输入框（底部提问框）
  out.inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map((i) => ({
      ph: i.getAttribute('placeholder') || '',
      type: i.type,
      visible: i.offsetParent !== null
    }));
  });
  // 输入自定义问题
  const input = page.locator('input[type=text][placeholder]').last();
  if (await input.count() > 0) {
    await input.fill('我们做水产季节性生意，休渔期没有收入，怎么填表？');
    out.typed = true;
  } else {
    out.typed = false;
  }
  await page.waitForTimeout(300);
  // 点提问
  const askBtn = page.locator('button', { hasText: '提问' }).first();
  if (await askBtn.count() > 0) {
    await askBtn.click();
    out.sent = true;
  }
  await page.waitForTimeout(5000);
  out.answer = await page.evaluate(() => {
    const fixed = Array.from(document.querySelectorAll('div, aside')).filter((el) => {
      const s = getComputedStyle(el);
      return s.position === 'fixed' && el.textContent.trim().length > 200;
    });
    const panelTexts = fixed.map((el) => el.textContent.trim().replace(/\s+/g, ' '));
    return panelTexts[panelTexts.length - 1] ? panelTexts[panelTexts.length - 1].slice(-600) : null;
  });
  return JSON.stringify(out, null, 1);
}
