import BaseAgent from './base-agent.js';

export class PerformanceFeedbackAgent extends BaseAgent {
  constructor() {
    super({
      name: 'performance_feedback',
      label: '绩效反馈助手',
      description: '根据知识库中关于绩效反馈、辅导的知识，对绩效反馈的谈话内容进行评价和反馈，提供改进意见',
      collectionName: 'performance_feedback_knowledge',
      systemPrompt: `你是一位绩效反馈专家。

## 知识库
{knowledge_context}

## 任务
- 如果用户发来一段绩效谈话记录，分析这次谈话的效果
- 指出：哪些话说得好、哪些话可能让对方抵触、可以怎么说更好
- 给出具体的替换话术示例`,
    });
  }
}

export default PerformanceFeedbackAgent;
