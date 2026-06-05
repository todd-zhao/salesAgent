/**
 * ============================================
 * Agent 基类
 * ============================================
 * 所有销售专家 Agent 继承此类。
 * 每个 Agent 绑定一个知识库 Collection。
 *
 * 安全设计：
 * - 知识库内容仅供 LLM 内部参考，不向用户透露原文
 * - 回答必须用通俗语言转述，禁止引用术语或原文
 * - API 返回中不包含知识库原文内容
 */

import { createDeepSeekChat } from '../llm/deepseek.js';
import qdrantStore from '../vectorstore/qdrant-client.js';
import { app } from '../config/index.js';

/**
 * 全局安全与风格规则 — 追加到每个 Agent 的 system prompt 末尾
 */
const COMMON_RESPONSE_RULES = `
## 回答规则（必须遵守）

### 风格要求
1. **简洁**：回答控制在 3-5 句话以内，用短句，不要长篇大论
2. **通俗**：用大白话，不使用知识库中的专业术语或方法论名称
3. **直接**：直接回答用户问题，不要铺垫和总结

### 安全要求（重要）
1. **不准透露原文**：基于知识库内容作答，但禁止逐字引用知识库原文
2. **不准暴露来源**：不要告诉用户"根据XX方法论"、"知识库中提及"等
3. **不准输出元数据**：不要提及文档标题、章节名、标签等知识库元信息
4. **转述原则**：将知识库内容消化后用自己的话通俗表达
5. **违者处罚**：如果回答中包含原文片段、术语或来源信息，将受到惩罚

> 好回答示例："你可以试试先问客户目前是怎么做的，再问他们对现状哪里不满意。"
> 坏回答示例："根据SPIN方法论中的Situation Question，你应该提出情境问题..."
`;

/**
 * 销售专家 Agent 基类
 */
export default class BaseAgent {
  /**
   * @param {Object} options
   * @param {string} options.name - Agent 标识
   * @param {string} options.label - 显示名称
   * @param {string} options.description - 职责描述
   * @param {string} options.collectionName - 知识库 Collection 名
   * @param {string} options.systemPrompt - System Prompt 模板
   * @param {number} [options.topK=5] - 检索数量
   */
  constructor(options) {
    this.name = options.name;
    this.label = options.label;
    this.description = options.description;
    this.collectionName = options.collectionName;
    this.basePrompt = options.systemPrompt;
    this.topK = options.topK ?? 5;
    this.llm = createDeepSeekChat({ streaming: false });
  }

  /**
   * 获取最终的 system prompt（= Agent 自定义 prompt + 全局规则）
   */
  getSystemPrompt(userContext) {
    const base = this.basePrompt
      .replace(/\{industry\}/g, userContext?.industry || '')
      .replace(/\{role\}/g, userContext?.role || '')
      .replace(/\{scenario\}/g, userContext?.scenario || '');

    return base + COMMON_RESPONSE_RULES;
  }

  /**
   * 从知识库检索
   */
  async retrieveKnowledge(query, topK) {
    try {
      const results = await qdrantStore.search(
        this.collectionName,
        query,
        topK || this.topK
      );
      return results;
    } catch (err) {
      console.warn(
        `[${this.name}] 知识库检索失败: ${err.message}，将使用 LLM 自身知识`
      );
      return [];
    }
  }

  /**
   * 构建 Prompt
   * 知识库内容只传给 LLM 参考，不在返回中暴露
   */
  buildPrompt({ userInput, userContext, knowledgeResults }) {
    // 知识库上下文仅注入给 LLM，不在任何格式化输出中出现
    const knowledgeContext = knowledgeResults.length > 0
      ? knowledgeResults.map((doc, i) =>
          `【参考 ${i + 1}】\n${doc.content}`
        ).join('\n\n')
      : '（暂无相关知识库内容）';

    const system = this.getSystemPrompt(userContext)
      .replace(/\{knowledge_context\}/g, knowledgeContext);

    return [
      { role: 'system', content: system },
      { role: 'user', content: userInput },
    ];
  }

  /**
   * 执行 Agent
   * @param {string} userInput
   * @param {Object} context
   * @returns {Promise<{agentName, label, output, knowledgeRefs, metadata}>}
   */
  async execute(userInput, context = {}) {
    console.log(`[${this.name}] 开始执行...`);

    const knowledgeResults = await this.retrieveKnowledge(userInput, this.topK);
    console.log(`[${this.name}] 检索到 ${knowledgeResults.length} 条相关知识`);

    const prompt = this.buildPrompt({
      userInput,
      userContext: context.userContext || {},
      knowledgeResults,
    });

    const response = await this.llm.invoke(prompt);

    // 返回时剔除知识库原文内容（只保留标题和相关性分数用于调试）
    return {
      agentName: this.name,
      label: this.label,
      output: response.content,
      knowledgeRefs: knowledgeResults.map((r) => ({
        source: r.metadata?.title || '参考文档',
        score: r.score,
        // content 已移除：不向客户端暴露知识库原文
      })),
      metadata: {
        collectionName: this.collectionName,
        knowledgeCount: knowledgeResults.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Agent 简要信息
   */
  get info() {
    return {
      name: this.name,
      label: this.label,
      description: this.description,
      collectionName: this.collectionName,
    };
  }
}
