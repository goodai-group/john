// 临时验证脚本：模拟 Vercel 用 esbuild 编译 api 函数后，在 Node 中端到端调用
// 用法: node _tmp-verify/run-bundle-test.mjs <bundlePath>
import http from 'http';
import { pathToFileURL } from 'url';

process.env.VERCEL = '1'; // 阻止 server.ts 在本机直接 listen

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error('usage: node _tmp-verify/run-bundle-test.mjs <bundle>');
  process.exit(1);
}

let mod;
try {
  mod = await import(pathToFileURL(bundlePath).href);
} catch (err) {
  console.log('MODULE_LOAD_FAILED');
  console.log(String(err?.stack || err).slice(0, 2000));
  process.exit(2);
}
console.log('MODULE_LOAD_OK  exports:', Object.keys(mod));

if (typeof mod.default !== 'function') {
  console.log('NO_DEFAULT_HANDLER');
  process.exit(3);
}

const server = http.createServer((req, res) => {
  mod.default(req, res);
});

await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;

async function post(path, body) {
  const r = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  const text = await r.text();
  console.log(`\n== ${path} -> HTTP ${r.status}`);
  console.log(text.slice(0, 600));
  return r.status;
}

async function get(path) {
  const r = await fetch(`http://127.0.0.1:${port}${path}`, {
    signal: AbortSignal.timeout(15000)
  });
  const text = await r.text();
  console.log(`\n== GET ${path} -> HTTP ${r.status}`);
  console.log(text.slice(0, 600));
  return r.status;
}

try {
  await get('/api/health');
  await post('/api/ai-consultation', { question: '你好' });
  await post('/api/ai/chat', { question: '毛利多少算健康？' });
} catch (err) {
  console.log('REQUEST_ERROR:', String(err?.message || err).slice(0, 500));
} finally {
  server.close();
  process.exit(0);
}
