async page => {
  const out = {};
  // 新建项目（从我的项目进入新建，确保名称为空）
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === '我的项目');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('新建商业自测项目'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(700);
  out.beforeName = await page.evaluate(() => {
    const nameInput = document.querySelector('input[type=text]');
    return { nameVal: nameInput ? nameInput.value : null, h3: document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '' };
  });
  // 空名称点击下一步
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('下一步'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  out.afterEmptyNext = await page.evaluate(() => {
    const h3 = document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '';
    // 收集红色校验信息
    const errs = Array.from(document.querySelectorAll('[class*="red"], [class*="rose"], [role=alert]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.textContent.trim().slice(0, 80))
      .filter((t) => t.length > 0 && t.length < 80);
    return { h3, errs: errs.slice(0, 10) };
  });
  return JSON.stringify(out, null, 1);
}
