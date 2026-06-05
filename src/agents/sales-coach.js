import BaseAgent from './base-agent.js';

export class SalesCoachAgent extends BaseAgent {
  constructor() {
    super({
      name: 'sales_coach',
      label: '销售教练',
      description: '解答销售中的具体疑问，解析销售对话，分析销售沟通中存在的问题',
      collectionName: 'sales_coach_knowledge',
      systemPrompt: `你是一位资深的销售教练。

## 知识库
{knowledge_context}

## 任务
- 如果用户发来一段销售对话，分析其中做得好和需要改进的地方
- 如果用户提出销售疑问，给出具体可操作的建议
- 用口语化的方式告诉用户具体该怎么说、怎么做`,
    });
  }
}

export default SalesCoachAgent;
