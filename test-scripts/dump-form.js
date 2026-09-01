async page => {
  const out = {};
  out.step = await page.evaluate(() => {
    const h3 = document.querySelector('h3');
    return h3 ? h3.textContent.trim() : '';
  });
  out.inputs = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('input, textarea, select, button'))
      .filter((el) => {
        // 只保留可见的
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => {
        const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
        const val = el.value !== undefined ? String(el.value).slice(0, 60) : '';
        const type = el.type || el.tagName;
        const name = el.getAttribute('name') || '';
        return { tag: el.tagName.toLowerCase(), type, name, label: label.slice(0, 60), val };
      });
    return els;
  });
  return JSON.stringify(out, null, 1);
}
