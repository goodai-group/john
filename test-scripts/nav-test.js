async page => {
  const out = {};
  const clickTab = async (label) => {
    await page.evaluate((lbl) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === lbl);
      if (btn) btn.click();
    }, label);
    await page.waitForTimeout(600);
  };
  const getState = async (tag) => {
    out[tag] = await page.evaluate(() => {
      const h1 = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '';
      const h2s = Array.from(document.querySelectorAll('h2')).map((h) => h.textContent.trim().slice(0, 80));
      const h3s = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim().slice(0, 80));
      const mainText = (document.querySelector('main') ? document.querySelector('main').textContent.trim().slice(0, 250) : '').replace(/\s+/g, ' ');
      const mainBtns = Array.from(document.querySelectorAll('main button')).filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)).slice(0, 15);
      return { h1, h2s, h3s, mainText, mainBtns };
    });
  };

  await clickTab('沙盒试算');
  await getState('sandbox');
  await clickTab('评分规则');
  await getState('standards');
  await clickTab('我的项目');
  await getState('projects');
  await clickTab('快速体检');
  await getState('form');

  return JSON.stringify(out, null, 1);
}
