async page => {
  const out = {};
  out.initialTabs = await page.context().pages().length;
  // 1. 云端备份
  const backupBtn = page.locator('button', { hasText: '云端备份' }).first();
  if (await backupBtn.count() > 0) {
    await backupBtn.click();
    await page.waitForTimeout(1000);
    out.tabsAfterBackup = await page.context().pages().length;
    // 检查是否新开 tab
    const pages = page.context().pages();
    out.newTabUrl = pages.length > 1 ? pages[1].url().slice(0, 120) : null;
    // 检查主页面是否有弹窗文本
    out.backupText = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const m = bodyText.match(/云端备份.{0,200}|备份.{0,150}/s);
      const hasBackupKeywords = bodyText.includes('下载 JSON') || bodyText.includes('JSON 备份') || bodyText.includes('云端');
      // 查找 modal 背景
      const modals = Array.from(document.querySelectorAll('[class*="fixed"], [class*="modal"]')).filter((el) => {
        const s = getComputedStyle(el);
        return (s.position === 'fixed') && el.textContent.trim().length > 30;
      });
      return { hasBackupKeywords, modals: modals.map((el) => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 200)) };
    });
  }
  // 切回第一个页面
  const pages = page.context().pages();
  if (pages.length > 1) {
    await pages[1].close();
    out.closedExtraTab = true;
  }
  await page.waitForTimeout(500);

  // 2. 使用 Google 登录
  await page.locator('button', { hasText: '使用 Google 登录' }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  out.tabsAfterGoogle = page.context().pages().length;
  const pages2 = page.context().pages();
  out.googleTabUrl = pages2.length > 1 ? pages2[1].url().slice(0, 100) : null;

  return JSON.stringify(out, null, 1);
}
