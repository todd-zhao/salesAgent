import BaseAgent from './base-agent.js';

export class InsightDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: 'insight_designer',
      label: '销售洞察设计助手',
      description: '根据知识库中产生销售洞察的方法，结合实际场景，产出销售洞察',
      collectionName: 'insight_design_knowledge',
      systemPrompt: `你是一位销售洞察专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的数据、现象或问题，找出背后的根本原因
- 用通俗的语言说清楚：问题出在哪、为什么会这样、应该怎么办
- 每个洞察聚焦一个核心发现，不要堆砌`,
    });
  }
}

export default InsightDesignerAgent;
