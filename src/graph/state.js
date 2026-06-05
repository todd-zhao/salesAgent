/**
 * ============================================
 * Graph State 定义
 * ============================================
 * LangGraph 状态图中的 State 结构与 Reducer。
 * 使用 @langchain/langgraph 的 Annotation API。
 */

import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

/**
 * Agent 输出记录
 * @typedef {Object} AgentOutput
 * @property {string} agentName
 * @property {string} label
 * @property {string} output
 * @property {Array} knowledgeRefs
 * @property {Object} metadata
 * @property {'pending'|'running'|'done'|'error'} status
 */

/**
 * 自定义 State Annotation
 * 继承 MessagesAnnotation 以支持消息历史
 */
export const SalesState = Annotation.Root({
  // 复用 LangGraph 的消息处理
  ...MessagesAnnotation.spec,

  // 会话 ID
  sessionId: Annotation({
    default: () => '',
  }),

  // 用户输入
  userInput: Annotation({
    default: () => '',
  }),

  // 用户上下文
  userContext: Annotation({
    default: () => ({
      industry: '',
      role: '',
      scenario: '',
    }),
    reducer: (a, b) => ({ ...a, ...b }),
  }),

  // 系统自动选择的专家列表（由路由节点填充）
  selectedExperts: Annotation({
    default: () => [],
    reducer: (a, b) => b, // 覆盖
  }),

  // 当前正在执行的专家
  currentExpert: Annotation({
    default: () => null,
  }),

  // 已执行的专家列表（顺序记录）
  executedExperts: Annotation({
    default: () => [],
    reducer: (a, b) => [...a, ...b],
  }),

  // 各专家的输出结果 { [agentName]: AgentOutput }
  agentOutputs: Annotation({
    default: () => ({}),
    reducer: (a, b) => ({ ...a, ...b }),
  }),

  // 当前阶段
  currentStage: Annotation({
    default: () => 'routing',
  }),

  // 汇总输出
  finalOutput: Annotation({
    default: () => '',
  }),

  // 错误信息
  error: Annotation({
    default: () => '',
  }),
});

export default SalesState;
