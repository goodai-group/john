async page => {
  const out = {};
  await page.locator('button', { hasText: '体检报告' }).first().click();
  await page.waitForTimeout(1200);

  // 1. 历史版本下拉
  out.versionSelect = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    return selects.map((s) => ({ options: Array.from(s.options).map((o) => o.text).slice(0, 5), value: s.value }));
  });

  // 2. 复制摘要（需要 clipboard 权限，先授权）
  const ctx = page.context();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3000' });
  const copyBtn = page.locator('main button', { hasText: '复制摘要' }).first();
  if (await copyBtn.count() > 0) {
    await copyBtn.click();
    await page.waitForTimeout(800);
    out.copyToast = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const m = bodyText.match(/已复制[^\n]{0,30}|复制成功[^\n]{0,30}|已写入剪贴板[^\n]{0,30}/);
      return m ? m[0] : null;
    });
    // 读取剪贴板
    try {
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      out.clipboardSample = clip ? clip.slice(0, 150) : '';
    } catch (e) {
      out.clipboardError = e.message;
    }
  }

  // 3. 保存体检卡（PDF）——监听下载或打印
  const printBtn = page.locator('main button', { hasText: '保存体检卡' }).first();
  if (await printBtn.count() > 0) {
    out.savePdfBtn = true;
    // 检查点击后的行为（可能 window.print()）
    await printBtn.click();
    await page.waitForTimeout(800);
    out.afterSaveClick = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const m = bodyText.match(/打印[^\n]{0,30}|PDF[^\n]{0,30}|已生成[^\n]{0,30}/);
      return m ? m[0] : null;
    });
  }

  // 4. 备份按钮（导出 JSON）
  const backupBtn = page.locator('main button', { hasText: '备份' }).first();
  out.hasBackupBtn = await backupBtn.count() > 0;

  return JSON.stringify(out, null, 1);
}
