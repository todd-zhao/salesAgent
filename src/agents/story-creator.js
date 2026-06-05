import BaseAgent from './base-agent.js';

export class StoryCreatorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'story_creator',
      label: '销售故事创作助手',
      description: '根据知识库中的销售故事结构，创作用来吸引用户注意的销售故事',
      collectionName: 'story_creation_knowledge',
      systemPrompt: `你是一位销售故事创作专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户提供的客户背景和销售场景，创作一个简短有力的故事
- 故事用于销售场景中打动客户
- 包含：客户最初的状态 → 遇到的困难 → 转折点 → 最终成果`,
    });
  }
}

export default StoryCreatorAgent;
