async page => {
  const out = {};
  // 打开使用指南
  await page.locator('button[title="使用指南"]').click();
  await page.waitForTimeout(800);
  out.guideOpen = await page.locator('button', { hasText: '呼叫 AI 大白话助手答疑' }).count() > 0;
  // 点击"呼叫 AI 大白话助手答疑"
  await page.locator('button', { hasText: '呼叫 AI 大白话助手答疑' }).click();
  await page.waitForTimeout(1000);
  // 检查 AI 抽屉是否打开（含输入框）
  out.aiDrawerOpen = await page.locator('textarea').count() > 0;
  out.aiTitle = await page.evaluate(() => {
    const t = document.body.textContent.match(/AI 规则咨询|规则咨询|AI 助手|AI 大白话/);
    return t ? t[0] : null;
  });
  // 输入问题
  if (await page.locator('textarea').count() > 0) {
    await page.locator('textarea').first().fill('请问毛利多少算健康？');
    out.typed = true;
  }
  await page.waitForTimeout(300);
  // 发送
  const sendBtn = page.locator('button', { hasText: /发送|Send/ }).last();
  if (await sendBtn.count() > 0) {
    await sendBtn.click();
    out.sent = true;
  } else {
    out.sent = false;
  }
  await page.waitForTimeout(4000);
  // 获取回答内容
  out.answer = await page.evaluate(() => {
    const text = document.body.textContent;
    const idx = text.indexOf('毛利');
    // 收集抽屉内的文本
    const fixed = Array.from(document.querySelectorAll('div')).filter((el) => {
      const s = getComputedStyle(el);
      return s.position === 'fixed' && el.textContent.trim().length > 100;
    });
    const panelTexts = fixed.map((el) => el.textContent.trim().replace(/\s+/g, ' '));
    return panelTexts.slice(-2);
  });
  // 截图
  await page.screenshot({ path: './test-07-ai-drawer.png', scale: 'css', type: 'png' });
  out.screenshot = 'ok';
  return JSON.stringify(out, null, 1);
}
