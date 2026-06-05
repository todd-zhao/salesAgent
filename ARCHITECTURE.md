# 销售专家团 (Sales Expert Group) — 架构设计方案

> 版本: v2.1  
> 日期: 2026-06-05  
> 技术栈: Node.js + LangChain.js + LangGraph.js + 内置向量数据库 + DeepSeek-V4-Flash

---

## 1. 系统概述

### 1.1 业务目标

构建一个**销售赋能多智能体系统**，由 14 个专业化销售专家 Agent 组成，覆盖销售能力提升的全链路 — 从销售技能训练、策略制定、话术设计、方案撰写、人才评估到流程优化。每个 Agent 拥有专属知识库，通过 LangGraph 编排协作，为销售团队提供一站式智能支持。

### 1.2 核心价值

| 能力 | 说明 |
|------|------|
| **14 位专家即时可用** | 覆盖销售全领域，无需逐一培养 |
| **知识驱动** | 每个 Agent 绑定对应知识库（向量检索），回答有据可依 |
| **可编排协作** | LangGraph 支持多 Agent 串联/并联完成复杂任务 |
| **可追溯** | 完整记录每条建议的推理过程与知识来源 |
| **灵活扩展** | 可随时新增角色或替换 LLM |

---

## 2. 架构总览

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend                            │
│            Chat UI (HTML + JS + CSS)                     │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼───────────────────────────────────┐
│                    API Gateway                            │
│                Express.js (REST + SSE)                   │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│              Orchestration Layer                          │
│         LangGraph State Graph (ExpertGraph)              │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Sales   │ │ Question │ │  Story   │ │ Proposal │   │
│  │  Coach   │ │ Designer │ │  Creator │ │ Designer │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Strategy │ │ Insight  │ │Perf. Feed│ │ Process  │   │
│  │ Advisor  │ │ Designer │ │back Agent│ │ Designer │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Compensa-│ │Talent Prof│ │Behavioral│ │   Ad     │   │
│  │ tion     │ │ile Builder│ │Interview │ │ Designer │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐                               │
│  │Structured│ │Onboarding│                               │
│  │Interview │ │Designer  │                               │
│  └──────────┘ └──────────┘                               │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│              内置向量数据库（本地持久化）                  │
│  ┌───────────────────────────────────────────────────┐   │
│  │  • 纯 Node.js 实现，无需外部服务                    │   │
│  │  • Cosine 余弦相似度检索                           │   │
│  │  • JSON 文件持久化 (data/vectorstore/)             │   │
│  │  • 14 个 Expert Collections（每角色一个知识库）     │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│              LLM Layer                                    │
│         DeepSeek-V4-Flash (OpenAI-compatible API)         │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 14 位专家角色设计

### 3.1 🎯 销售教练 (Sales Coach)

| 属性 | 描述 |
|------|------|
| **角色定位** | 销售导师，诊断销售对话中的问题并提供改进方案 |
| **知识库** | 经典销售方法论（SPIN、Challenger、Solution Selling 等）、沟通模型、常见错误案例库 |
| **能力** | 解析销售对话 → 识别沟通问题 → 生成改进口语/话术 → 角色扮演反馈 |
| **典型输入** | "请分析这段销售对话，指出问题并给出改进建议：..." |
| **典型输出** | 问题诊断 + 具体改进建议 + 参考话术 + 练习计划 |
| **Collection** | `sales_coach_knowledge` |

### 3.2 ❓ 问题设计助手 (Question Design Assistant)

| 属性 | 描述 |
|------|------|
| **角色定位** | 提问策略专家，为不同销售场景设计问题清单 |
| **知识库** | 提问框架库（SPIN 四类问题、开放式/封闭式、漏斗式提问等）、场景-问题映射 |
| **能力** | 理解销售场景 → 匹配提问框架 → 生成递进式问题清单 |
| **典型输入** | "我需要向一位 SaaS 公司的 CTO 了解他们的技术选型痛点，请设计一套调研问题" |
| **典型输出** | 按阶段/维度组织的问题清单 + 提问时机 + 追问建议 |
| **Collection** | `question_design_knowledge` |

