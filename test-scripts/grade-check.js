async page => {
  const out = {};
  await page.locator('button', { hasText: '体检报告' }).first().click();
  await page.waitForTimeout(1200);
  // 检查页面上的等级徽章
  out.gradeBadge = await page.evaluate(() => {
    const badges = Array.from(document.querySelectorAll('div')).filter((el) => {
      const s = getComputedStyle(el);
      return s.backgroundColor === 'rgb(23, 23, 23)' || s.backgroundColor === 'rgb(17, 24, 39)';
    });
    const text = badges.map((b) => b.textContent.trim()).filter((t) => t.length > 0 && t.length < 5);
    return text.slice(0, 5);
  });
  // 直接检查 report 渲染的等级文本
  out.hasUndefined = await page.evaluate(() => {
    return document.body.textContent.includes('undefined');
  });
  out.undefinedContext = await page.evaluate(() => {
    const idx = document.body.textContent.indexOf('undefined');
    return idx >= 0 ? document.body.textContent.slice(Math.max(0, idx - 30), idx + 30).replace(/\s+/g, ' ') : null;
  });
  // 切换到专业模式
  await page.locator('main button', { hasText: '专业财务明细模式' }).first().click();
  await page.waitForTimeout(800);
  out.undefinedContext2 = await page.evaluate(() => {
    const idx = document.body.textContent.indexOf('undefined');
    return idx >= 0 ? document.body.textContent.slice(Math.max(0, idx - 30), idx + 30).replace(/\s+/g, ' ') : null;
  });
  // 截图
  await page.screenshot({ path: './test-14-grade-check.png', scale: 'css', type: 'png' });
  out.shot = 'ok';
  return JSON.stringify(out, null, 1);
}
