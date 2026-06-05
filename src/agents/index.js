/**
 * ============================================
 * Agent 注册中心
 * ============================================
 * 管理所有 14 位销售专家 Agent 的注册、查找和实例化。
 */

import SalesCoachAgent from './sales-coach.js';
import QuestionDesignerAgent from './question-designer.js';
import StoryCreatorAgent from './story-creator.js';
import ProposalDesignerAgent from './proposal-designer.js';
import StrategyAdvisorAgent from './strategy-advisor.js';
import InsightDesignerAgent from './insight-designer.js';
import PerformanceFeedbackAgent from './performance-feedback.js';
import ProcessDesignerAgent from './process-designer.js';
import CompensationAssistantAgent from './compensation-assistant.js';
import TalentProfileBuilderAgent from './talent-profile-builder.js';
import BehavioralInterviewAgent from './behavioral-interview.js';
import AdDesignerAgent from './ad-designer.js';
import StructuredInterviewAgent from './structured-interview.js';
import OnboardingDesignerAgent from './onboarding-designer.js';

/** 所有 Agent 实例（单例 Map） */
const agentMap = new Map();

/** Agent 注册列表（保持顺序） */
const agentList = [
  new SalesCoachAgent(),
  new QuestionDesignerAgent(),
  new StoryCreatorAgent(),
  new ProposalDesignerAgent(),
  new StrategyAdvisorAgent(),
  new InsightDesignerAgent(),
  new PerformanceFeedbackAgent(),
  new ProcessDesignerAgent(),
  new CompensationAssistantAgent(),
  new TalentProfileBuilderAgent(),
  new BehavioralInterviewAgent(),
  new AdDesignerAgent(),
  new StructuredInterviewAgent(),
  new OnboardingDesignerAgent(),
];

// 注册到 Map
for (const agent of agentList) {
  agentMap.set(agent.name, agent);
}

/**
 * 根据名称获取 Agent 实例
 * @param {string} name - Agent 名称
 * @returns {BaseAgent|null}
 */
export function getAgent(name) {
  return agentMap.get(name) || null;
}

/**
 * 获取所有 Agent 信息列表
 * @returns {Array<{name: string, label: string, description: string, collectionName: string}>}
 */
export function getAllAgentInfos() {
  return agentList.map((agent) => agent.info);
}

/**
 * 根据名称获取 Agent 信息
 * @param {string} name
 * @returns {Object|null}
 */
export function getAgentInfo(name) {
  const agent = agentMap.get(name);
  return agent ? agent.info : null;
}

/**
 * Agent 名称列表
 */
export const AGENT_NAMES = agentList.map((a) => a.name);

/**
 * 格式化后的 Agent 选择提示文本（供 LLM 路由使用）
 */
export const AGENT_SELECTION_PROMPT = agentList
  .map(
    (a) =>
      `- ${a.name}: ${a.label} — ${a.description}`
  )
  .join('\n');

export default {
  getAgent,
  getAllAgentInfos,
  getAgentInfo,
  AGENT_NAMES,
  AGENT_SELECTION_PROMPT,
};
