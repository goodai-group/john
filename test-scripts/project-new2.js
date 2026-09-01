async page => {
  const out = {};
  const clickTab = async (label) => {
    await page.evaluate((lbl) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === lbl);
      if (btn) btn.click();
    }, label);
    await page.waitForTimeout(500);
  };
  // 先到"我的项目"
  await clickTab('我的项目');
  out.onProjects = await page.evaluate(() => {
    const h2 = document.querySelector('h2') ? document.querySelector('h2').textContent.trim() : '';
    return h2;
  });
  // 点击"新建商业自测项目"
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('新建商业自测项目'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  out.clickedNew = clicked;
  await page.waitForTimeout(800);
  out.afterNew = await page.evaluate(() => {
    const h3 = document.querySelector('h3') ? document.querySelector('h3').textContent.trim() : '';
    const nameInput = document.querySelector('input[type=text]');
    return { h3, nameVal: nameInput ? nameInput.value : null, placeholder: nameInput ? nameInput.getAttribute('placeholder') : null };
  });
  return JSON.stringify(out, null, 1);
}
