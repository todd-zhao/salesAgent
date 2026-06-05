/**
 * ============================================
 * 销售专家团 — 应用入口
 * ============================================
 * 启动服务器，初始化向量数据库和 Embedding 模型。
 * 所有组件内置，无需外部服务。
 */

import { startServer } from './server/app.js';
import vectorStore from './vectorstore/qdrant-client.js';
import { createEmbeddings } from './llm/embeddings.js';
import { getAllAgentInfos } from './agents/index.js';

async function main() {
  console.log('========================================');
  console.log('  销售专家团 (Sales Expert Group)');
  console.log('  v1.0 · 全栈内置 无需外部服务');
  console.log('========================================\n');

  // 1. 初始化 Embedding 模型
  console.log('[Init] 初始化 Embedding 模型...');
  try {
    const embeddings = createEmbeddings();
    vectorStore.setEmbeddings(embeddings);
    console.log('[Init] ✅ Embedding 模型加载完成');
  } catch (err) {
    console.warn(`[Init] ⚠️ Embedding 加载跳过: ${err.message}`);
    console.warn('[Init] 知识库检索功能将不可用，Agent 将使用 LLM 自身知识');
  }

  // 2. 初始化本地向量数据库（自动创建 data/vectorstore/）
  console.log('[Init] 初始化本地向量数据库...');
  try {
    const healthy = await vectorStore.healthCheck();
    if (healthy) {
      const stats = await vectorStore.stats();
      console.log(`[Init] ✅ 本地向量数据库就绪`);
      console.log(`[Init]    数据目录: ${stats.dataDir}`);
      console.log(`[Init]    现有知识库: ${stats.totalCollections} 个`);
      console.log(`[Init]    文档总数: ${stats.totalDocuments} 条`);
      if (stats.totalCollections > 0) {
        for (const [name, count] of Object.entries(stats.collections)) {
          console.log(`[Init]      - ${name}: ${count} 条`);
        }
      }
    } else {
      console.warn('[Init] ⚠️ 向量数据库初始化失败');
    }
  } catch (err) {
    console.warn(`[Init] ⚠️ 向量数据库初始化跳过: ${err.message}`);
  }

  // 3. 列出所有专家
  const experts = getAllAgentInfos();
  console.log(`\n[Init] 已加载 ${experts.length} 位销售专家:`);
  experts.forEach((e, i) => {
    console.log(`  ${String(i + 1).padStart(2, ' ')}. ${e.label} ← 知识库: ${e.collectionName}`);
  });

  // 4. 启动服务器
  await startServer();
}

main().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
