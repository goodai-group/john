async page => {
  const out = {};
  const getDialogText = () =>
    page.evaluate(() => {
      const dlg = document.querySelector('[role=dialog]');
      if (dlg) return dlg.textContent.trim().replace(/\s+/g, ' ').slice(0, 300);
      // 找 fixed 层
      const fixed = Array.from(document.querySelectorAll('div')).filter((el) => {
        const s = getComputedStyle(el);
        return s.position === 'fixed' && el.offsetParent === null && el.textContent.trim().length > 50;
      });
      if (fixed.length > 0) return fixed[0].textContent.trim().replace(/\s+/g, ' ').slice(0, 300);
      return null;
    });

  // 1. 使用指南（HelpCircle 图标按钮）
  const guideOpened = await page.evaluate(() => {
    const btn = document.querySelector('button[title="使用指南"]');
    if (btn) { btn.click(); return true; }
    return false;
  });
  await page.waitForTimeout(800);
  out.guideOpened = guideOpened;
  out.guideText = await getDialogText();
  // 在指南里点 AI 咨询
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('新手如何看懂体检报告与得分'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  out.afterGuideAi = await getDialogText();
  // 关闭抽屉
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 2. 费用透明弹窗（永久免费）
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('永久免费'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(700);
  out.feeText = await getDialogText();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. 表单内 AI 助手（步骤1下方的问AI按钮）
  out.aiBtns = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .filter((b) => b.offsetParent !== null && /AI|问 |规则/.test(b.textContent))
      .map((b) => b.textContent.trim().replace(/\s+/g, ' ').slice(0, 50));
    return btns;
  });
  const aiClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('AI') && b.offsetParent !== null);
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return null;
  });
  out.aiClickedText = aiClicked;
  await page.waitForTimeout(900);
  out.aiDrawerText = await getDialogText();
  // 关闭
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  return JSON.stringify(out, null, 1);
}
