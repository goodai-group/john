async page => {
  const out = {};
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  // 1. XSS 测试：项目名称注入脚本
  const nameInput = page.locator('input[type=text]').first();
  if (await nameInput.count() > 0) {
    await nameInput.fill('<script>window.__xss=1</script>');
    out.xssValue = await nameInput.inputValue();
  }
  // 检查是否执行
  out.xssExecuted = await page.evaluate(() => window.__xss === 1);

  // 2. 检查数字输入框的 min/max 属性
  out.numberAttrs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type=number]')).slice(0, 8).map((i) => ({
      min: i.min, max: i.max, step: i.step, placeholder: i.getAttribute('placeholder') || ''
    }));
  });

  // 3. 负数/极大值测试：填负数进第一个数字输入
  const numInput = page.locator('input[type=number]').first();
  if (await numInput.count() > 0) {
    await numInput.fill('-5000');
    await page.waitForTimeout(400);
    out.negativeAccepted = await page.evaluate(() => {
      const i = document.querySelector('input[type=number]');
      return { val: i.value, hasError: i.checkValidity ? !i.checkValidity() : null };
    });
  }

  // 4. 极大值
  if (await numInput.count() > 0) {
    await numInput.fill('999999999999');
    await page.waitForTimeout(400);
    out.hugeValue = await page.evaluate(() => {
      const i = document.querySelector('input[type=number]');
      return { val: i.value, valid: i.checkValidity() };
    });
  }

  // 5. 检查实时健康仪表是否崩溃（LiveHealthGauge）
  out.healthGaugeVisible = await page.evaluate(() => {
    return document.body.textContent.includes('健康') && !document.body.textContent.includes('NaN');
  });
  return JSON.stringify(out, null, 1);
}