### 3.3 📖 销售故事创作助手 (Sales Story Creator)

| 属性 | 描述 |
|------|------|
| **角色定位** | 叙事专家，用故事打动客户 |
| **知识库** | 故事结构库（英雄之旅、STAR、三幕式等）、成功案例库、开场白/收尾模板 |
| **能力** | 分析客户情景 → 匹配故事模板 → 定制化故事创作 |
| **典型输入** | "请帮我创作一个关于提高销售效率的成功案例故事，面向制造业客户" |
| **典型输出** | 完整销售故事（背景-冲突-解决方案-成果）+ 讲述要点 + 适配场景 |
| **Collection** | `story_creation_knowledge` |

### 3.4 📄 销售方案设计助手 (Sales Proposal Designer)

| 属性 | 描述 |
|------|------|
| **角色定位** | 方案架构师，设计有说服力的销售方案 |
| **知识库** | 说服型方案结构库（价值主张框架、ROI 计算模板、竞品对比矩阵等） |
| **能力** | 理解客户需求 → 匹配方案模板 → 生成定制化方案框架 |
| **典型输入** | "我们想为一家零售连锁企业设计数字化转型方案，预算 50-80 万" |
| **典型输出** | 方案大纲 + 价值主张 + ROI 测算框架 + 关键说服点 |
| **Collection** | `proposal_design_knowledge` |

### 3.5 🧭 销售战略助手 (Sales Strategy Advisor)

| 属性 | 描述 |
|------|------|
| **角色定位** | 军师，制定和评估销售战略 |
| **知识库** | 战略框架（Ansoff 矩阵、波特五力、蓝海战略等）、行业对标、战略评估模型 |
| **能力** | 分析市场/竞争/内部能力 → 制定/评估/校正销售战略 |
| **典型输入** | "我们是一家初创 AI 公司，如何在竞争激烈的企业服务市场中制定差异化销售战略？" |
| **典型输出** | 战略方案 + 实施路径 + 风险评估 + KPIs |
| **Collection** | `strategy_knowledge` |

### 3.6 💡 销售洞察设计助手 (Sales Insight Designer)

| 属性 | 描述 |
|------|------|
| **角色定位** | 洞察引擎，从数据中发现销售洞察 |
| **知识库** | 洞察方法论（MECE 分解、第一性原理、模式识别等）、行业洞察案例库 |
| **能力** | 输入数据/现象 → 应用洞察方法 → 产出结构化洞察 |
| **典型输入** | "我们最近三个月的成交率下降了 15%，但找不到原因，请帮我分析" |
| **典型输出** | 洞察陈述 + 数据支撑 + 根因分析 + 行动建议 |
| **Collection** | `insight_design_knowledge` |

### 3.7 📊 绩效反馈助手 (Performance Feedback Assistant)

| 属性 | 描述 |
|------|------|
| **角色定位** | 绩效教练，优化绩效反馈谈话质量 |
| **知识库** | 反馈模型（SBI、COIN、GROW 等）、辅导框架、绩效谈话案例库 |
| **能力** | 分析绩效谈话记录 → 评估反馈质量 → 优化建议 |
| **典型输入** | "这是我和一位业绩不达标的销售的一次谈话记录，请评价我的反馈方式..." |
| **典型输出** | 反馈质量评分 + 优劣势分析 + 改进话术 + 后续跟进建议 |
| **Collection** | `performance_feedback_knowledge` |

### 3.8 🔄 销售流程设计助手 (Sales Process Designer)

| 属性 | 描述 |
|------|------|
| **角色定位** | 流程优化师，设计和改进销售流程 |
| **知识库** | 流程模型（MEDDIC、BANT、CHAMP、GPCT 等）、流程评估框架、最佳实践 |
| **能力** | 分析现有流程 → 识别瓶颈 → 提出改进方案 |
| **典型输入** | "我们目前的销售流程从线索到成交平均需要 90 天，如何缩短？" |
| **典型输出** | 流程诊断 + 优化方案 + 阶段定义 + 关键指标 |
| **Collection** | `process_design_knowledge` |

