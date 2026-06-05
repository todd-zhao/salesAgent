/**
 * ============================================
 * Markdown 文档批量导入工具
 * ============================================
 * 将 data/markdown/ 目录下的 .md 文件批量导入向量知识库。
 *
 * 目录组织方式：
 *   data/markdown/
 *     sales_coach_knowledge/       ← Collection 名称（对应专家知识库）
 *       SPIN销售法.md
 *       Challenger销售.md
 *     question_design_knowledge/
 *       漏斗式提问法.md
 *     story_creation_knowledge/
 *       ...
 *
 * 文件头部支持 YAML frontmatter 用于添加元数据：
 *   ---
 *   title: SPIN 销售法详解
 *   category: methodology
 *   tags: [SPIN, 需求挖掘]
 *   source: 实战经验
 *   difficulty: intermediate
 *   scenarios: [初次拜访, 需求调研]
 *   ---
 *
 * 使用方式:
 *   npm run import-md
 *   # 或指定目录
 *   node scripts/import-markdown.js --dir ./my-docs --collection sales_coach_knowledge
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vectorStore from '../src/vectorstore/qdrant-client.js';
import { createEmbeddings } from '../src/llm/embeddings.js';
import { getAllAgentInfos } from '../src/agents/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MD_DIR = path.join(__dirname, '..', 'data', 'markdown');

// ---------- 命令行参数 ----------
const args = process.argv.slice(2);
const customDir = getArg('--dir') || getArg('-d');
const customCollection = getArg('--collection') || getArg('-c');
const chunkSize = parseInt(getArg('--chunk-size') || getArg('-s') || '2000', 10);
const chunkOverlap = parseInt(getArg('--overlap') || getArg('-o') || '200', 10);

function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

// ---------- Frontmatter 解析 ----------
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

        // 解析数组 [a, b, c]
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
        }
        // 解析字符串值
        else {
          value = value.replace(/^['"]|['"]$/g, '');
        }

        meta[key] = value;
      }
    }
  }

  return { metadata: meta, content: body };
}

// ---------- 文本分块 ----------
function chunkText(text, maxSize, overlap) {
  if (text.length <= maxSize) return [text];

  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);

    // 尽量在段落边界截断
    if (end < text.length) {
      const paragraphEnd = text.lastIndexOf('\n\n', end);
      if (paragraphEnd > start + maxSize * 0.5) {
        end = paragraphEnd;
      } else {
        const sentenceEnd = text.lastIndexOf('。', end);
        if (sentenceEnd > start + maxSize * 0.5) {
          end = sentenceEnd + 1;
        }
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((c) => c.length > 50); // 过滤太短的碎片
}

// ---------- 从文件名提取标题 ----------
function titleFromFilename(filename) {
  return filename
    .replace(/\.md$/i, '')
    .replace(/[/_]/g, ' ')
    .trim();
}

// ---------- 主流程 ----------
async function main() {
  console.log('========================================');
  console.log('  Markdown 文档批量导入工具');
  console.log('========================================\n');

  // 1. 初始化 Embedding
  console.log('[Init] 初始化 Embedding 模型...');
  const embeddings = createEmbeddings();
  vectorStore.setEmbeddings(embeddings);
  console.log('[Init] ✅\n');

  // 2. 确定扫描目录
  const scanDir = customDir || DEFAULT_MD_DIR;
  if (!fs.existsSync(scanDir)) {
    console.log(`[Scan] 创建目录: ${scanDir}`);
    fs.mkdirSync(scanDir, { recursive: true });
  }

  // 3. 获取所有专家信息（用于校验 collection 名称）
  const experts = getAllAgentInfos();
  const validCollections = new Set(experts.map((e) => e.collectionName));
  console.log(`[Scan] 有效知识库: ${[...validCollections].join(', ')}\n`);

  // 4. 扫描 .md 文件
  const mdFiles = [];

  if (customCollection) {
    // 指定了 collection，从该目录读取
    const dir = path.join(scanDir, customCollection);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
      files.forEach((f) => mdFiles.push({ collection: customCollection, file: path.join(dir, f), name: f }));
    }
  } else {
    // 按子目录名作为 collection 名称
    const entries = fs.readdirSync(scanDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(scanDir, entry.name);
        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md'));
        files.forEach((f) =>
          mdFiles.push({ collection: entry.name, file: path.join(dirPath, f), name: f })
        );
      }
    }
  }

  if (mdFiles.length === 0) {
    console.log('[Scan] ⚠️ 未找到 .md 文件');
    console.log(`\n📁 请将 Markdown 文件放入：`);
    console.log(`   ${scanDir}/`);
    console.log(`   按知识库名分子目录，例如：`);
    console.log(`   ${scanDir}/sales_coach_knowledge/你的文档.md`);
    console.log(`   ${scanDir}/question_design_knowledge/你的文档.md`);
    console.log(`\n或指定 collection:\n   node scripts/import-markdown.js --dir ./my-docs --collection sales_coach_knowledge\n`);
    return;
  }

  console.log(`[Scan] 找到 ${mdFiles.length} 个 .md 文件\n`);

  // 5. 分组按 collection 导入
  const grouped = {};
  for (const { collection, file, name } of mdFiles) {
    if (!grouped[collection]) grouped[collection] = [];
    grouped[collection].push({ file, name });
  }

  let totalDocs = 0;
  let totalChunks = 0;

  for (const [collection, files] of Object.entries(grouped)) {
    // 校验 collection 名称
    if (!validCollections.has(collection)) {
      console.warn(`[Warn] ⚠️ "${collection}" 不是有效的知识库名称，将创建新集合`);
      console.log(`       有效名称: ${[...validCollections].join(', ')}\n`);
    }

    console.log(`📂 ${collection} (${files.length} 个文件)`);

    const documents = [];

    for (const { file, name } of files) {
      const raw = fs.readFileSync(file, 'utf-8');
      const { metadata, content } = parseFrontmatter(raw);

      // 从文件名或 frontmatter 获取标题
      const title = metadata.title || titleFromFilename(name);

      // 分块
      const chunks = chunkText(content, chunkSize, chunkOverlap);
      console.log(`   📄 ${name} → ${chunks.length} 个片段`);

      chunks.forEach((chunk, i) => {
        documents.push({
          id: `${collection}-${name.replace(/\.md$/, '')}-${i + 1}`,
          content: chunk,
          metadata: {
            ...metadata,
            title: chunks.length > 1 ? `${title} (第 ${i + 1}/${chunks.length} 部分)` : title,
            sourceFile: name,
            chunkIndex: i,
            totalChunks: chunks.length,
            importedAt: new Date().toISOString(),
          },
        });
      });
    }

    // 导入
    if (documents.length > 0) {
      const count = await vectorStore.addDocuments(collection, documents);
      totalDocs += documents.length;
      totalChunks += count;
      console.log(`   ✅ 已导入 ${count} 条\n`);
    }
  }

  console.log(`========================================`);
  console.log(`  ✅ 导入完成`);
  console.log(`  文件数: ${mdFiles.length}`);
  console.log(`  文档片段: ${totalChunks}`);
  console.log(`  知识库: ${Object.keys(grouped).length} 个`);
  console.log(`========================================`);
}

main().catch((err) => {
  console.error('导入失败:', err);
  process.exit(1);
});
