async page => {
  const out = {};
  // 读取当前所有 h3 标题和下一步按钮
  out.state = await page.evaluate(() => {
    const h3s = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim());
    const nextBtns = Array.from(document.querySelectorAll('button'))
      .filter((b) => (b.textContent || '').includes('下一步'))
      .map((b) => b.textContent.trim());
    const prevBtns = Array.from(document.querySelectorAll('button'))
      .filter((b) => (b.textContent || '').includes('上一步'))
      .map((b) => b.textContent.trim());
    return { h3s, nextBtns, prevBtns };
  });
  return JSON.stringify(out, null, 1);
}
