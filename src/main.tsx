import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 检查是否处于 OAuth 登录授权弹窗环境（window.opener 存在）
if (window.opener && window.opener !== window) {
  const isOAuthCallback =
    window.location.search.includes('code=') ||
    window.location.hash.includes('access_token=') ||
    window.location.search.includes('error=') ||
    window.location.hash.includes('error=');

  if (isOAuthCallback) {
    // 延迟 600ms 让 Supabase SDK 完成 code/hash 换取 session 并写入 localStorage，随后自动关闭小弹窗
    setTimeout(() => {
      try {
        window.close();
      } catch (e) {
        console.warn('OAuth popup auto-close prevented:', e);
      }
    }, 600);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
