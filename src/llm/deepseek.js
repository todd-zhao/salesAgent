/**
 * ============================================
 * DeepSeek LLM 封装
 * ============================================
 * 通过 OpenAI 兼容 API 调用 DeepSeek-V4-Flash。
 * 使用 LangChain 的 ChatOpenAI 作为统一接口。
 */

import { ChatOpenAI } from '@langchain/openai';
import { deepseek as config, app } from '../config/index.js';

/**
 * 创建 DeepSeek Chat 模型实例
 * @param {Object} overrides - 覆盖默认配置
 * @param {number} overrides.temperature - 温度 (0-2)
 * @param {number} overrides.maxTokens - 最大输出 token
 * @returns {ChatOpenAI} LangChain ChatModel 实例
 */
export function createDeepSeekChat(overrides = {}) {
  if (!config.apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY 未配置。请在 .env 文件中设置 DEEPSEEK_API_KEY。'
    );
  }

  return new ChatOpenAI({
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseUrl,
    },
    model: config.model,
    temperature: overrides.temperature ?? app.temperature,
    maxTokens: overrides.maxTokens ?? app.maxTokens,
    streaming: overrides.streaming ?? false,
  });
}

export default { createDeepSeekChat };
