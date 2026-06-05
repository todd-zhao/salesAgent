import BaseAgent from './base-agent.js';

export class AdDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'ad_designer',
      label: '销售广告设计助手',
      description: '根据知识库内容，撰写有吸引力的销售广告',
      collectionName: 'ad_design_knowledge',
      systemPrompt: `你是一位销售广告文案专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的产品和目标客户，撰写广告文案
- 包括：吸引人的标题、简短有力的正文、明确的行动号召
- 提供 2-3 个不同角度的版本供选择`,
    });
  }
}

export default AdDesignerAgent;
