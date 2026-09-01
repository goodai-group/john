async page => {
  const out = {};
  const clickByText = async (kw, wait = 700) => {
    const r = await page.evaluate((k) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes(k) && b.offsetParent !== null);
      if (btn) { btn.click(); return true; }
      return false;
    }, kw);
    await page.waitForTimeout(wait);
    return r;
  };
  const modalText = () =>
    page.evaluate(() => {
      // 查找对话框/抽屉
      const els = Array.from(document.querySelectorAll('[role=dialog], [role=presentation], [class*="fixed"], [class*="modal"], [class*="drawer"]'))
        .filter((el) => el.offsetParent !== null && el.textContent.trim().length > 0);
      const texts = els.map((el) => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 150));
      return texts.slice(0, 5);
    });

  // 1. AI 规则咨询抽屉
  out.aiClicked = await clickByText('AI 规则咨询');
  out.aiText = await modalText();

  // 关闭抽屉（点右上角关闭）
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role=dialog] button, [class*="drawer"] button, [class*="fixed"] button'));
    const close = btns.find((b) => (b.textContent || '').includes('关闭') || (b.textContent || '').includes('×') || (b.textContent || '').includes('✕'));
    if (close) close.click();
  });
  await page.waitForTimeout(600);
  out.aiClosed = await page.evaluate(() => {
    return !document.body.textContent.includes('AI 规则咨询');
  });

  // 2. 费用透明弹窗
  out.feeClicked = await clickByText('永久免费');
  out.feeText = await modalText();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. 使用指南弹窗
  out.guideClicked = await clickByText('使用指南');
  out.guideText = await modalText();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 4. EN 语言切换
  out.enClicked = await clickByText('EN');
  out.afterEn = await page.evaluate(() => {
    const h1 = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '';
    const bodyHasEnglish = /Commercial|Business|Assessment|Project/i.test(document.body.textContent);
    return { h1, bodyHasEnglish };
  });
  // 切回中文
  await clickByText('中文');

  // 5. 无障碍工具栏
  out.accToolbar = await page.evaluate(() => {
    const tbs = Array.from(document.querySelectorAll('button')).filter((b) => {
      const t = (b.textContent || '').trim();
      return t.includes('无障') || t.includes('字体') || t.includes('A+') || t.includes('A-') || t.includes('对比度') || t.includes('高对比');
    }).map((b) => b.textContent.trim().slice(0, 30));
    return tbs;
  });

  return JSON.stringify(out, null, 1);
}
