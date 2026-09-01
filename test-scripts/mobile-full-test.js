async page => {
  const out = {};
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  const checkOverflow = async (label) => {
    const info = await page.evaluate(() => {
      const bodyW = document.body.scrollWidth;
      const winW = window.innerWidth;
      const scrollable = Array.from(document.querySelectorAll('*')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > winW + 2 || r.left < -2;
      });
      return {
        horizontalOverflow: bodyW > winW,
        bodyW,
        winW,
        overflowEls: scrollable
          .slice(0, 5)
          .map((el) => ({
            tag: el.tagName,
            cls: (el.className && String(el.className).slice(0, 60)) || '',
            right: Math.round(el.getBoundingClientRect().right)
          }))
      };
    });
    return info;
  };

  const tabs = ['快速体检', '体检报告', '沙盒试算', '评分规则', '我的项目'];
  out.pages = {};
  for (const tab of tabs) {
    const btn = page.locator('button', { hasText: tab }).last();
    try {
      await btn.click({ force: true, timeout: 3000 });
    } catch (e) {
      out.pages[tab] = { error: 'tab not clickable: ' + e.message.split('\n')[0] };
      continue;
    }
    await page.waitForTimeout(900);
    out.pages[tab] = await checkOverflow(tab);
    const safe = tab.replace(/[^\w\u4e00-\u9fa5]/g, '');
    await page.screenshot({ path: `./test-mobile-${safe}.png`, scale: 'css', type: 'png' });
  }

  // 回到表单页，检查表单在手机端的关键布局
  await page.locator('button', { hasText: '快速体检' }).last().click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  out.formDetails = await page.evaluate(() => {
    const winW = window.innerWidth;
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).filter((el) => el.offsetParent !== null);
    const labels = Array.from(document.querySelectorAll('label')).filter((el) => el.offsetParent !== null);
    const badInputs = inputs.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < -1 || r.right > winW + 1;
    });
    return {
      visibleInputCount: inputs.length,
      visibleLabelCount: labels.length,
      overflowingInputs: badInputs.map((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type') || '',
        name: el.getAttribute('name') || el.getAttribute('placeholder') || ''
      }))
    };
  });
  await page.screenshot({ path: './test-mobile-form.png', scale: 'css', type: 'png' });

  // 检查移动端触控目标是否过小（按钮高度）
  out.smallTouchTargets = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter((el) => el.offsetParent !== null);
    const small = btns
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 32 && r.width > 0)
      .slice(0, 8)
      .map(({ el, r }) => ({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 20), h: Math.round(r.height) }));
    return small;
  });

  return JSON.stringify(out, null, 1);
}
