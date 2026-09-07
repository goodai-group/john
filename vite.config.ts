import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // 根 package.json 必须声明 "type": "module"：
        // Vercel 按根 tsconfig(module=ESNext) 把 api/*.ts 编译为【ESM】产物（保留 export default），
        // 若 package.json 没有 type:module，Node 会以 CJS 加载这些 .js，
        // 直接 SyntaxError: Unexpected token 'export' → 函数启动即崩(FUNCTION_INVOCATION_FAILED / 500)。
        // 实测 Vercel 并不做依赖内联打包，只是逐文件转译，因此 Express 的 CJS 依赖不会受影响。
        // 本 config 通过 Vite 独立加载，无需依赖包级 type 字段；npm scripts 均在项目根执行，
        // process.cwd() 即项目根，__dirname 在两种加载方式下都不可靠。
        '@': path.resolve(process.cwd()),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
