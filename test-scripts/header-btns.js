async page => {
  const out = {};
  // 切回中文（如果还在英文）
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('中文'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  out.headerBtns = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return null;
    const btns = Array.from(header.querySelectorAll('button, a')).map((b) => ({
      text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      tag: b.tagName.toLowerCase()
    }));
    return btns;
  });
  // 无障碍工具栏（可能在 body 直接子节点）
  out.allTopBtns = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.offsetParent !== null);
    return btns.map((b) => b.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)).slice(0, 40);
  });
  return JSON.stringify(out, null, 1);
}
