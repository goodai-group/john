async page => {
  const out = {};
  const Q = '\u5feb\u901f\u4f53\u68c0';          // 快速体检
  const REPORT = '\u4e00\u952e\u751f\u6210\u4f53\u68c0\u62a5\u544a'; // 一键生成体检报告
  const MONEY100 = '\u6bcf\u6536\u5165 100 \u5757\u94b1'; // 每收入 100 块钱
  const REDLINE = '\u5b89\u5168\u7ea2\u7ebf';   // 安全红线
  const PROFMODE = '\u4e13\u4e1a\u8d22\u52a1\u660e\u7ec6\u6a21\u5f0f'; // 专业财务明细模式
  const MORE = '\u66f4\u591a';                   // 更多
  const SAND = '\u6c99\u76d2';                   // 沙盒
  const RULES = '\u8bc4\u5206';                  // 评分

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1200);

  out.quickCardShown = await page.evaluate((kw) => {
    const main = document.querySelector('main');
    return main ? main.textContent.includes(kw) : false;
  }, Q);

  out.navTabs = await page.evaluate(() => {
    const nav = document.querySelector('header nav');
    if (!nav) return 'no nav';
    return Array.from(nav.querySelectorAll('button')).map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 8);
  });

  out.moreOpened = await page.evaluate((kw) => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const more = btns.find((b) => (b.textContent || '').includes(kw));
    if (more) { more.click(); return true; }
    return false;
  }, MORE);
  await page.waitForTimeout(400);
  out.moreItems = await page.evaluate(({ s, r }) => {
    return Array.from(document.querySelectorAll('header button')).map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ')).filter((t) => t.includes(s) || t.includes(r));
  }, { s: SAND, r: RULES });
  await page.screenshot({ path: './_verify_quick_mode.png', scale: 'css', type: 'png' });
  await page.evaluate(() => document.body.click());
  await page.waitForTimeout(300);

  const inputs = await page.$$('main input[type="number"]');
  out.quickInputs = inputs.length;
  const values = [50000, 20000, 12000, 30000];
  for (let i = 0; i < Math.min(4, inputs.length); i++) {
    await inputs[i].fill(String(values[i]));
  }
  await page.waitForTimeout(300);
  out.quickClicked = await page.evaluate((kw) => {
    const btns = Array.from(document.querySelectorAll('main button'));
    const b = btns.find((x) => (x.textContent || '').includes(kw));
    if (b) { b.click(); return true; }
    return false;
  }, REPORT);
  await page.waitForTimeout(3000);

  out.reportShown = await page.evaluate((kw) => {
    const main = document.querySelector('main');
    return main ? main.textContent.includes(kw) : false;
  }, MONEY100);
  out.redlineShown = await page.evaluate((kw) => {
    const main = document.querySelector('main');
    return main ? main.textContent.includes(kw) : false;
  }, REDLINE);
  out.modeTabsGone = await page.evaluate((kw) => {
    const main = document.querySelector('main');
    return main ? !main.textContent.includes(kw) : true;
  }, PROFMODE);
  await page.screenshot({ path: './_verify_quick_report.png', scale: 'css', type: 'png' });

  return JSON.stringify(out, null, 1);
}
