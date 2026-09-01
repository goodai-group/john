async page => {
  const out = {};
  out.url = page.url();
  out.body = await page.evaluate(() => {
    // 主要 heading
    const h1 = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '';
    const h2s = Array.from(document.querySelectorAll('h2')).map((h) => h.textContent.trim().slice(0, 80));
    const h3s = Array.from(document.querySelectorAll('h3')).map((h) => h.textContent.trim().slice(0, 80));
    // banner / alert
    const alerts = Array.from(document.querySelectorAll('[role=alert], [role=status]')).map((a) => a.textContent.trim().slice(0, 200));
    // 主要按钮
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)).slice(0, 20);
    return { h1, h2s, h3s, alerts, btns };
  });
  return JSON.stringify(out, null, 1);
}
