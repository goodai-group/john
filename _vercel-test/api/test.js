// 最小化测试函数：无任何外部依赖
export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, time: Date.now() }));
}
