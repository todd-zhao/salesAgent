/**
 * ============================================
 * API 路由
 * ============================================
 * POST /api/chat          — 自动路由到最合适的专家
 * POST /api/chat/:expert  — 指定专家对话
 * GET  /api/experts       — 获取所有专家列表
 * GET  /api/sessions/:id  — 获取会话历史（预留）
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getGraph } from '../graph/expert-graph.js';
import { getAllAgentInfos, getAgent, AGENT_NAMES } from '../agents/index.js';
import { createDeepSeekChat } from '../llm/deepseek.js';

const router = Router();

// -------------------------------------------------------
// GET /api/experts — 获取所有专家信息
// -------------------------------------------------------
router.get('/experts', (req, res) => {
  const experts = getAllAgentInfos();
  res.json({
    total: experts.length,
    experts,
  });
});

// -------------------------------------------------------
// POST /api/chat — 自动路由聊天
// -------------------------------------------------------
router.post('/chat', async (req, res) => {
  const { message, context = {}, stream = false } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message 字段为必填' });
  }

  const sessionId = req.body.sessionId || uuidv4();

  try {
    // 构建初始状态
    const initialState = {
      messages: [{ role: 'user', content: message }],
      sessionId,
      userInput: message,
      userContext: {
        industry: context.industry || '',
        role: context.role || '',
        scenario: context.scenario || '',
      },
      selectedExperts: [],
      currentExpert: null,
      executedExperts: [],
      agentOutputs: {},
      currentStage: 'routing',
      finalOutput: '',
      error: '',
    };

    // 执行 LangGraph
    const graph = getGraph();
    const finalState = await graph.invoke(initialState, {
      recursionLimit: 20,
    });

    res.json({
      sessionId,
      expert: finalState.executedExperts?.[0] || 'unknown',
      experts: finalState.executedExperts || [],
      output: finalState.finalOutput || '暂无输出',
      agentOutputs: finalState.agentOutputs || {},
      error: finalState.error || null,
    });
  } catch (err) {
    console.error('[Chat] 执行失败:', err);
    res.status(500).json({
      error: `执行失败: ${err.message}`,
      sessionId,
    });
  }
});

// -------------------------------------------------------
// POST /api/chat/:expertName — 指定专家聊天
// -------------------------------------------------------
router.post('/chat/:expertName', async (req, res) => {
  const { expertName } = req.params;
  const { message, context = {} } = req.body;

  if (!AGENT_NAMES.includes(expertName)) {
    const agent = getAgent(expertName);
    if (!agent) {
      return res.status(400).json({
        error: `未知专家: ${expertName}`,
        availableExperts: AGENT_NAMES,
      });
    }
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message 字段为必填' });
  }

  const sessionId = req.body.sessionId || uuidv4();

  try {
    // 直接指定专家，跳过路由
    const initialState = {
      messages: [{ role: 'user', content: message }],
      sessionId,
      userInput: message,
      userContext: {
        industry: context.industry || '',
        role: context.role || '',
        scenario: context.scenario || '',
      },
      selectedExperts: [expertName],
      currentExpert: expertName,
      executedExperts: [],
      agentOutputs: {},
      currentStage: 'executing',
      finalOutput: '',
      error: '',
    };

    const graph = getGraph();
    const finalState = await graph.invoke(initialState, {
      recursionLimit: 20,
    });

    res.json({
      sessionId,
      expert: expertName,
      experts: [expertName],
      output: finalState.finalOutput || '暂无输出',
      agentOutputs: finalState.agentOutputs || {},
      error: finalState.error || null,
    });
  } catch (err) {
    console.error('[Chat] 执行失败:', err);
    res.status(500).json({
      error: `执行失败: ${err.message}`,
      sessionId,
    });
  }
});

// -------------------------------------------------------
// GET /api/sessions/:id — 获取会话（预留）
// -------------------------------------------------------
router.get('/sessions/:id', (req, res) => {
  // 预留：从持久化存储读取会话
  res.json({
    sessionId: req.params.id,
    message: '会话持久化功能即将上线',
  });
});

export default router;
