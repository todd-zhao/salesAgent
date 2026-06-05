/**
 * ============================================
 * Markdown 文档批量导入工具
 * ============================================
 * 将 data/markdown/ 目录下的 .md 文件批量导入向量知识库。
 *
 * 目录组织方式：
 *   data/markdown/
 *     sales_coach_knowledge/       ← Collection 名称
 *       SPIN销售法.md
 *     question_design_knowledge/
 *       漏斗式提问法.md
 *
 * 文件头部支持 YAML frontmatter 用于添加元数据。
 *
 * 使用方式:
 *   npm run import-md
 *   node scripts/import-markdown.js --dir ./my-docs --collection sales_coach_knowledge
 *
 * 内存友好：逐文件处理，每处理完一个立即写入向量库
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vectorStore from '../src/vectorstore/qdrant-client.js';
import { createEmbeddings } from '../src/llm/embeddings.js';
import { getAllAgentInfos } from '../src/agents/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MD_DIR = path.join(__dirname, '..', 'data', 'markdown');

// ---- 命令行参数 ----
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}
const customDir = getArg('--dir') || getArg('-d');
const customCollection = getArg('--collection') || getArg('-c');
const chunkSize = parseInt(getArg('--chunk-size') || getArg('-s') || '2000', 10);
const chunkOverlap = parseInt(getArg('--overlap') || getArg('-o') || '200', 10);

// ---- Frontmatter 解析 ----
function parseFrontmatter(content) {
  const meta = {};
  let body = content;

  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      const fmText = content.slice(3, endIdx).trim();
      body = content.slice(endIdx + 3).trim();

      for (const line of fmText.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();

        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
        } else {
          value = value.replace(/^['"]|['"]$/g, '');
        }
        meta[key] = value;
      }
    }
  }
  return { metadata: meta, content: body };
}

// ---- 文本分块 ----
function chunkText(text, maxSize, overlap) {
  if (text.length <= maxSize) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    if (end < text.length) {
      const pEnd = text.lastIndexOf('\n\n', end);
      if (pEnd > start + maxSize * 0.5) end = pEnd;
      else {
        const sEnd = text.lastIndexOf('。', end);
        if (sEnd > start + maxSize * 0.5) end = sEnd + 1;
      }
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start = end - overlap;
  }
  return chunks;
}

function titleFromFilename(filename) {
  return filename.replace(/\.md$/i, '').replace(/[/_]/g, ' ').trim();
}

// ---- 主流程 ----
async function main() {
  console.log('========================================');
  console.log('  Markdown 文档批量导入工具');
  console.log('  (逐文件处理，内存友好)');
  console.log('========================================\n');

  // 1. 初始化 Embedding
  console.log('[Init] 初始化 Embedding 模型...');
  const embeddings = createEmbeddings();
  vectorStore.setEmbeddings(embeddings);
  console.log('[Init] OK\n');

  // 2. 确定扫描目录
  const scanDir = customDir || DEFAULT_MD_DIR;
  if (!fs.existsSync(scanDir)) {
    fs.mkdirSync(scanDir, { recursive: true });
    console.log(`[Scan] 已创建目录: ${scanDir}`);
  }

  // 3. 获取有效知识库列表
  const experts = getAllAgentInfos();
  const validCollections = new Set(experts.map((e) => e.collectionName));
  console.log(`[Scan] 有效知识库: ${[...validCollections].join(', ')}\n`);

  // 4. 扫描 .md 文件
  const mdFiles = [];

  if (customCollection) {
    const dir = path.join(scanDir, customCollection);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
      files.forEach((f) => mdFiles.push({ collection: customCollection, file: path.join(dir, f), name: f }));
    }
  } else {
    const entries = fs.readdirSync(scanDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(scanDir, entry.name);
        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md'));
        files.forEach((f) => mdFiles.push({ collection: entry.name, file: path.join(dirPath, f), name: f }));
      }
    }
  }

  if (mdFiles.length === 0) {
    console.log('[Scan] 未找到 .md 文件');
    console.log(`\n请将 Markdown 文件放入:`);
    console.log(`  ${scanDir}/`);
    console.log(`  按知识库名分子目录，例如:`);
    console.log(`  ${scanDir}/sales_coach_knowledge/你的文档.md\n`);
    return;
  }

  console.log(`[Scan] 找到 ${mdFiles.length} 个 .md 文件\n`);

  // 5. 按 collection 分组
  const grouped = {};
  for (const { collection, file, name } of mdFiles) {
    if (!grouped[collection]) grouped[collection] = [];
    grouped[collection].push({ file, name });
  }

  let totalChunks = 0;

  // 6. 逐 collection 逐文件导入（内存友好）
  for (const [collection, files] of Object.entries(grouped)) {
    if (!validCollections.has(collection) && !customCollection) {
      console.warn(`[Warn] "${collection}" 不是预定义知识库，将创建新集合`);
    }

    console.log(`[${collection}] ${files.length} 个文件`);

    let colCount = 0;
    for (const { file, name } of files) {
      const raw = fs.readFileSync(file, 'utf-8');
      const { metadata, content } = parseFrontmatter(raw);
      const title = metadata.title || titleFromFilename(name);
      const chunks = chunkText(content, chunkSize, chunkOverlap);

      // 构建本文件的文档列表
      const docs = chunks.map((chunk, i) => ({
        id: `${collection}-${name.replace(/\.md$/, '')}-${i + 1}`,
        content: chunk,
        metadata: {
          ...metadata,
          title: chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title,
          sourceFile: name,
          chunkIndex: i,
          totalChunks: chunks.length,
          importedAt: new Date().toISOString(),
        },
      }));

      // 立即写入向量库，不堆积
      const count = await vectorStore.addDocuments(collection, docs);
      colCount += count;
      totalChunks += count;
      console.log(`  + ${name} (${chunks.length} 段)`);

      // 主动释放
      docs.length = 0;
    }

    console.log(`  OK ${collection}: ${colCount} 条\n`);
  }

  console.log('========================================');
  console.log('  导入完成');
  console.log(`  文件数: ${mdFiles.length}`);
  console.log(`  文档片段: ${totalChunks}`);
  console.log(`  知识库数: ${Object.keys(grouped).length}`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('导入失败:', err);
  process.exit(1);
});
