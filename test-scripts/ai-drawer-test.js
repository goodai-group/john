async page => {
  const out = {};
  // 先确保在表单页且无弹窗
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const formTab = tabs.find((b) => (b.textContent || '').trim() === '快速体检');
    if (formTab) formTab.click();
  });
  await page.waitForTimeout(500);

  // 点击"呼叫 AI 大白话助手答疑"
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('呼叫 AI 大白话助手'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  out.clicked = clicked;
  await page.waitForTimeout(1000);

  // 查看抽屉内容
  out.drawer = await page.evaluate(() => {
    // 找 AI 抽屉：通常在页面右侧的 fixed 面板
    const all = Array.from(document.querySelectorAll('div, aside')).filter((el) => {
      const s = getComputedStyle(el);
      return s.position === 'fixed' && el.textContent.trim().length > 20;
    });
    const panels = all.map((el) => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 200));
    // 找输入框
    const textarea = document.querySelector('textarea');
    const input = document.querySelector('input[type=text]');
    const inputs = [];
    if (textarea) inputs.push({ tag: 'textarea', ph: textarea.placeholder });
    if (input && input.getAttribute('placeholder')) inputs.push({ tag: 'input', ph: input.getAttribute('placeholder') });
    return { panels: panels.slice(-3), inputs };
  });

  // 在抽屉输入框输入问题
  const typed = await page.evaluate(() => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, '请问毛利多少算健康？');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  out.typed = typed;
  await page.waitForTimeout(400);
  // 点击发送按钮
  const sent = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => {
      const t = (b.textContent || '').trim();
      return t === '发送' || t === 'Send' || t.includes('发送') || b.getAttribute('aria-label') === '发送';
    });
    if (btn) { btn.click(); return true; }
    return false;
  });
  out.sent = sent;
  await page.waitForTimeout(3000);
  // 查看回答
  out.answer = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div, aside')).filter((el) => {
      const s = getComputedStyle(el);
      return s.position === 'fixed' && el.textContent.trim().length > 20;
    });
    const panels = all.map((el) => el.textContent.trim().replace(/\s+/g, ' '));
    return panels[panels.length - 1] ? panels[panels.length - 1].slice(-400) : null;
  });
  return JSON.stringify(out, null, 1);
}
