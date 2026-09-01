async page => {
  const out = {};
  // 点击"呼叫 AI 大白话助手答疑"（locator 自动滚动）
  const btn = page.locator('button', { hasText: '呼叫 AI 大白话助手' });
  out.btnCount = await btn.count();
  if (await btn.count() > 0) {
    await btn.first().click();
    out.clicked = true;
  } else {
    out.clicked = false;
  }
  await page.waitForTimeout(1000);

  // 抽屉面板
  out.drawerTitle = await page.evaluate(() => {
    const el = document.querySelector('[class*="fixed"] [class*="font-bold"], [role=dialog]');
    return el ? el.textContent.trim().slice(0, 100) : null;
  });
  // 输入问题
  const textarea = page.locator('textarea').first();
  if (await textarea.count() > 0) {
    await textarea.fill('请问毛利多少算健康？');
    out.typed = true;
  } else {
    out.typed = false;
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
  // 获取回答
  out.answer = await page.evaluate(() => {
    // AI 回答通常在消息列表中
    const msgs = Array.from(document.querySelectorAll('[class*="message"], [class*="chat"], [class*="bubble"], [class*="answer"]'))
      .filter((el) => el.textContent.trim().length > 30)
      .map((el) => el.textContent.trim().replace(/\s+/g, ' '));
    return msgs.slice(-3);
  });
  // 截图
  await page.screenshot({ path: './test-07-ai-drawer.png', scale: 'css', type: 'png' });
  out.screenshot = 'ok';
  return JSON.stringify(out, null, 1);
}
