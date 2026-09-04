// CJS 变体验证：用 require() 加载 esbuild CJS 产物（模拟 Vercel 无 type:module 时的加载方式）
process.env.VERCEL = '1';
const http = require('http');
const path = require('path');

const bundlePath = process.argv[2];
let exportsObj;
try {
  exportsObj = require(path.resolve(bundlePath));
} catch (err) {
  console.log('MODULE_LOAD_FAILED');
  console.log(String((err && err.stack) || err).slice(0, 2000));
  process.exit(2);
}
const handler = typeof exportsObj.default === 'function' ? exportsObj.default : (typeof exportsObj === 'function' ? exportsObj : null);
console.log('MODULE_LOAD_OK  keys:', Object.keys(exportsObj), 'handler?', !!handler);
if (!handler) process.exit(3);

const server = http.createServer((req, res) => handler(req, res));
server.listen(0, async () => {
  const port = server.address().port;
  async function post(p, body) {
    const r = await fetch(`http://127.0.0.1:${port}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await r.text();
    console.log(`== ${p} -> HTTP ${r.status}`);
    console.log(text.slice(0, 400));
  }
  async function get(p) {
    const r = await fetch(`http://127.0.0.1:${port}${p}`, { signal: AbortSignal.timeout(15000) });
    const text = await r.text();
    console.log(`== GET ${p} -> HTTP ${r.status}`);
    console.log(text.slice(0, 400));
  }
  try {
    await get('/api/health');
    await post('/api/ai-consultation', { question: '你好' });
    await post('/api/ai/chat', { question: '毛利率多少算健康' });
  } catch (err) {
    console.log('REQUEST_ERROR:', String((err && err.message) || err).slice(0, 500));
  } finally {
    server.close();
    process.exit(0);
  }
});
