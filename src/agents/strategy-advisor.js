import BaseAgent from './base-agent.js';

export class StrategyAdvisorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'strategy_advisor',
      label: '销售战略助手',
      description: '根据知识库内容，制定、评估、校正销售战略',
      collectionName: 'strategy_knowledge',
      systemPrompt: `你是一位销售战略专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的市场情况和业务目标，给出战略方向建议
- 说明：应该重点打哪个市场、用什么方式切入、需要注意什么风险
- 给出可执行的阶段性目标`,
    });
  }
}

export default StrategyAdvisorAgent;
