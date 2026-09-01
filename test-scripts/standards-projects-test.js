async page => {
  const out = {};
  const clickTab = async (label) => {
    const btn = page.locator('button', { hasText: label }).first();
    if (await btn.count() > 0) { await btn.click(); return true; }
    return false;
  };
  // 评分规则页
  await clickTab('评分规则');
  await page.waitForTimeout(800);
  out.standards = await page.evaluate(() => {
    const main = document.querySelector('main');
    const text = main ? main.textContent.replace(/\s+/g, ' ').slice(0, 1500) : '';
    // 检查关键要素
    const hasGate = text.includes('Gate') || text.includes('红线') || text.includes('一票否决');
    const hasIndustry = text.includes('餐饮') || text.includes('医疗') || text.includes('教育');
    const hasFormula = text.includes('评分') && (text.includes('公式') || text.includes('加权') || text.includes('得分'));
    return { text: text.slice(0, 800), hasGate, hasIndustry, hasFormula };
  });
  await page.screenshot({ path: './test-10-standards.png', scale: 'css', type: 'png' });

  // 我的项目页
  await clickTab('我的项目');
  await page.waitForTimeout(800);
  out.projects = await page.evaluate(() => {
    const main = document.querySelector('main');
    const text = main ? main.textContent.replace(/\s+/g, ' ') : '';
    // 项目卡片数量
    const cards = main ? main.querySelectorAll('button').length : 0;
    const hasProject = text.includes('阳光工坊');
    const hasReportBtn = text.includes('查看诊断报告');
    const hasEditBtn = text.includes('编辑申报');
    return { hasProject, hasReportBtn, hasEditBtn, textSample: text.slice(0, 400) };
  });
  await page.screenshot({ path: './test-11-projects.png', scale: 'css', type: 'png' });
  return JSON.stringify(out, null, 1);
}
