async page => {
  const out = {};
  const clickByText = async (kw) => {
    const r = await page.evaluate((k) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes(k));
      if (btn) { btn.click(); return true; }
      return false;
    }, kw);
    await page.waitForTimeout(600);
    return r;
  };
  const getStep = () =>
    page.evaluate(() => {
      const h3 = document.querySelector('h3');
      return h3 ? h3.textContent.trim() : '';
    });

  // 1. 我的项目 → 新建
  await clickByText('我的项目');
  await clickByText('新建商业自测项目');
  await page.waitForTimeout(700);
  out.step1 = await getStep();
  out.nameEmpty = await page.evaluate(() => {
    const n = document.querySelector('input[type=text]');
    return n ? n.value === '' : null;
  });
  // 2. 走完所有步骤（名称留空）
  await clickByText('下一步');
  out.step2 = await getStep();
  await clickByText('下一步');
  out.step3 = await getStep();
  await clickByText('下一步');
  out.step4 = await getStep();
  await clickByText('下一步');
  out.step5 = await getStep();
  // 3. 提交
  out.submitClicked = await clickByText('确认提交');
  await page.waitForTimeout(3200);
  out.afterSubmit = await page.evaluate(() => {
    const h2 = document.querySelector('h2') ? document.querySelector('h2').textContent.trim() : '';
    const h3s = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim().slice(0, 60));
    const mainText = (document.querySelector('main') ? document.querySelector('main').textContent.trim().slice(0, 150) : '').replace(/\s+/g, ' ');
    const errs = Array.from(document.querySelectorAll('[class*="red"], [class*="rose"], [role=alert]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.textContent.trim().slice(0, 60))
      .filter((t) => t.length > 0);
    return { h2, h3s, mainText, errs: errs.slice(0, 10) };
  });
  return JSON.stringify(out, null, 1);
}
