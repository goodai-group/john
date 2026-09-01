async page => {
  const out = {};
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  // 移动端首页检查
  out.mobile = await page.evaluate(() => {
    const bodyW = document.body.scrollWidth;
    const winW = window.innerWidth;
    // 移动 tab 栏
    const mobileTabs = Array.from(document.querySelectorAll('button'))
      .filter((b) => b.offsetParent !== null && ['快速体检', '体检报告', '沙盒试算', '评分规则', '我的项目'].includes(b.textContent.trim()));
    return {
      horizontalOverflow: bodyW > winW,
      bodyW,
      winW,
      visibleTabs: mobileTabs.map((b) => b.textContent.trim())
    };
  });
  await page.screenshot({ path: './test-15-mobile-home.png', scale: 'css', type: 'png' });
  // 点击移动端"我的项目"（force）
  await page.locator('button', { hasText: '我的项目' }).last().click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);
  out.projectsOverflow = await page.evaluate(() => {
    const bodyW = document.body.scrollWidth;
    return { horizontalOverflow: bodyW > window.innerWidth, bodyW, winW: window.innerWidth };
  });
  await page.screenshot({ path: './test-16-mobile-projects.png', scale: 'css', type: 'png' });
  // 报告页移动端
  await page.locator('button', { hasText: '体检报告' }).last().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './test-17-mobile-report.png', scale: 'css', type: 'png' });
  out.mobileReportOverflow = await page.evaluate(() => {
    const bodyW = document.body.scrollWidth;
    return { horizontalOverflow: bodyW > window.innerWidth, bodyW, winW: window.innerWidth };
  });
  return JSON.stringify(out, null, 1);
}