### 3.9 💰 销售薪酬助手 (Sales Compensation Assistant)

| 属性 | 描述 |
|------|------|
| **角色定位** | 薪酬设计专家，设计激励性的薪酬方案 |
| **知识库** | 薪酬模型（底薪+提成、阶梯佣金、团队奖金等）、行业薪酬基准、激励理论 |
| **能力** | 理解业务目标 → 设计薪酬结构 → 模拟激励效果 |
| **典型输入** | "我们想设计一套能激励销售团队拓展新客户的薪酬方案" |
| **典型输出** | 薪酬方案设计 + 成本测算 + 激励机制说明 + 风险提示 |
| **Collection** | `compensation_knowledge` |

### 3.10 👤 销售人才画像助手 (Sales Talent Profile Builder)

| 属性 | 描述 |
|------|------|
| **角色定位** | 人才专家，构建精准的销售人才画像 |
| **知识库** | 胜任力模型库、销售性格测试框架（DISC、HBDI 等）、岗位-特质映射 |
| **能力** | 分析岗位要求 → 定义关键胜任力 → 构建完整人才画像 |
| **典型输入** | "请为我们的大客户销售岗位构建一份人才画像" |
| **典型输出** | 人才画像（知识/技能/特质/经验）+ 评估维度 + 面试要点 |
| **Collection** | `talent_profile_knowledge` |

### 3.11 🗣️ 行为访谈助手 (Behavioral Interview Assistant)

| 属性 | 描述 |
|------|------|
| **角色定位** | 面试专家，进行深度行为访谈与特质分析 |
| **知识库** | STAR 面试法、行为锚定、特质评估框架、追问技巧库 |
| **能力** | 模拟访谈对话 → 分析回答质量 → 推断人才特质 |
| **典型输入** | "请对我进行一段行为访谈，评估潜在候选人的销售能力" |
| **典型输出** | 访谈记录 + 回答分析 + 特质评估报告 + 建议 |
| **Collection** | `behavioral_interview_knowledge` |

### 3.12 📢 销售广告设计助手 (Sales Ad Designer)

| 属性 | 描述 |
|------|------|
| **角色定位** | 文案专家，创作高转化的销售广告 |
| **知识库** | 广告文案框架（AIDA、PAS、4U 等）、情感触发词库、标题模板 |
| **能力** | 理解产品/目标客群 → 匹配文案框架 → 生成多版本广告文案 |
| **典型输入** | "请为我们新推出的企业培训 SaaS 撰写一则面向 HR 总监的 LinkedIn 广告" |
| **典型输出** | 广告文案（标题+正文+CTA）+ A/B 测试建议 + 受众定位建议 |
| **Collection** | `ad_design_knowledge` |

### 3.13 📋 结构化面试助手 (Structured Interview Assistant)

| 属性 | 描述 |
|------|------|
| **角色定位** | 面试设计师，构建系统化的面试内容 |
| **知识库** | 结构化面试设计方法、评分量表模板、维度-问题映射库 |
| **能力** | 分析岗位要求 → 设计面试维度 → 生成评分标准 + 面试题 |
| **典型输入** | "请为我们的销售总监岗位设计一套结构化面试内容" |
| **典型输出** | 面试维度表 + 各维度面试题 + 评分标准 + 面试指引 |
| **Collection** | `structured_interview_knowledge` |

### 3.14 🚀 入职培训设计助手 (Onboarding Training Designer)

| 属性 | 描述 |
|------|------|
| **角色定位** | 学习设计师，规划新人销售培训方案 |
| **知识库** | 培训设计模型（ADDIE、70-20-10、Kirkpatrick 评估等）、培训课程库 |
| **能力** | 了解业务 + 分析岗位需求 → 设计分阶段培训方案 |
| **典型输入** | "请为我们新入职的 SaaS 销售代表设计一份 30 天入职培训计划" |
| **典型输出** | 培训方案（阶段/目标/内容/形式/评估）+ 时间表 + 材料清单 |
| **Collection** | `onboarding_knowledge` |

