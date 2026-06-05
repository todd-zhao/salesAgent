/**
 * ============================================
 * Agent 基类
 * ============================================
 * 所有销售专家 Agent 继承此类。
 * 每个 Agent 绑定一个 Qdrant Collection 作为知识库。
 */

import { createDeepSeekChat } from '../llm/deepseek.js';
import qdrantStore from '../vectorstore/qdrant-client.js';
import { app } from '../config/index.js';

/**
 * @typedef {Object} AgentContext
 * @property {string} sessionId - 会话 ID
 * @property {Object} userContext - 用户上下文（行业、角色、场景等）
 * @property {Array} chatHistory - 对话历史
 * @property {Object} [otherAgentOutputs] - 其他 Agent 的输出
 */

/**
 * @typedef {Object} AgentResult
 * @property {string} agentName - Agent 标识
 * @property {string} output - 文本输出
 * @property {Array} knowledgeRefs - 知识引用 [{source, score, content}]
 * @property {Object} metadata - 附加元数据
 */

/**
 * 销售专家 Agent 基类
 */
export default class BaseAgent {
  /**
   * @param {Object} options
   * @param {string} options.name - Agent 标识（英文，如 'sales_coach'）
   * @param {string} options.label - Agent 显示名称（中文，如 '销售教练'）
   * @param {string} options.description - Agent 职责描述
   * @param {string} options.collectionName - 对应的 Qdrant Collection 名称
   * @param {string} options.systemPrompt - System Prompt 模板
   * @param {number} [options.topK=5] - 知识库检索数量
   */
  constructor(options) {
    this.name = options.name;
    this.label = options.label;
    this.description = options.description;
    this.collectionName = options.collectionName;
    this.systemPrompt = options.systemPrompt;
    this.topK = options.topK ?? 5;
    this.llm = createDeepSeekChat({ streaming: false });
  }

  /**
   * 从知识库检索相关内容（由 Agent 子类执行时调用）
   * @param {string} query - 检索查询
   * @param {number} [topK] - 覆盖默认数量
   * @returns {Promise<Array>} 检索结果
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
   * 格式化知识库上下文供 LLM 使用
   * @param {Array} knowledgeResults
   * @returns {string} 格式化后的知识文本
   */
  formatKnowledgeContext(knowledgeResults) {
    if (!knowledgeResults || knowledgeResults.length === 0) {
      return '（暂无相关知识库内容）';
    }

    return knowledgeResults
      .map(
        (doc, i) =>
          `【参考 ${i + 1}】(相关性: ${(doc.score * 100).toFixed(1)}%)\n${doc.content}`
      )
      .join('\n\n');
  }

  /**
   * 构建完整的 Prompt（System + 知识 + 用户输入）
   * @param {Object} params
   * @param {string} params.userInput - 用户输入
   * @param {Object} params.userContext - 用户上下文
   * @param {Array} params.knowledgeResults - 检索到的知识
   * @returns {Array} LangChain 消息数组
   */
  buildPrompt({ userInput, userContext, knowledgeResults }) {
    const knowledgeContext = this.formatKnowledgeContext(knowledgeResults);

    const system = this.systemPrompt
      .replace(/\{knowledge_context\}/g, knowledgeContext)
      .replace(/\{industry\}/g, userContext?.industry || '未指定')
      .replace(/\{role\}/g, userContext?.role || '未指定')
      .replace(/\{scenario\}/g, userContext?.scenario || '未指定');

    return [
      { role: 'system', content: system },
      { role: 'user', content: userInput },
    ];
  }

  /**
   * 执行 Agent 的核心逻辑
   * @param {string} userInput - 用户输入
   * @param {AgentContext} context - 执行上下文
   * @returns {Promise<AgentResult>}
   */
  async execute(userInput, context = {}) {
    console.log(`[${this.name}] 开始执行...`);

    // 1. 从知识库检索
    const knowledgeResults = await this.retrieveKnowledge(
      userInput,
      this.topK
    );
    console.log(
      `[${this.name}] 检索到 ${knowledgeResults.length} 条相关知识`
    );

    // 2. 构建 Prompt 并调用 LLM
    const prompt = this.buildPrompt({
      userInput,
      userContext: context.userContext || {},
      knowledgeResults,
    });

    const response = await this.llm.invoke(prompt);

    // 3. 返回结果
    return {
      agentName: this.name,
      label: this.label,
      output: response.content,
      knowledgeRefs: knowledgeResults.map((r) => ({
        source: r.metadata?.title || '未知来源',
        score: r.score,
        content: r.content,
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
