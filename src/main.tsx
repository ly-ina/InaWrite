/**
 * 应用入口文件
 * 初始化 React 并挂载到 DOM
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from './i18n';
import App from './App';

// 获取根节点并渲染应用
const rootElement = document.getElementById('app');
if (!rootElement) {
  throw new Error('找不到根节点 #app，请检查 index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
