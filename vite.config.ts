import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // 项目根目录（index.html 所在位置）
  root: './frontend',

  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
    },
  },

  // 开发服务器配置
  server: {
    port: 5173,
    open: true, // 自动打开浏览器
    proxy: {
      // 代理 API 请求到后端
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  // 构建配置
  build: {
    outDir: '../dist', // 输出到项目根目录的 dist 文件夹
    emptyOutDir: true,
    sourcemap: true, // 生成 source map 方便调试
  },
});
