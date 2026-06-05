/**
 * ============================================
 * 销售专家团 — 统一配置模块
 * ============================================
 * 从环境变量读取所有配置，提供默认值。
 * 所有模块通过此文件获取配置，不直接访问 process.env。
 */

import dotenv from 'dotenv';
dotenv.config();

/** 是否开发环境 */
export const isDev = process.env.NODE_ENV !== 'production';

/** 服务器配置 */
export const server = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
};

/** DeepSeek LLM 配置 */
export const deepseek = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
};

/** Embedding 模型配置（默认复用 DeepSeek 配置） */
export const embedding = {
  apiKey: process.env.EMBEDDING_API_KEY || deepseek.apiKey,
  baseUrl: process.env.EMBEDDING_BASE_URL || deepseek.baseUrl,
  model: process.env.EMBEDDING_MODEL || 'deepseek-embedding-v2',
  dimension: parseInt(process.env.EMBEDDING_DIMENSION || '1024', 10),
};

/** 本地向量存储配置（内置，无需外部服务） */
export const vectorStore = {
  type: 'local',            // 固定为 local（内置）
  dataDir: 'data/vectorstore', // 数据持久化目录
};

/** 应用全局配置 */
export const app = {
  maxSteps: 20,           // LangGraph 最大执行步数
  maxTokens: 4096,        // LLM 最大输出 Token
  temperature: 0.7,       // LLM 温度参数
};

export default { isDev, server, deepseek, embedding, vectorStore, app };
