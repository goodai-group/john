async page => {
  const out = {};
  // 1. 云端备份弹窗
  const backupBtn = page.locator('button', { hasText: '云端备份' }).first();
  if (await backupBtn.count() > 0) {
    await backupBtn.click();
    await page.waitForTimeout(800);
    out.backupModal = await page.evaluate(() => {
      const dlg = document.querySelector('[role=dialog]');
      if (dlg) return dlg.textContent.trim().replace(/\s+/g, ' ').slice(0, 300);
      // 尝试查找 modal 容器
      const modals = Array.from(document.querySelectorAll('div')).filter((el) => {
        const s = getComputedStyle(el);
        return s.position === 'fixed' && s.zIndex > 10 && el.textContent.trim().length > 50;
      });
      return modals.length > 0 ? modals[modals.length - 1].textContent.trim().replace(/\s+/g, ' ').slice(0, 300) : null;
    });
    // 关闭
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 2. 删除项目（通过报告页"彻底删除"）
  // 先进入报告页
  const reportTab = page.locator('button', { hasText: '体检报告' }).first();
  if (await reportTab.count() > 0) {
    await reportTab.click();
    await page.waitForTimeout(1000);
  }
  const delBtn = page.locator('button', { hasText: '彻底删除' }).first();
  if (await delBtn.count() > 0) {
    await delBtn.click();
    await page.waitForTimeout(800);
    out.deleteConfirm = await page.evaluate(() => {
      const dlg = document.querySelector('[role=dialog]');
      if (dlg) return dlg.textContent.trim().replace(/\s+/g, ' ').slice(0, 250);
      const modals = Array.from(document.querySelectorAll('div')).filter((el) => {
        const s = getComputedStyle(el);
        return s.position === 'fixed' && s.zIndex > 10 && el.textContent.trim().length > 50;
      });
      return modals.length > 0 ? modals[modals.length - 1].textContent.trim().replace(/\s+/g, ' ').slice(0, 250) : null;
    });
    // 取消删除（不执行破坏操作）
    const cancelBtn = page.locator('button', { hasText: /取消|暂不/ }).first();
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
      out.deleteCancelled = true;
    } else {
      await page.keyboard.press('Escape');
      out.deleteCancelled = false;
    }
    await page.waitForTimeout(500);
  }

  return JSON.stringify(out, null, 1);
}
