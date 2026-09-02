async page => {
  const out = {};
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  // 触控目标复查
  out.smallTouchTargets = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter((el) => el.offsetParent !== null);
    return btns
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 32 && r.width > 0)
      .slice(0, 8)
      .map(({ el, r }) => ({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 20), h: Math.round(r.height) }));
  });
  // 切到我的项目，检查列表 key 是否正常（无重复项目）
  await page.locator('button', { hasText: '我的项目' }).last().click({ force: true });
  await page.waitForTimeout(800);
  out.projects = await page.evaluate(() => {
    const names = Array.from(document.querySelectorAll('h3'))
      .map((h) => h.textContent.trim())
      .filter((t) => t && t !== '暂无申报项目');
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    return { projectCount: names.length, duplicateNames: dup };
  });
  return JSON.stringify(out, null, 1);
}
