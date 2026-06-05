/**
 * ============================================
 * Express 服务器
 * ============================================
 * 提供 REST API + SSE 流式响应。
 */

import express from 'express';
import cors from 'cors';
import { server as config } from '../config/index.js';
import routes from './routes.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件（前端）
app.use(express.static('frontend'));

// API 路由
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
export function startServer() {
  return new Promise((resolve) => {
    app.listen(config.port, () => {
      console.log(`\n========================================`);
      console.log(`  销售专家团 API 服务已启动`);
      console.log(`  http://localhost:${config.port}`);
      console.log(`  环境: ${config.env}`);
      console.log(`========================================\n`);
      resolve(app);
    });
  });
}

export default app;
