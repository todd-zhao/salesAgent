# 销售专家团 (Sales Expert Group)

> 14 位 AI 销售专家，纯本地运行，无需外部服务  
> 技术栈: Node.js + LangChain.js + LangGraph.js + 内置向量数据库 + DeepSeek-V4-Flash

## ✨ 特性

- **🧠 14 位销售专家** — 覆盖销售教练、问题设计、故事创作、方案设计、战略、洞察、绩效反馈等
- **🔌 开箱即用** — 唯一外部依赖是 DeepSeek API，向量数据库内置
- **🧩 LangGraph 编排** — 智能路由、多专家协作、自动汇总
- **📚 知识库驱动** — 每个专家绑定独立知识库，支持语义检索
- **🎨 可视化界面** — 自带 Chat UI，也可通过 REST API 调用

## 🚀 快速开始

### 1. 配置 API Key

```bash
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY
```

### 2. 安装并启动

```bash
npm install
npm start
```

访问 [http://localhost:3000](http://localhost:3000)

### 3. （可选）导入知识库种子

```bash
npm run seed
```

## 🧠 14 位专家

| # | 专家 | 职责 | 知识库 |
|---|------|------|--------|
| 1 | 🎯 销售教练 | 解答疑问，解析对话，诊断沟通问题 | `sales_coach_knowledge` |
| 2 | ❓ 问题设计助手 | 利用提问结构设计问题清单 | `question_design_knowledge` |
| 3 | 📖 销售故事创作助手 | 创作有吸引力的销售故事 | `story_creation_knowledge` |
| 4 | 📄 销售方案设计助手 | 设计说服型销售方案 | `proposal_design_knowledge` |
| 5 | 🧭 销售战略助手 | 制定、评估、校正销售战略 | `strategy_knowledge` |
| 6 | 💡 销售洞察设计助手 | 产出结构化销售洞察 | `insight_design_knowledge` |
| 7 | 📊 绩效反馈助手 | 评价和优化绩效反馈谈话 | `performance_feedback_knowledge` |
| 8 | 🔄 销售流程设计助手 | 诊断和设计销售流程 | `process_design_knowledge` |
| 9 | 💰 销售薪酬助手 | 设计销售薪酬方案 | `compensation_knowledge` |
| 10 | 👤 销售人才画像助手 | 构建销售人才画像 | `talent_profile_knowledge` |
| 11 | 🗣️ 行为访谈助手 | 行为访谈与特质分析 | `behavioral_interview_knowledge` |
| 12 | 📢 销售广告设计助手 | 撰写销售广告文案 | `ad_design_knowledge` |
| 13 | 📋 结构化面试助手 | 设计结构化面试内容 | `structured_interview_knowledge` |
| 14 | 🚀 入职培训设计助手 | 设计新人培训方案 | `onboarding_knowledge` |

## 📚 添加知识库内容

每个专家都有自己的知识库（向量集合）。添加知识的步骤：

1. 在 `data/seed/` 下创建 JSON 文件，指定 `collection` 为对应专家的知识库名
2. 运行 `npm run seed` 自动向量化并导入
3. 重新启动应用即可生效

示例 `data/seed/my-knowledge.json`:

```json
{
  "collection": "sales_coach_knowledge",
  "documents": [
    {
      "id": "doc-001",
      "content": "文档正文内容...",
      "metadata": {
        "title": "文档标题",
        "category": "methodology",
        "tags": ["SPIN", "提问技巧"],
        "source": "来源",
        "scenarios": ["初次拜访", "需求调研"]
      }
    }
  ]
}
```

## 🔧 API

### POST /api/chat — 自动路由

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请帮我分析这段销售对话...",
    "context": {
      "industry": "SaaS",
      "role": "销售经理",
      "scenario": "异议处理"
    }
  }'
```

### POST /api/chat/:expertName — 指定专家

```bash
curl -X POST http://localhost:3000/api/chat/sales_coach \
  -H "Content-Type: application/json" \
  -d '{"message": "分析这段对话..."}'
```

### GET /api/experts — 专家列表

```bash
curl http://localhost:3000/api/experts
```

## 🏗️ 项目结构

```
sales-agent/
├── src/
│   ├── index.js                # 入口
│   ├── config/index.js         # 配置
│   ├── llm/
│   │   ├── deepseek.js         # DeepSeek LLM
│   │   └── embeddings.js       # Embedding 模型
│   ├── vectorstore/
│   │   └── qdrant-client.js    # 内置向量数据库
│   ├── agents/
│   │   ├── base-agent.js       # Agent 基类
│   │   ├── index.js            # 14 位专家注册
│   │   └── *.js                # 各专家实现
│   ├── graph/
│   │   ├── state.js            # 状态定义
│   │   └── expert-graph.js     # LangGraph 编排
│   └── server/
│       ├── app.js              # Express 服务
│       └── routes.js           # API 路由
├── frontend/                   # 聊天界面
├── data/
│   ├── seed/                   # 知识库种子文件
│   └── vectorstore/            # 向量数据持久化
└── scripts/
    └── seed-knowledge.js       # 种子导入脚本
```

## 💻 技术栈

| 组件 | 方案 | 说明 |
|------|------|------|
| LLM | DeepSeek-V4-Flash | 通过 OpenAI 兼容 API |
| Embedding | DeepSeek Embedding | 文本向量化 |
| Agent 框架 | LangChain.js | LLM 调用链 |
| 编排引擎 | LangGraph.js | 多 Agent 状态图 |
| 向量数据库 | 内置本地存储 | Cosine 相似度，JSON 持久化 |
| 后端 | Express | REST + 静态文件 |
| 前端 | 原生 HTML/JS/CSS | Chat UI |
