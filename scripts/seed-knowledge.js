/**
 * ============================================
 * 知识库种子数据初始化脚本
 * ============================================
 * 运行方式: npm run seed
 *
 * 将 data/seed/ 目录下的 JSON 文件内容导入本地向量库。
 * 每个 JSON 文件对应一个 Collection（知识库）。
 *
 * JSON 格式:
 * {
 *   "collection": "sales_coach_knowledge",
 *   "documents": [
 *     {
 *       "id": "uuid-or-string",
 *       "content": "文档正文内容",
 *       "metadata": {
 *         "title": "文档标题",
 *         "category": "methodology|case|template",
 *         "tags": ["tag1", "tag2"],
 *         "source": "来源",
 *         "difficulty": "beginner|intermediate|advanced",
 *         "scenarios": ["场景1", "场景2"]
 *       }
 *     }
 *   ]
 * }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vectorStore from '../src/vectorstore/qdrant-client.js';
import { createEmbeddings } from '../src/llm/embeddings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');

async function seed() {
  console.log('========================================');
  console.log('  知识库种子数据导入');
  console.log('========================================\n');

  // 1. 初始化 Embedding
  console.log('[Seed] 初始化 Embedding 模型...');
  const embeddings = createEmbeddings();
  vectorStore.setEmbeddings(embeddings);
  console.log('[Seed] ✅ Embedding 模型就绪\n');

  // 2. 读取所有 JSON 种子文件
  const seedFiles = fs
    .readdirSync(SEED_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (seedFiles.length === 0) {
    console.log('[Seed] ⚠️ data/seed/ 目录下没有 JSON 文件');
    console.log('[Seed] 请添加种子文件后再运行此脚本');
    return;
  }

  let totalDocs = 0;
  for (const file of seedFiles) {
    const filePath = path.join(SEED_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const { collection, documents } = data;
    if (!collection || !documents || documents.length === 0) {
      console.warn(`[Seed] ⚠️ 跳过 ${file}: 缺少 collection 或 documents`);
      continue;
    }

    console.log(`[Seed] 正在导入: ${file} → ${collection}`);
    const count = await vectorStore.addDocuments(collection, documents);
    totalDocs += count;
    console.log(`[Seed] ✅ 完成: ${count} 条\n`);
  }

  console.log(`========================================`);
  console.log(`  ✅ 导入完成: 共 ${totalDocs} 条文档`);
  console.log(`  数据存储在: data/vectorstore/`);
  console.log(`========================================`);
}

seed().catch((err) => {
  console.error('种子导入失败:', err);
  process.exit(1);
});
