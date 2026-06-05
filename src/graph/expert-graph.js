/**
 * ============================================
 * LangGraph 专家协作图
 * ============================================
 * 定义销售专家团的状态图编排逻辑：
 *   Router → Agent Executor(s) → Aggregator → End
 *
 * 支持两种模式：
 *   单专家模式 — 直接路由到指定专家
 *   多专家协作 — 按序执行多位专家后汇总
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { createDeepSeekChat } from '../llm/deepseek.js';
import { getAgent, AGENT_SELECTION_PROMPT } from '../agents/index.js';
import SalesState from './state.js';
import { app } from '../config/index.js';

// -------------------------------------------------------
// Node: 意图路由 (Router)
// -------------------------------------------------------
// 使用 LLM 分析用户输入，决策选择哪几位专家
// -------------------------------------------------------
async function routerNode(state) {
  const { userInput, userContext, selectedExperts } = state;

  // 如果已指定专家（API 直接指定的场景），跳过路由
  if (selectedExperts && selectedExperts.length > 0) {
    return {
      ...state,
      currentStage: 'executing',
      currentExpert: selectedExperts[0],
    };
  }

  // 用 LLM 判断用户意图，选择最合适的 1-3 位专家
  const llm = createDeepSeekChat({ temperature: 0.1 });

  const routePrompt = [
    {
      role: 'system',
      content: `你是一位销售专家团的路由员。你的任务是根据用户的输入，从以下 14 位专家中选择最合适的 1-3 位来回答。

每位专家的格式：专家标识: 中文名 — 职责描述

${AGENT_SELECTION_PROMPT}

判断规则：
1. 如果问题属于单一领域，只需选 1 位专家
2. 如果问题需要多角度分析，选 2-3 位专家（按执行顺序排列）
3. 如果问题模糊无法判断，选最通用的专家

请只返回一个 JSON 数组，格式如：["expert_name"] 或 ["expert1", "expert2"]`,
    },
    {
      role: 'user',
      content: `行业: ${userContext?.industry || '未指定'}
角色: ${userContext?.role || '未指定'}
场景: ${userContext?.scenario || '未指定'}
用户问题: ${userInput}`,
    },
  ];

  try {
    const response = await llm.invoke(routePrompt);
    const content = response.content.trim();
    // 尝试解析 JSON
    const jsonMatch = content.match(/\[.*?\]/s);
    const expertNames = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // 验证专家名称有效性
    const validExperts = expertNames.filter((name) => getAgent(name));

    console.log(`[Router] 路由决策: ${validExperts.join(' → ') || '未匹配'}`);

    return {
      ...state,
      selectedExperts: validExperts.length > 0 ? validExperts : ['sales_coach'],
      currentStage: 'executing',
      currentExpert: validExperts[0] || 'sales_coach',
    };
  } catch (err) {
    console.error(`[Router] 路由失败: ${err.message}`);
    return {
      ...state,
      selectedExperts: ['sales_coach'],
      currentStage: 'executing',
      currentExpert: 'sales_coach',
    };
  }
}

// -------------------------------------------------------
// Node: 专家执行器 (Agent Executor)
// -------------------------------------------------------
// 执行当前选中的专家，更新状态，并决定下一步
// -------------------------------------------------------
async function agentExecutorNode(state) {
  const {
    currentExpert: expertName,
    userInput,
    userContext,
    agentOutputs,
    executedExperts,
    selectedExperts,
  } = state;

  if (!expertName) {
    return {
      ...state,
      currentStage: 'aggregating',
      error: '没有指定的专家',
    };
  }

  const agent = getAgent(expertName);
  if (!agent) {
    console.error(`[Agent] 未知专家: ${expertName}`);
    const newExecuted = [...executedExperts, expertName];
    const nextIndex = newExecuted.length;
    const nextExpert = selectedExperts[nextIndex] || null;

    return {
      ...state,
      executedExperts: newExecuted,
      currentExpert: nextExpert,
      currentStage: nextExpert ? 'executing' : 'aggregating',
      error: `未知专家: ${expertName}`,
    };
  }

  console.log(`[Agent] 开始执行: ${agent.label} (${agent.name})`);

  try {
    const result = await agent.execute(userInput, {
      userContext,
      chatHistory: state.messages || [],
      otherAgentOutputs: agentOutputs,
    });

    const newAgentOutputs = {
      ...agentOutputs,
      [expertName]: { ...result, status: 'done' },
    };

    const newExecuted = [...executedExperts, expertName];
    const nextIndex = newExecuted.length;
    const nextExpert = selectedExperts[nextIndex] || null;

    console.log(
      `[Agent] ${agent.label} 执行完成，下一步: ${nextExpert || '汇总'}`
    );

    return {
      ...state,
      agentOutputs: newAgentOutputs,
      executedExperts: newExecuted,
      currentExpert: nextExpert,
      currentStage: nextExpert ? 'executing' : 'aggregating',
      messages: [
        ...(state.messages || []),
        {
          role: 'assistant',
          agentName: expertName,
          agentLabel: agent.label,
          content: result.output,
          knowledgeRefs: result.knowledgeRefs,
        },
      ],
    };
  } catch (err) {
    console.error(`[Agent] ${agent.label} 执行失败: ${err.message}`);
    const newAgentOutputs = {
      ...agentOutputs,
      [expertName]: {
        agentName: expertName,
        label: agent.label,
        output: `执行失败: ${err.message}`,
        knowledgeRefs: [],
        metadata: { error: err.message, timestamp: new Date().toISOString() },
        status: 'error',
      },
    };

    const newExecuted = [...executedExperts, expertName];
    const nextIndex = newExecuted.length;
    const nextExpert = selectedExperts[nextIndex] || null;

    return {
      ...state,
      agentOutputs: newAgentOutputs,
      executedExperts: newExecuted,
      currentExpert: nextExpert,
      currentStage: nextExpert ? 'executing' : 'aggregating',
    };
  }
}

// -------------------------------------------------------
// Node: 汇总合成 (Aggregator)
// -------------------------------------------------------
// 将多位专家的输出合成一份完整的答案
// -------------------------------------------------------
async function aggregatorNode(state) {
  const { agentOutputs, executedExperts, userInput } = state;

  // 如果只有一位专家，直接输出
  if (executedExperts.length === 1) {
    const singleOutput = agentOutputs[executedExperts[0]];
    return {
      ...state,
      finalOutput: singleOutput.output,
      currentStage: 'done',
    };
  }

  // 多位专家，用 LLM 合成汇总
  const llm = createDeepSeekChat({ temperature: 0.3 });

  const expertsText = executedExperts
    .map((name) => {
      const output = agentOutputs[name];
      return `## ${output.label} (${output.agentName}) 的分析\n\n${output.output}`;
    })
    .join('\n\n---\n\n');

  const aggregatePrompt = [
    {
      role: 'system',
      content: `你是一位销售专家团的报告汇总专家。请将多位专家对同一问题的分析整合为一份结构清晰、无重复的综合报告。

要求：
1. 保留每位专家的核心观点，避免遗漏
2. 合并重复内容，去除冗余
3. 按逻辑重新组织（而非简单拼接）
4. 如有分歧，标注不同观点
5. 最后给出综合建议`,
    },
    {
      role: 'user',
      content: `原始问题: ${userInput}\n\n以下各专家分析：\n\n${expertsText}`,
    },
  ];

  try {
    const response = await llm.invoke(aggregatePrompt);
    return {
      ...state,
      finalOutput: response.content,
      currentStage: 'done',
    };
  } catch (err) {
    // 汇总失败时降级为拼接输出
    const fallback = executedExperts
      .map((name) => {
        const o = agentOutputs[name];
        return `【${o.label}】\n${o.output}`;
      })
      .join('\n\n---\n\n');
    return {
      ...state,
      finalOutput: fallback,
      currentStage: 'done',
    };
  }
}

// -------------------------------------------------------
// 条件边：判断是否继续执行专家或进入汇总
// -------------------------------------------------------
function shouldContinue(state) {
  if (state.currentStage === 'aggregating') {
    return 'aggregator';
  }
  if (state.currentStage === 'executing' && state.currentExpert) {
    return 'agent_executor';
  }
  return 'aggregator';
}

// -------------------------------------------------------
// 构建并编译图
// -------------------------------------------------------
function buildSalesGraph() {
  const workflow = new StateGraph(SalesState)
    .addNode('router', routerNode)
    .addNode('agent_executor', agentExecutorNode)
    .addNode('aggregator', aggregatorNode)
    .addEdge(START, 'router')
    .addConditionalEdges('router', shouldContinue, {
      agent_executor: 'agent_executor',
      aggregator: 'aggregator',
    })
    .addConditionalEdges('agent_executor', shouldContinue, {
      agent_executor: 'agent_executor',
      aggregator: 'aggregator',
    })
    .addEdge('aggregator', END);

  return workflow.compile();
}

// 导出编译好的图（单例）
let compiledGraph = null;

export function getGraph() {
  if (!compiledGraph) {
    compiledGraph = buildSalesGraph();
  }
  return compiledGraph;
}

export default { getGraph };
