async page => {
  const out = {};
  // 当前应在"我的项目"页面，点击"新建商业自测项目"
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
    const nameVal = nameInput ? nameInput.value : null;
    const placeholder = nameInput ? nameInput.getAttribute('placeholder') : null;
    return { h3, nameVal, placeholder };
  });
  // 检查新建后表单是否为空白草稿
  return JSON.stringify(out, null, 1);
}