---

## 4. LangGraph 状态图设计

### 4.1 State 定义

```javascript
// Graph State 核心结构
const GraphState = {
  sessionId: String,
  
  // 用户输入
  userInput: String,
  userContext: {
    industry: String,
    companySize: String,
    role: String,
    scenario: String
  },
  
  // 当前选中的专家列表（可单聊也可多专家协作）
  selectedExperts: String[],
  
  // 路由决策
  routedTo: String,      // 当前/下一个执行的 Agent 名称
  executionOrder: [],    // 执行过的 Agent 列表
  
  // 各 Agent 输出
  agentOutputs: {
    [agentName]: {
      status: 'pending' | 'running' | 'done' | 'error',
      output: Object,
      knowledgeRefs: [],
      timestamp: Date
    }
  },
  
  // 对话历史
  messages: [
    { role: 'user' | 'assistant' | 'agent', agentName, content }
  ],
  
  // 全局状态
  currentStage: 'routing' | 'executing' | 'summarizing' | 'done',
  maxSteps: Number,
  error: String
};
```

### 4.2 图结构 — 双模式路由

#### 模式 A：单专家模式（用户指定找谁）
```
用户输入 → 路由判断 → 指定 Agent → 执行 → 返回结果
```

#### 模式 B：多专家协作模式（复杂任务需要多位专家）
```
用户输入 → 策略路由（自动匹配最合适的专家组合）
         → 并行/串行执行多个 Agent
         → 汇总合成 → 返回结果
```

```
                  ┌──────────────┐
                  │   __start__   │
                  │  (用户输入)   │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  RouteAgent  │ ←── 意图路由（LLM 判断）
                  │  (选谁/选哪些)│     分析用户输入 → 匹配专家
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  Fan-out     │
                  │  分发到 Agent│
                  └──────┬───────┘
                         │
            ┌────────────┼────────────┬─── ...
            │            │            │
     ┌──────▼──┐  ┌─────▼───┐  ┌────▼───┐
     │ Coach   │  │Question │  │ Story  │  ... (14 Agents)
     │ Agent   │  │Designer │  │ Creator│
     └──────┬──┘  └─────┬───┘  └────┬───┘
            │            │           │
            └────────────┼───────────┘
                         │
                  ┌──────▼───────┐
                  │  Fan-in      │
                  │  汇总合成     │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │   __end__    │
                  │  (回复用户)   │
                  └──────────────┘
```

### 4.3 路由逻辑

```javascript
async function routeToExpert(state) {
  // 使用 LLM 分析用户意图，选择最合适的专家
  const selection = await llm.invoke(`
    用户输入: ${state.userInput}
    
    可用专家: ${EXPERTS_LIST}
    
    请分析用户意图，选择最合适的 1-3 位专家，返回 JSON 数组。
    如果问题单一，只选 1 位；如果需要多角度分析，选多位。
  `);
  
  state.selectedExperts = selection;
  
  // 如果只选了 1 位，直接路由
  if (state.selectedExperts.length === 1) {
    return state.selectedExperts[0];
  }
  
  // 如果选了多位，先执行第一个，后续走图编排
  return state.selectedExperts[0];
}
```

---

## 5. 向量数据库设计（内置本地存储）

系统内置纯 Node.js 向量数据库，无需安装 Docker 或外部服务。

| 特性 | 说明 |
|------|------|
| **类型** | In-Memory + JSON 文件持久化 |
| **检索算法** | Cosine 余弦相似度 |
| **数据目录** | `data/vectorstore/` |
| **向量维度** | 由 Embedding 模型决定（默认 1024） |
| **持久化** | 每次写入自动保存到磁盘，重启加载 |

### 5.1 Collection 清单

