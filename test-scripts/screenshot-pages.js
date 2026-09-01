async page => {
  const out = {};
  const clickTab = async (label) => {
    await page.evaluate((lbl) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === lbl);
      if (btn) btn.click();
    }, label);
    await page.waitForTimeout(500);
  };
  await clickTab('沙盒试算');
  await page.screenshot({ path: './test-03-sandbox.png', scale: 'css', type: 'png' });
  out.sandbox = 'ok';
  await clickTab('评分规则');
  await page.screenshot({ path: './test-04-standards.png', scale: 'css', type: 'png' });
  out.standards = 'ok';
  await clickTab('我的项目');
  await page.screenshot({ path: './test-05-projects.png', scale: 'css', type: 'png' });
  out.projects = 'ok';
  return JSON.stringify(out, null, 1);
}
