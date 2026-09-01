async page => {
  const out = {};
  // 点击第一步的"下一步"按钮
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('下一步'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  out.clicked = clicked;
  await page.waitForTimeout(1200);
  // 检查当前步骤标题
  out.activeStep = await page.evaluate(() => {
    const h3 = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim());
    const heading = document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '';
    return { heading, h3s: h3 };
  });
  return JSON.stringify(out, null, 1);
}
