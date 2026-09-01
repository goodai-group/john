// deep-diagnosis 正确参数 + 性能测量
const BASE = 'http://localhost:3000';

// 1. deep-diagnosis with report object
{
  const res = await fetch(`${BASE}/api/ai/deep-diagnosis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report: { score: 81, grade: 'A', monthlyNetProfit: 76000, monthlyRevenue: 330000 }
    })
  });
  const text = await res.text();
  console.log(`[deep-diagnosis] status=${res.status} len=${text.length}`);
  console.log(text.slice(0, 250));
  console.log('---');
}

// 2. 性能：首页加载
{
  const t0 = Date.now();
  const res = await fetch(`${BASE}/`);
  const text = await res.text();
  const t1 = Date.now();
  console.log(`[index] status=${res.status} size=${(text.length / 1024).toFixed(1)}KB time=${t1 - t0}ms`);
}

// 3. 性能：bundle 大小
{
  const res = await fetch(`${BASE}/`);
  const text = await res.text();
  const m = text.match(/src="([^"]+\.js)"/g);
  console.log(`[bundles] ${m ? m.join(', ') : 'none'}`);
}
