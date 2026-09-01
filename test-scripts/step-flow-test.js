async page => {
  const out = {};

  const getStep = () =>
    page.evaluate(() => {
      const h3 = document.querySelector('h3');
      return h3 ? h3.textContent.trim() : '';
    });

  const clickStepTab = async (label) => {
    await page.evaluate((lbl) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes(lbl));
      if (btn) btn.click();
    }, label);
    await page.waitForTimeout(800);
  };

  const clickNext = async () => {
    const r = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('下一步'));
      if (btn) { btn.click(); return btn.textContent.trim(); }
      return null;
    });
    await page.waitForTimeout(800);
    return r;
  };

  // 回到步骤1
  await clickStepTab('STEP 01');
  out.step1 = await getStep();
  // 点击下一步
  out.nextBtn1 = await clickNext();
  out.afterNext1 = await getStep();
  // 再点下一步
  out.nextBtn2 = await clickNext();
  out.afterNext2 = await getStep();
  // 再点下一步
  out.nextBtn3 = await clickNext();
  out.afterNext3 = await getStep();

  return JSON.stringify(out, null, 1);
}
