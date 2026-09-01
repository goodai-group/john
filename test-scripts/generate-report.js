async page => {
  const out = {};
  // 点击"确认提交 · 生成财务测算与评估报告"按钮
  out.clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('确认提交'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  // 立即检查是否有生成过场
  await page.waitForTimeout(300);
  out.generatingOverlay = await page.evaluate(() => {
    const overlay = Array.from(document.querySelectorAll('h2')).find((h) => (h.textContent || '').includes('正在为你生成'));
    return overlay ? overlay.textContent.trim() : null;
  });
  // 等待报告生成完成（1.1s + 余量）
  await page.waitForTimeout(2500);
  out.url = page.url();
  out.after = await page.evaluate(() => {
    const h1 = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '';
    const h2s = Array.from(document.querySelectorAll('h2')).map((h) => h.textContent.trim().slice(0, 80));
    const h3s = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim().slice(0, 80));
    const mainText = (document.querySelector('main') ? document.querySelector('main').textContent.trim().slice(0, 500) : '').replace(/\s+/g, ' ');
    return { h1, h2s, h3s, mainText };
  });
  return JSON.stringify(out, null, 1);
}
