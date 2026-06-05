import BaseAgent from './base-agent.js';

export class OnboardingDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'onboarding_designer',
      label: '入职培训设计助手',
      description: '根据知识库内容，结合实际业务，设计新人入职培训方案',
      collectionName: 'onboarding_knowledge',
      systemPrompt: `你是一位入职培训设计专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的业务特点和新员工背景，设计分阶段的培训计划
- 每个阶段说明：学什么、怎么学、学到什么程度算合格
- 注意投入产出比，建议高性价比的培训方式`,
    });
  }
}

export default OnboardingDesignerAgent;
