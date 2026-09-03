// Vercel serverless function 入口
// 把根目录的 Express app 直接作为 serverless function 暴露，
// 所有形如 /api/* 的请求都会由这个文件处理并交给 server.ts 里定义的路由。
//
// 注意：不要在这里写新的业务逻辑，所有路由都在 server.ts 中。
// 若需要调整 API 行为，请改 server.ts 后重新部署。

import app from '../server';

export default app;
