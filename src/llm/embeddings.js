/**
 * ============================================
 * Embedding 模型封装
 * ============================================
 * 将文本向量化，用于 Qdrant 知识库检索。
 * 使用与 LLM 相同或独立的 Embedding API。
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { embedding as config } from '../config/index.js';

/**
 * 创建 Embedding 模型实例
 * @returns {OpenAIEmbeddings} LangChain Embeddings 实例
 */
export function createEmbeddings() {
  if (!config.apiKey) {
    throw new Error(
      'Embedding API Key 未配置。请在 .env 中设置 EMBEDDING_API_KEY 或 DEEPSEEK_API_KEY。'
    );
  }

  return new OpenAIEmbeddings({
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseUrl,
    },
    modelName: config.model,
    dimensions: config.dimension,
  });
}

export default { createEmbeddings };