| Collection | 用途 | 关联 Agent |
|-----------|------|-----------|
| `sales_coach_knowledge` | 销售方法论、沟通模型、错误案例 | 销售教练 |
| `question_design_knowledge` | 提问框架、场景-问题映射 | 问题设计助手 |
| `story_creation_knowledge` | 故事结构模板、成功案例 | 销售故事创作助手 |
| `proposal_design_knowledge` | 方案结构、价值主张框架 | 销售方案设计助手 |
| `strategy_knowledge` | 战略框架、行业对标 | 销售战略助手 |
| `insight_design_knowledge` | 洞察方法论、案例库 | 销售洞察设计助手 |
| `performance_feedback_knowledge` | 反馈模型、辅导框架 | 绩效反馈助手 |
| `process_design_knowledge` | 流程模型、评估框架 | 销售流程设计助手 |
| `compensation_knowledge` | 薪酬模型、激励理论 | 销售薪酬助手 |
| `talent_profile_knowledge` | 胜任力模型、性格框架 | 销售人才画像助手 |
| `behavioral_interview_knowledge` | STAR 面试法、特质评估 | 行为访谈助手 |
| `ad_design_knowledge` | 广告文案框架、模板 | 销售广告设计助手 |
| `structured_interview_knowledge` | 结构化面试设计、评分标准 | 结构化面试助手 |
| `onboarding_knowledge` | 培训设计模型、课程库 | 入职培训设计助手 |

### 5.2 通用 Payload Schema

```json
{
  "id": "uuid",
  "vector": [...],
  "payload": {
    "title": "SPIN 提问法详解",
    "category": "methodology",
    "tags": ["SPIN", "提问技巧", "需求挖掘"],
    "summary": "...",
    "content": "...全文...",
    "source": "书籍/实践/案例",
    "difficulty": "beginner|intermediate|advanced",
    "scenarios": ["初次拜访", "需求调研", "异议处理"],
    "created_at": "2026-01-15"
  }
}
```

---

## 6. LLM 集成方案 (DeepSeek-V4-Flash)

### 6.1 连接方式

DeepSeek 提供 **OpenAI 兼容 API**，通过 LangChain 的 `ChatOpenAI` 调用：

| 参数 | 值 |
|------|-----|
| API Base URL | `https://api.deepseek.com/v1` |
| Model | `deepseek-v4-flash` |
| Auth | Bearer Token (自定义 API Key) |

### 6.2 Agent System Prompt 模板

```
你是一位资深的【角色名称】，隶属于「销售专家团」。

## 你的专业领域
{role_description}

## 你的知识库上下文
{vector_store_context}

## 核心原则
1. 所有建议必须基于知识库中的专业方法，并注明方法来源
2. 回答要具体、可执行，避免空泛理论
3. 结合用户提供的实际场景进行定制
4. 输出结构化（分点/表格/步骤）

## 当前用户场景
行业: {industry}
角色: {role}
场景描述: {scenario}

## 用户问题
{user_input}

请给出专业回答。
```

### 6.3 Embedding 方案

通过 DeepSeek Embeddings API 将知识库内容向量化：

```javascript
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: { baseURL: process.env.DEEPSEEK_BASE_URL },
  modelName: "deepseek-embedding-v2"
});
```

---

## 7. 项目目录结构

```
sales-agent/
├── package.json
├── .env
├── .env.example
├── ARCHITECTURE.md           # 本文档
├── README.md
│
├── src/
│   ├── index.js              # 应用入口
│   │
│   ├── config/
│   │   └── index.js          # 统一配置
│   │
│   ├── llm/
│   │   ├── deepseek.js       # DeepSeek LLM 封装
│   │   └── embeddings.js     # Embedding 封装
│   │
│   ├── vectorstore/
│   │   ├── qdrant-client.js  # 内置向量数据库
│   │   └── seeder.js         # 知识库种子数据
│   │
│   ├── agents/
│   │   ├── base-agent.js     # Agent 基类
│   │   ├── sales-coach.js
│   │   ├── question-designer.js
│   │   ├── story-creator.js
│   │   ├── proposal-designer.js
│   │   ├── strategy-advisor.js
│   │   ├── insight-designer.js
│   │   ├── performance-feedback.js
│   │   ├── process-designer.js
│   │   ├── compensation-assistant.js
│   │   ├── talent-profile-builder.js
│   │   ├── behavioral-interview.js
│   │   ├── ad-designer.js
│   │   ├── structured-interview.js
│   │   └── onboarding-designer.js
│   │
│   ├── graph/
│   │   ├── state.js           # State 定义
│   │   └── expert-graph.js    # LangGraph 图
│   │
│   └── server/
│       ├── app.js             # Express 服务器
│       └── routes.js          # API 路由
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
│
└── data/
    └── seed/                  # 种子数据 JSON 文件
        ├── sales-coach.json
        ├── question-design.json
        └── ...
```

