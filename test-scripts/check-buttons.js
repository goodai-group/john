async page => {
  const result = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map((b) => ({
      text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
      disabled: b.disabled,
      visible: b.offsetParent !== null,
      ariaDisabled: b.getAttribute('aria-disabled')
    }));
    return btns;
  });
  return JSON.stringify(result, null, 1);
}
