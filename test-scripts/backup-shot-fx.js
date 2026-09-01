async page => {
  const out = {};
  // 关闭多余 tab
  const pages = page.context().pages();
  for (let i = 1; i < pages.length; i++) await pages[i].close().catch(() => {});
  await page.waitForTimeout(300);
  // 打开云端备份弹窗并截图
  await page.locator('button', { hasText: '云端备份' }).first().click();
  await page.waitForTimeout(800);
  out.backupModalText = await page.evaluate(() => {
    // 找到最高层 fixed 弹窗
    const modals = Array.from(document.querySelectorAll('div')).filter((el) => {
      const s = getComputedStyle(el);
      return s.position === 'fixed' && el.offsetParent === null && el.textContent.trim().length > 60;
    });
    const texts = modals.map((el) => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 250));
    return texts.slice(-2);
  });
  await page.screenshot({ path: './test-12-backup.png', scale: 'css', type: 'png' });
  out.shot = 'ok';
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 汇率切换：回到快速体检，检查汇率区域
  await page.locator('button', { hasText: '快速体检' }).first().click();
  await page.waitForTimeout(600);
  out.fxArea = await page.evaluate(() => {
    const bodyText = document.body.textContent;
    const hasOfficial = bodyText.includes('官方汇率');
    const hasSelfReport = bodyText.includes('自报汇率');
    const hasMixed = bodyText.includes('多重汇率') || bodyText.includes('混合汇率');
    return { hasOfficial, hasSelfReport, hasMixed };
  });
  // 勾选多重汇率 checkbox
  const fxCheck = page.locator('input[type=checkbox]').first();
  out.checkboxCount = await page.locator('input[type=checkbox]').count();
  return JSON.stringify(out, null, 1);
}
