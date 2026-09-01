// 后端 API 测试脚本
const BASE = 'http://localhost:3000';

async function test(name, fn) {
  try {
    const r = await fn();
    console.log(`[PASS] ${name}: ${JSON.stringify(r).slice(0, 200)}`);
  } catch (e) {
    console.log(`[FAIL] ${name}: ${e.message}`);
  }
}

// 1. 健康检查
await test('GET /api/health', async () => {
  const res = await fetch(`${BASE}/api/health`);
  return { status: res.status, body: await res.json() };
});

// 2. AI 咨询
await test('POST /api/ai/chat', async () => {
  const res = await fetch(`${BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '毛利率多少算健康？', history: [] })
  });
  return { status: res.status, body: (await res.json()).slice(0, 120) };
});

// 3. AI 业务结构推断
await test('POST /api/ai/infer-business-structure', async () => {
  const res = await fetch(`${BASE}/api/ai/infer-business-structure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName: '阳光工坊社区烘焙店', industry: '餐饮烘焙' })
  });
  return { status: res.status, body: await res.json() };
});

// 4. AI 深度诊断
await test('POST /api/ai/deep-diagnosis', async () => {
  const res = await fetch(`${BASE}/api/ai/deep-diagnosis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: { name: '测试', monthlyRevenue: 100000 } })
  });
  return { status: res.status, body: (await res.json()).slice ? (await res.json()).slice(0, 120) : await res.json() };
});

// 5. AI OCR 估算
await test('POST /api/ai/ocr-estimate', async () => {
  const res = await fetch(`${BASE}/api/ai/ocr-estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageHint: 'test' })
  });
  return { status: res.status, body: await res.json() };
});

// 6. 未知路由
await test('GET /api/nonexistent', async () => {
  const res = await fetch(`${BASE}/api/nonexistent`);
  return { status: res.status };
});
