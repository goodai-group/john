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
        // 注意：根 package.json 不得声明 "type": "module"！
        // Vercel 会把 api/*.ts 编译为 CJS（无 type:module 时）才能让 Express 正常运行；
        // 一旦声明 type:module，Vercel 按 ESM 内联打包，Express 的 CJS 动态 require
        // 会在函数加载期崩溃（FUNCTION_INVOCATION_FAILED / 500）。
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
