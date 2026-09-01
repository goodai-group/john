async page => {
  const out = {};
  // 当前应在新建项目表单（名称空）
  // 1. 空名称点击下一步
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('下一步'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  out.emptyNameResult = await page.evaluate(() => {
    const h3 = document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '';
    // 检查校验错误提示
    const errors = Array.from(document.querySelectorAll('[role=alert], .text-red-600, .text-rose-600, .text-red-500')).map((e) => e.textContent.trim().slice(0, 100));
    const errText = document.body.textContent.includes('请填写') || document.body.textContent.includes('必填');
    return { h3, errors, hasRequiredMsg: errText };
  });

  // 2. 填写项目名称
  await page.fill('input[type=text]', 'QA测试烘焙坊 TestBakery');
  await page.waitForTimeout(400);
  out.filled = await page.evaluate(() => {
    const nameInput = document.querySelector('input[type=text]');
    return nameInput ? nameInput.value : null;
  });

  // 3. 名称填写后点击下一步
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('下一步'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(600);
  out.afterNext = await page.evaluate(() => {
    const h3 = document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '';
    return h3;
  });

  return JSON.stringify(out, null, 1);
}
