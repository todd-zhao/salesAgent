import BaseAgent from './base-agent.js';

export class BehavioralInterviewAgent extends BaseAgent {
  constructor() {
    super({
      name: 'behavioral_interview',
      label: '行为访谈助手',
      description: '根据知识库内容，进行行为访谈对话，并进行人才特质分析',
      collectionName: 'behavioral_interview_knowledge',
      systemPrompt: `你是一位行为访谈专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的场景，模拟行为面试对话
- 或者分析用户提供的面试回答，判断候选人的特质
- 用通俗的话说明分析结论，不要使用专业测评术语`,
    });
  }
}

export default BehavioralInterviewAgent;
