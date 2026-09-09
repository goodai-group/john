import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// OAuth 登录弹窗的自动关闭逻辑统一交给 src/lib/supabaseClient.ts：
// 那里会等待 session 真正写入 localStorage 后再关闭弹窗，并带有兜底超时，
// 避免这里用固定 600ms 定时器抢先关闭，导致 session 还没换取完成弹窗就被关掉
// （慢网络/Supabase 冷启动下会出现"明明登录成功却提示失败"的竞态问题）。

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
