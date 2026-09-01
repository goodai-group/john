async page => {
  const out = {};
  // 到步骤2
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('下一步'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  out.step2 = await page.evaluate(() => {
    const h3 = document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '';
    const nums = Array.from(document.querySelectorAll('input[type=number]')).map((i) => ({
      min: i.min, max: i.max, step: i.step, val: i.value
    }));
    return { h3, nums };
  });
  // 填负值到第一个流水输入框
  const numInput = page.locator('input[type=number]').first();
  await numInput.fill('-5000');
  await page.waitForTimeout(500);
  out.negative = await page.evaluate(() => {
    const i = document.querySelector('input[type=number]');
    return { val: i.value, valid: i.checkValidity(), min: i.min, max: i.max };
  });
  // 填极大值
  await numInput.fill('999999999999');
  await page.waitForTimeout(500);
  out.huge = await page.evaluate(() => {
    const i = document.querySelector('input[type=number]');
    return { val: i.value, valid: i.checkValidity() };
  });
  // 是否出现 NaN 或负数提示
  out.nanText = await page.evaluate(() => {
    const t = document.body.textContent;
    return { hasNaN: t.includes('NaN'), hasNegative: t.includes('负数') || t.includes('不可为负') };
  });
  return JSON.stringify(out, null, 1);
}