---

## 8. 通信与数据流

### 8.1 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/chat` | 发送消息（自动路由到合适的专家） |
| `POST` | `/api/chat/:expertId` | 指定专家对话 |
| `GET` | `/api/experts` | 获取所有专家列表 |
| `GET` | `/api/sessions/:id` | 获取会话历史 |

### 8.2 SSE 流式响应格式

```
event: node_start
data: {"agent": "sales_coach", "label": "销售教练", "message": "正在分析您的销售对话..."}

event: thought
data: {"agent": "sales_coach", "content": "我发现对话中存在三个关键问题..."}

event: knowledge_ref
data: {"agent": "sales_coach", "source": "SPIN Selling Techniques", "relevance": 0.92}

event: node_complete
data: {"agent": "sales_coach", "output": {...}}

event: complete
data: {"final_output": "..."}
```

---

## 9. 协作模式

### 9.1 单专家模式（默认）
用户明确或系统自动判断只用一位专家，直接路由。

### 9.2 多专家讨论模式
复杂问题需要多位专家从不同角度分析。例如：

> **用户**: "我们销售团队新人流失率高，请帮我分析原因并给出改进方案"

**路由结果**: 入职培训设计助手 + 销售薪酬助手 + 绩效反馈助手

**执行过程**:
```
培训助手(分析培训方案)  ──┐
薪酬助手(分析薪酬激励)  ──┼──→ 汇总合成 → 综合报告
绩效反馈(分析管理反馈)  ──┘
```

### 9.3 串行咨询模式
一个专家的输出作为下一个专家的输入。例如：

> **用户**: "我们想进入金融行业市场"

```
战略助手 → 方案设计助手 → 故事创作助手 → 广告设计助手
(市场战略)  (方案框架)    (客户案例故事)  (获客广告)
```

---

## 10. 开发路线图

| 阶段 | 内容 |
|------|------|
| **Phase 1** | 项目搭建 + 配置 + DeepSeek LLM 集成 + 向量数据库 |
| **Phase 2** | Agent 基类 + 14 个 Agent 实现（每个约 60 行） |
| **Phase 3** | LangGraph 编排 + 意图路由 + 多专家协作 |
| **Phase 4** | 14 个知识库种子数据 + Embedding 索引 |
| **Phase 5** | Express API + SSE 流式响应 |
| **Phase 6** | 前端 Chat UI |
| **Phase 7** | 集成测试 + 文档 |

---

## 11. 运行环境

| 依赖 | 要求 | 说明 |
|------|------|------|
| Node.js | >= 20.x | 运行环境 |
| DeepSeek API Key | 开发者账户 | 唯一外部依赖 |
| 内存 | >= 512MB | 含向量数据库 |

### 环境变量
```env
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-v4-flash
PORT=3000
NODE_ENV=development
```

---

## 12. 扩展性设计

| 维度 | 方案 |
|------|------|
| **新增专家** | 继承 `BaseAgent` + 注册到专家列表 + 添加内置向量库 collection |
| **替换 LLM** | 修改 `deepseek.js` 中的 model 和 base URL |
| **持久化会话** | State 序列化存入 Redis/Postgres |
| **多用户** | sessionId 隔离 |
| **实时协作** | WebSocket 替代 SSE（未来升级） |
| **嵌入外部工具** | 通过 LangChain Tool 集成（Web搜索、CRM API 等） |
