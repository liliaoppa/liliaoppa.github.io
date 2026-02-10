/**
 * CPED Application Entry Point
 * 应用入口文件
 */

import { app } from './app.js';

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// 处理浏览器返回/前进
window.addEventListener('popstate', (e) => {
  app.handlePopState(e);
});

// 全局错误处理
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
