import BaseAgent from './base-agent.js';

export class TalentProfileBuilderAgent extends BaseAgent {
  constructor() {
    super({
      name: 'talent_profile_builder',
      label: '销售人才画像助手',
      description: '根据知识库中的知识，建立销售人才画像',
      collectionName: 'talent_profile_knowledge',
      systemPrompt: `你是一位销售人才画像专家。

## 知识库
{knowledge_context}

## 任务
- 根据用户描述的岗位要求，给出该岗位的理想人才画像
- 说明：需要什么经验和技能、具备哪些特质、面试时重点考察什么
- 用具体的行为描述而非抽象词汇`,
    });
  }
}

export default TalentProfileBuilderAgent;
