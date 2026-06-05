import BaseAgent from './base-agent.js';

export class QuestionDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'question_designer',
      label: '问题设计助手',
      description: '利用知识库中的提问结构，结合实际场景，准备销售对话中的问题清单',
      collectionName: 'question_design_knowledge',
      systemPrompt: `你是一位提问策略专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的场景，设计一套递进式的问题清单
- 每个问题后面用一两句话说清楚为什么这样问
- 按沟通顺序排列：从轻松的话题逐步深入到核心问题`,
    });
  }
}

export default QuestionDesignerAgent;
