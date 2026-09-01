async page => {
  const out = {};
  const clickByText = async (kw) => {
    const r = await page.evaluate((k) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes(k));
      if (btn) { btn.click(); return true; }
      return false;
    }, kw);
    await page.waitForTimeout(600);
    return r;
  };
  const getStep = () =>
    page.evaluate(() => {
      const h3 = document.querySelector('h3');
      return h3 ? h3.textContent.trim() : '';
    });

  // 新建项目
  await clickByText('我的项目');
  await clickByText('新建商业自测项目');
  await page.waitForTimeout(700);

  // 填名称
  await page.evaluate(() => {
    const n = document.querySelector('input[type=text]');
    if (n) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(n, 'QA正式流程测试项目');
      n.dispatchEvent(new Event('input', { bubbles: true }));
      n.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(400);
  out.step1 = await getStep();
  out.nameAfterFill = await page.evaluate(() => {
    const n = document.querySelector('input[type=text]');
    return n ? n.value : null;
  });

  // 步骤2：流水补全（将其中一月清空再点 AI 补全）
  await clickByText('下一步');
  out.step2 = await getStep();
  out.step2MonthInputs = await page.evaluate(() => {
    // 找到月份流水输入框
    const inputs = Array.from(document.querySelectorAll('input[type=number]')).map((i) => ({
      val: i.value,
      label: i.getAttribute('aria-label') || i.getAttribute('placeholder') || ''
    }));
    return inputs;
  });

  // 清空最后一个月，点 AI 补全
  const cleared = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type=number]'));
    if (inputs.length > 0) {
      const last = inputs[inputs.length - 1];
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(last, '');
      last.dispatchEvent(new Event('input', { bubbles: true }));
      last.dispatchEvent(new Event('change', { bubbles: true }));
      return last.value;
    }
    return null;
  });
  out.clearedLastMonth = cleared;
  await clickByText('AI 智能补全');
  await page.waitForTimeout(800);
  out.afterAiFill = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type=number]'));
    return inputs.map((i) => i.value).slice(-3);
  });

  // 步骤3 直接下一步
  await clickByText('下一步');
  out.step3 = await getStep();
  await clickByText('下一步');
  out.step4 = await getStep();
  await clickByText('下一步');
  out.step5 = await getStep();
  out.submit = await clickByText('确认提交');
  await page.waitForTimeout(3200);
  out.afterSubmit = await page.evaluate(() => {
    const h2 = document.querySelector('h2') ? document.querySelector('h2').textContent.trim() : '';
    const nameLine = (document.body.textContent.match(/项目名称[:：][^\n]{0,40}/) || [''])[0];
    return { h2, nameLine };
  });
  // 截图报告
  await page.screenshot({ path: './test-06-report-qa.png', scale: 'css', type: 'png' });
  out.screenshot = 'ok';
  return JSON.stringify(out, null, 1);
}
