async page => {
  const out = {};
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1200);
  const hasText = (t) => page.evaluate((kw) => (document.querySelector('main') || {}).textContent ? document.querySelector('main').textContent.includes(kw) : false, t);
  out.quickCardShown = await hasText('\u5feb\u901f\u4f53\u68c0');
  out.mobileTabs = await page.evaluate(() => {
    const row = document.querySelector('.md\\:hidden');
    return row ? Array.from(row.querySelectorAll('button')).map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 6) : 'none';
  });
  await page.screenshot({ path: './_verify_mobile.png', scale: 'css', type: 'png' });
  return JSON.stringify(out, null, 1);
}
