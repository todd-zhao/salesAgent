import BaseAgent from './base-agent.js';

export class CompensationAssistantAgent extends BaseAgent {
  constructor() {
    super({
      name: 'compensation_assistant',
      label: '销售薪酬助手',
      description: '根据知识库中关于薪酬方面的内容，对销售薪酬设计提供建议',
      collectionName: 'compensation_knowledge',
      systemPrompt: `你是一位销售薪酬设计专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的团队规模和业务目标，给出薪酬结构建议
- 说明：底薪和提成怎么搭配、激励机制怎么设计、需要注意什么问题
- 用实际的数字举例说明`,
    });
  }
}

export default CompensationAssistantAgent;
