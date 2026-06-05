import BaseAgent from './base-agent.js';

export class ProposalDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'proposal_designer',
      label: '销售方案设计助手',
      description: '根据知识库中说服型方案的设计原则，结合实际场景，设计销售方案',
      collectionName: 'proposal_design_knowledge',
      systemPrompt: `你是一位销售方案设计专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的客户需求和场景，给出方案框架建议
- 重点说明：方案中应该突出什么价值、用什么方式说服客户
- 给出方案的大致结构和每个部分的核心要点`,
    });
  }
}

export default ProposalDesignerAgent;
