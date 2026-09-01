async page => {
  const out = {};
  const clickTab = async (label) => {
    const btn = page.locator('button', { hasText: label }).first();
    if (await btn.count() > 0) { await btn.click(); return true; }
    return false;
  };
  await clickTab('我的项目');
  await page.waitForTimeout(800);

  // 1. 点击第一个项目的"查看诊断报告"
  const reportBtns = page.locator('button', { hasText: '查看诊断报告' });
  out.reportBtnCount = await reportBtns.count();
  if (await reportBtns.count() > 0) {
    await reportBtns.first().click();
    await page.waitForTimeout(1500);
    out.afterViewReport = await page.evaluate(() => {
      const h2 = document.querySelector('main h2') ? document.querySelector('main h2').textContent.trim() : '';
      const h3s = Array.from(document.querySelectorAll('main h3')).map((h) => h.textContent.trim().slice(0, 50));
      return { h2, h3s: h3s.slice(0, 8) };
    });
  }

  // 2. 回到我的项目，点击"编辑申报"
  await clickTab('我的项目');
  await page.waitForTimeout(700);
  const editBtns = page.locator('button', { hasText: '编辑申报' });
  if (await editBtns.count() > 0) {
    await editBtns.first().click();
    await page.waitForTimeout(1000);
    out.afterEdit = await page.evaluate(() => {
      const h3 = document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '';
      const name = document.querySelector('input[type=text]');
      return { h3, nameVal: name ? name.value : null };
    });
    // 修改名称
    const nameInput = page.locator('input[type=text]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('阳光工坊(已编辑)');
      out.editFilled = true;
      await page.waitForTimeout(300);
    }
  }

  // 3. 检查"彻底删除"按钮（在报告页）
  await clickTab('体检报告');
  await page.waitForTimeout(1000);
  out.deleteBtnExists = await page.locator('button', { hasText: '彻底删除' }).count() > 0;

  return JSON.stringify(out, null, 1);
}
