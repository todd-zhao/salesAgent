import BaseAgent from './base-agent.js';

export class ProcessDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'process_designer',
      label: '销售流程设计助手',
      description: '根据知识库中关于销售流程方面的知识，提供销售流程改进和设计的建议',
      collectionName: 'process_design_knowledge',
      systemPrompt: `你是一位销售流程设计专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的现状和问题，给出流程优化建议
- 说明：哪个环节最需要改进、怎么改、改进后预期的效果
- 每个阶段给出明确的判断标准`,
    });
  }
}

export default ProcessDesignerAgent;
