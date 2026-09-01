async page => {
  const out = {};
  const clickNext = async () => {
    const r = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('下一步'));
      if (btn) { btn.click(); return btn.textContent.trim(); }
      return null;
    });
    await page.waitForTimeout(800);
    return r;
  };
  const getStep = () =>
    page.evaluate(() => {
      const h3 = document.querySelector('h3');
      return h3 ? h3.textContent.trim() : '';
    });

  out.nextBtn4 = await clickNext();
  out.step5 = await getStep();

  // 步骤5的表单字段
  out.step5Inputs = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('input, textarea, select, button'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => {
        const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
        const val = el.value !== undefined ? String(el.value).slice(0, 40) : '';
        return { tag: el.tagName.toLowerCase(), type: el.type || el.tagName, label: label.slice(0, 50), val };
      });
    return els;
  });

  // 查找提交按钮
  out.submitBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .filter((b) => b.offsetParent !== null)
      .map((b) => b.textContent.trim().replace(/\s+/g, ' ').slice(0, 60));
    return btns;
  });

  return JSON.stringify(out, null, 1);
}
