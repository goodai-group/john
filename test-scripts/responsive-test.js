async page => {
  const out = {};
  // 设置 iPhone 尺寸
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  out.mobileHeader = await page.evaluate(() => {
    const header = document.querySelector('header');
    const h1 = header ? header.querySelector('h1')?.textContent?.trim() : '';
    const navCount = header ? header.querySelectorAll('button').length : 0;
    const bodyW = document.body.scrollWidth;
    return { h1, navCount, bodyW };
  });
  await page.screenshot({ path: './test-15-mobile-home.png', scale: 'css', type: 'png' });
  // 切换到我的项目
  await page.locator('button', { hasText: '我的项目' }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: './test-16-mobile-projects.png', scale: 'css', type: 'png' });
  out.mobileProjects = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('main > div > div')).filter((el) => el.textContent.includes('编辑申报'));
    return { cardCount: cards.length };
  });
  // 切回桌面
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  return JSON.stringify(out, null, 1);
}
