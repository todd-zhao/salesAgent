/**
 * ============================================
 * 向量数据库客户端（本地内置版）
 * ============================================
 * 纯 Node.js 本地向量存储，无需外部 Qdrant 服务。
 * - 内存索引 + JSON 文件持久化（存活数据）
 * - Cosine 余弦相似度检索
 * - 支持多 Collection（每个专家一个知识库）
 * - 数据存储在 data/vectorstore/ 目录
 *
 * 接口与旧版 Qdrant 客户端兼容，便于无缝切换。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'vectorstore');

/**
 * 余弦相似度
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * 本地向量存储管理器
 * 完全替代 Qdrant，接口兼容
 */
class VectorStore {
  constructor() {
    this.embeddings = null;
    this._cache = {}; // { collectionName: { docs: [], vectors: [] } }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * 注入 Embedding 模型实例
   */
  setEmbeddings(embeddings) {
    this.embeddings = embeddings;
  }

  /** Collection 持久化文件路径 */
  _filePath(name) {
    return path.join(DATA_DIR, `${name.replace(/[^a-z0-9_-]/gi, '_')}.json`);
  }

  /** 从磁盘加载 */
  _load(name) {
    if (this._cache[name]) return;
    const fp = this._filePath(name);
    if (fs.existsSync(fp)) {
      try {
        const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        this._cache[name] = {
          docs: data.docs || [],
          vectors: data.vectors || [],
        };
      } catch {
        this._cache[name] = { docs: [], vectors: [] };
      }
    } else {
      this._cache[name] = { docs: [], vectors: [] };
    }
  }

  /** 保存到磁盘 */
  _save(name) {
    const c = this._cache[name];
    if (!c) return;
    try {
      fs.writeFileSync(this._filePath(name), JSON.stringify({
        docs: c.docs,
        vectors: c.vectors,
      }));
    } catch (err) {
      console.error(`[VectorStore] 保存 ${name} 失败:`, err.message);
    }
  }

  // ======================== 公开 API ========================

  /**
   * 确保 Collection 存在（不存在则创建）
   */
  async ensureCollection(name) {
    this._load(name);
    return name;
  }

  /**
   * 批量写入文档（自动向量化）
   * @param {string} collectionName
   * @param {Array<{id?:string, content:string, metadata?:Object}>} docs
   */
  async addDocuments(collectionName, docs) {
    if (!this.embeddings) throw new Error('请先调用 setEmbeddings()');
    this._load(collectionName);
    const c = this._cache[collectionName];

    let count = 0;
    for (const doc of docs) {
      try {
        const vector = await this.embeddings.embedQuery(doc.content);
        c.docs.push({
          id: doc.id || 'd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          content: doc.content,
          metadata: doc.metadata || {},
        });
        c.vectors.push(vector);
        count++;
      } catch (err) {
        console.warn(`[VectorStore] 向量化失败:`, err.message);
      }
    }
    this._save(collectionName);
    console.log(`[VectorStore] 已写入 ${count} 条 → ${collectionName}`);
    return count;
  }

  /**
   * 语义检索
   * @param {string} collectionName
   * @param {string} query
   * @param {number} [topK=5]
   * @param {Object} [filter] 可选过滤 { category: 'x', tags: { $contains: 'y' } }
   */
  async search(collectionName, query, topK = 5, filter) {
    if (!this.embeddings) throw new Error('请先调用 setEmbeddings()');
    this._load(collectionName);
    const c = this._cache[collectionName];
    if (!c.docs.length) return [];

    const qVec = await this.embeddings.embedQuery(query);

    // 算分
    const scored = c.vectors.map((v, i) => ({
      i,
      score: cosineSimilarity(qVec, v),
    }));
    scored.sort((a, b) => b.score - a.score);

    let results = scored.slice(0, topK).map(({ i, score }) => ({
      id: c.docs[i].id,
      content: c.docs[i].content,
      metadata: { ...c.docs[i].metadata },
      score,
    }));

    // 应用过滤
    if (filter) {
      results = results.filter((r) => {
        for (const [k, v] of Object.entries(filter)) {
          const val = r.metadata[k];
          if (v && typeof v === 'object' && '$contains' in v) {
            if (!Array.isArray(val) || !val.includes(v.$contains)) return false;
          } else if (val !== v) {
            return false;
          }
        }
        return true;
      });
    }

    return results;
  }

  /** 清空集合 */
  async clearCollection(name) {
    delete this._cache[name];
    const fp = this._filePath(name);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  /** 所有集合 */
  async listCollections() {
    if (!fs.existsSync(DATA_DIR)) return [];
    return fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  /** 文档数量 */
  async countDocuments(name) {
    this._load(name);
    return this._cache[name]?.docs.length || 0;
  }

  /** 健康检查 */
  async healthCheck() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      return true;
    } catch { return false; }
  }

  /** 统计信息 */
  async stats() {
    const names = await this.listCollections();
    const details = {};
    for (const n of names) {
      this._load(n);
      details[n] = this._cache[n].docs.length;
    }
    return {
      totalCollections: names.length,
      totalDocuments: Object.values(details).reduce((a, b) => a + b, 0),
      dataDir: DATA_DIR,
      collections: details,
    };
  }
}

// 单例
const vectorStore = new VectorStore();
export default vectorStore;
