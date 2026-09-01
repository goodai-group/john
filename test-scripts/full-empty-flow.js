async page => {
  const out = {};
  const clickBtn = async (keyword) => {
    const r = await page.evaluate((kw) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes(kw));
      if (btn) { btn.click(); return btn.textContent.trim().replace(/\s+/g, ' ').slice(0, 40); }
      return null;
    }, keyword);
    await page.waitForTimeout(600);
    return r;
  };
  const getStep = () =>
    page.evaluate(() => {
      const h3 = document.querySelector('h3');
      return h3 ? h3.textContent.trim() : '';
    });

  out.step2 = await getStep();
  // 步骤2 点击下一步
  out.s2next = await clickBtn('下一步');
  out.step3 = await getStep();
  // 步骤3 点击下一步
  out.s3next = await clickBtn('下一步');
  out.step4 = await getStep();
  // 步骤4 点击下一步
  out.s4next = await clickBtn('下一步');
  out.step5 = await getStep();
  // 步骤5 提交
  out.submit = await clickBtn('确认提交');
  await page.waitForTimeout(3000);
  out.afterSubmit = await page.evaluate(() => {
    const h3s = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim().slice(0, 60));
    const h2 = document.querySelector('h2') ? document.querySelector('h2').textContent.trim() : '';
    const mainText = (document.querySelector('main') ? document.querySelector('main').textContent.trim().slice(0, 200) : '').replace(/\s+/g, ' ');
    // 收集错误提示
    const errs = Array.from(document.querySelectorAll('[class*="red"], [class*="rose"], [role=alert]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.textContent.trim().slice(0, 60))
      .filter((t) => t.length > 0);
    return { h3s, h2, mainText, errs: errs.slice(0, 10) };
  });
  return JSON.stringify(out, null, 1);
}
