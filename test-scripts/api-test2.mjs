// 后端 API 复测
const BASE = 'http://localhost:3000';

// 1. AI chat - 完整响应
{
  const res = await fetch(`${BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '毛利率多少算健康？', history: [] })
  });
  const text = await res.text();
  console.log(`[chat] status=${res.status} len=${text.length}`);
  console.log(text.slice(0, 300));
  console.log('---');
}

// 2. infer-business-structure 正确参数
{
  const res = await fetch(`${BASE}/api/ai/infer-business-structure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName: '阳光工坊社区烘焙店', industry: '餐饮烘焙' })
  });
  const text = await res.text();
  console.log(`[infer] status=${res.status}`);
  console.log(text.slice(0, 300));
  console.log('---');
}

// 3. deep-diagnosis
{
  const res = await fetch(`${BASE}/api/ai/deep-diagnosis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: { name: '测试项目', monthlyRevenue: 100000, monthlyCogs: 40000 } })
  });
  const text = await res.text();
  console.log(`[deep-diagnosis] status=${res.status} len=${text.length}`);
  console.log(text.slice(0, 300));
  console.log('---');
}

// 4. 未知 API 是否 SPA fallback
{
  const res = await fetch(`${BASE}/api/nonexistent`);
  const text = await res.text();
  console.log(`[404-check] status=${res.status} contentType=${res.headers.get('content-type')} first100=${text.slice(0, 100).replace(/\n/g, ' ')}`);
}
