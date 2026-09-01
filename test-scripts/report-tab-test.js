async page => {
  const out = {};
  // 切换"专业财务明细模式"
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('专业财务明细模式'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  out.afterDetailMode = await page.evaluate(() => {
    const h3s = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim().slice(0, 80));
    const mainText = (document.querySelector('main') ? document.querySelector('main').textContent.trim().slice(0, 300) : '').replace(/\s+/g, ' ');
    return { h3s, mainText };
  });

  // 再切回"三分钟小白看懂速览"
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('三分钟小白看懂速览'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  out.afterSimpleMode = await page.evaluate(() => {
    const h3s = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim().slice(0, 80));
    const mainText = (document.querySelector('main') ? document.querySelector('main').textContent.trim().slice(0, 300) : '').replace(/\s+/g, ' ');
    return { h3s, mainText };
  });

  // 滚动页面，检查是否有雷达图、Gate等关键区域
  out.hasScore = await page.evaluate(() => document.body.textContent.includes('综合体检得分'));
  out.hasGate = await page.evaluate(() => document.body.textContent.includes('门槛红线'));
  out.hasRadar = await page.evaluate(() => document.body.textContent.includes('五维') || document.body.textContent.includes('雷达'));

  return JSON.stringify(out, null, 1);
}
