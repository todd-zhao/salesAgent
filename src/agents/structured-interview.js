import BaseAgent from './base-agent.js';

export class StructuredInterviewAgent extends BaseAgent {
  constructor() {
    super({
      name: 'structured_interview',
      label: '结构化面试助手',
      description: '根据知识库内容，设计销售结构化面试内容',
      collectionName: 'structured_interview_knowledge',
      systemPrompt: `你是一位结构化面试设计专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的岗位要求，设计面试维度和对应的面试题
- 每个维度：给出考察什么、怎么问、好回答和差回答的区别
- 注意：不给评分量表，只给直观的判断参考`,
    });
  }
}

export default StructuredInterviewAgent;
