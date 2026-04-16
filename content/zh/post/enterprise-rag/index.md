---
title: "Enterprise_RAG 全栈源码拆解：Agent + RAG 企业级知识问答系统从架构到落地"
date: 2026-04-16
categories: ["技术"]
tags: ["RAG", "Agent", "Milvus", "Neo4j", "BM25", "Vector", "Knowledge Graph", "LLM", "FastAPI"]
cover: /broken-boat/zh/post/enterprise-rag/agent+rag.png
description: "按源码逐层拆解 Enterprise_RAG：Agent + RAG 是什么、三路检索（BM25 + Vector + Graph）、9阶段 Pipeline、Agent 编排、工具体系、完整实操步骤。"
---

> 这篇文章基于 Enterprise_RAG 的完整源码阅读整理。
>
> 参考仓库：`https://github.com/kerro99920/Enterprise_RAG`
>
> 覆盖范围说明：
> - 不是逐行罗列仓库每一行代码。
> - 但覆盖了完整主链路：RAG Pipeline（9阶段）→ Agent 编排 → 工具体系 → 三路检索融合。
> - 重点是让新手知道"Agent + RAG 是什么、怎么跑、每一步产物是什么、出错怎么查"。

---

## 目录

1. 项目定位与核心结论
2. 新手先看：文件结构与阅读顺序
3. Agent + RAG 是什么（完整解读）
4. 整体架构：三路检索融合设计
5. RAG Pipeline 九阶段详解
6. Agent 智能体系统（周报/成本/进度/安全/风险）
7. 工具层设计（25个专业工具）
8. 三路检索源码拆解（BM25 + Vector + Graph）
9. 数据模型与存储设计
10. 配置、启动脚本、健康检查
11. 面向新手的完整实操步骤（含命令、入口、产物、排错）
12. 工程点评与改进建议

---

## 一、项目定位与核心结论

Enterprise_RAG 是一个**面向建筑/工程行业的私有化 RAG 智能问答 + Agent 分析平台**：

- **RAG 层**：三路混合检索（BM25 + Vector + Graph）+ Rerank + LLM 生成
- **Agent 层**：5 个专业 Agent（周报/成本/进度/安全/风险）+ 25 个工具函数
- **存储层**：PostgreSQL（元数据）+ Milvus（向量）+ Neo4j（图谱）+ Redis（缓存）
- **工程层**：FastAPI + Docker Compose + 完整测试 + 优雅降级

一句话总结：**它不是"简单的文档问答"，而是"三路检索 + Agent 编排的企业级知识管理系统"。**

---

## 二、新手先看：文件结构与阅读顺序

### 2.1 文件结构（学习版）

```text
Enterprise_RAG/
├── app/                         # Web 层（API 入口）
│   ├── main.py                  # FastAPI 应用入口
│   ├── api/v1/
│   │   ├── qa.py                # RAG 问答接口
│   │   ├── document.py          # 文档管理接口
│   │   ├── projects.py          # 项目管理接口
│   │   ├── graph.py             # 知识图谱接口
│   │   └── drawing.py           # 施工图处理接口
│   └── schemas/                 # Pydantic 请求/响应模型
│
├── agents/                      # Agent 智能体层
│   ├── weekly_report_agent.py   # 周报生成 Agent（11步编排）
│   ├── cost_agent.py            # 成本分析 Agent（CPI 计算）
│   ├── progress_agent.py        # 进度分析 Agent（SPI 计算）
│   ├── safety_agent.py          # 安全分析 Agent
│   ├── risk_agent.py            # 风险分析 Agent
│   └── api/v1/agents.py         # Agent API 路由
│
├── tools/                       # 工具层（数据获取与计算）
│   ├── cost_tools.py            # 8 个成本分析函数
│   ├── progress_tools.py        # 8 个进度分析函数
│   ├── safety_tools.py          # 9 个安全检查函数
│   └── rag_tool.py              # RAG 检索工具
│
├── services/                    # 核心服务层
│   ├── rag/pipeline.py          # RAG 核心流水线编排器
│   ├── document/                # 文档处理子系统
│   │   ├── loader.py            # 文档加载（多格式路由）
│   │   ├── pdf_parser.py        # PDF 解析
│   │   ├── word_parser.py       # Word 解析
│   │   ├── ocr_parser.py        # OCR 识别
│   │   ├── cleaner.py           # 文本清洗
│   │   ├── splitter.py          # 文本分块
│   │   └── construction_drawing/
│   │       ├── drawing_processor.py  # 施工图处理编排器
│   │       ├── entity_extractor.py   # 实体提取
│   │       └── relation_extractor.py # 关系提取
│   ├── embedding/               # 向量化子系统
│   │   ├── embedding_model.py   # 模型加载与管理
│   │   └── embedder.py          # 批量向量化
│   ├── retrieval/               # 检索子系统
│   │   ├── bm25/bm25_engine.py  # BM25 关键词检索
│   │   ├── vector/vector_engine.py  # Milvus 向量检索
│   │   ├── graph/graph_retriever.py # Neo4j 图谱检索
│   │   ├── hybrid/hybrid_retriever.py # 混合检索器
│   │   └── graph_enhanced_retriever.py # 三路融合检索器
│   ├── rerank/reranker.py       # BGE-Reranker 重排序
│   ├── llm/                     # LLM 子系统
│   │   ├── llm_client.py        # LLM 客户端
│   │   ├── generator.py         # 答案生成器
│   │   └── prompt/              # Prompt 模板
│   ├── graph/neo4j_client.py    # Neo4j 客户端
│   └── cache/redis_client.py    # Redis 缓存客户端
│
├── models/                      # 数据模型层（ORM）
│   ├── document.py              # Document / DocumentChunk / DocumentMetadata
│   ├── project.py               # ProjectBasic / TaskSchedule / CostDetail
│   │                            # SafetyRecord / QualityReport / AgentWorkflowLog
│   ├── user.py                  # 用户模型
│   ├── query.py                 # 查询日志模型
│   ├── construction_drawing.py  # 施工图模型
│   └── graph_models.py          # 图数据模型
│
├── repository/                  # 数据访问层（DAO）
│   ├── document_repo.py         # 文档 DAO
│   ├── vector_repo.py           # 向量 DAO
│   ├── query_log_repo.py        # 查询日志 DAO
│   └── graph_repo.py            # 图数据 DAO
│
├── core/                        # 核心基础设施层
│   ├── config.py                # 全局配置中心
│   ├── database.py              # 数据库连接管理
│   ├── logger.py                # Loguru 日志配置
│   ├── constants.py             # 全局常量
│   └── security.py              # 安全工具
│
├── docker/docker-compose.yml    # 容器化配置
├── scripts/                     # 初始化脚本
│   ├── init_db.py               # 创建 PostgreSQL 表结构
│   ├── init_milvus.py           # 创建 Milvus 集合
│   └── ingest_docs.py           # 文档批量导入
├── tests/                       # 测试套件
│   ├── test_agents.py           # Agent 核心逻辑测试
│   └── test_agents_api.py       # Agent API 集成测试
└── docs/                        # 技术文档
    ├── DEPLOYMENT_GUIDE.md      # 部署指南
    └── RAG检索流程详解.md        # RAG 完整技术文档
```

### 2.2 推荐阅读顺序（不迷路）

1. `README.md`：先看系统边界和技术栈。
2. `docs/RAG检索流程详解.md`：理解 RAG 九阶段流程。
3. `services/rag/pipeline.py`：理解 RAG 核心编排。
4. `agents/weekly_report_agent.py`：理解 Agent 编排模式。
5. `tools/cost_tools.py`：理解工具层设计。
6. `services/retrieval/`：理解三路检索实现。
7. `docker/docker-compose.yml`：理解基础设施部署。

---

## 三、Agent + RAG 是什么（完整解读）

### 3.1 什么是 RAG（Retrieval-Augmented Generation）

**RAG = 检索增强生成**，是解决大模型"幻觉"和"知识过时"的核心技术。

#### 3.1.1 传统 LLM 的问题

```text
用户：KL-1 梁使用什么混凝土强度等级？
LLM（直接回答）：可能是 C30 或 C35...（编造答案，不可靠）
```

**核心问题**：

1. **知识截止日期**：模型训练后的新知识无法获取
2. **幻觉问题**：模型会编造听起来合理但实际错误的答案
3. **领域知识缺失**：企业内部文档、专业规范未被训练
4. **无法溯源**：无法验证答案来源，难以建立信任

#### 3.1.2 RAG 的解决方案

```text
用户：KL-1 梁使用什么混凝土强度等级？
    ↓
检索系统：从知识库中检索相关文档
    ↓ 找到：施工图说明 - "KL-1 混凝土强度等级为 C30"
    ↓
LLM（基于检索结果）：根据施工图说明，KL-1 梁使用 C30 混凝土。
```

**RAG 的工作原理**：

```text
┌─────────────────────────────────────────────────────────┐
│                    RAG 完整流程                          │
│                                                          │
│  ① 用户查询                                              │
│     ↓                                                    │
│  ② 查询理解与改写（Query Rewriting）                     │
│     ↓                                                    │
│  ③ 检索相关文档（Retrieval）                             │
│     ├─ 关键词检索（BM25）                                │
│     ├─ 语义检索（Vector）                                │
│     └─ 结构化检索（Graph）                               │
│     ↓                                                    │
│  ④ 文档重排序（Reranking）                               │
│     ↓                                                    │
│  ⑤ 上下文构建（Context Building）                        │
│     ↓                                                    │
│  ⑥ Prompt 构建（Prompt Engineering）                     │
│     ↓                                                    │
│  ⑦ LLM 生成答案（Generation）                            │
│     ↓                                                    │
│  ⑧ 答案后处理（Post-processing）                         │
│     ↓                                                    │
│  ⑨ 返回结果 + 来源引用                                   │
└─────────────────────────────────────────────────────────┘
```

#### 3.1.3 RAG 的核心优势

| 优势 | 说明 | 示例 |
|------|------|------|
| **消除幻觉** | 答案基于真实文档，不编造 | 施工规范引用准确，不会编造不存在的条款 |
| **知识可更新** | 更新文档即可，无需重新训练模型 | 新版规范发布后，只需更新知识库 |
| **可溯源** | 每个答案都能追溯到来源文档 | 显示答案来自哪份文档的第几页 |
| **私有化部署** | 企业内部知识不外泄 | 施工图、合同等敏感文档不上传云端 |
| **成本低** | 无需微调大模型 | 避免昂贵的模型训练成本 |
| **实时性强** | 文档更新后立即生效 | 今天上传的文档，今天就能检索 |

#### 3.1.4 RAG 的技术演进

**第一代 RAG（Naive RAG）**：

```text
查询 → 向量检索 → 拼接上下文 → LLM 生成
```

- **优点**：简单直接
- **缺点**：检索质量差、上下文噪声多、无法处理复杂查询

**第二代 RAG（Advanced RAG）**：

```text
查询改写 → 多路检索 → Rerank → 上下文压缩 → LLM 生成
```

- **改进**：查询优化、混合检索、重排序
- **代表**：本项目的三路检索融合

**第三代 RAG（Modular RAG）**：

```text
查询路由 → 多跳检索 → 自我反思 → 迭代优化 → LLM 生成
```

- **特点**：模块化设计、可插拔组件、自适应策略
- **代表**：LangChain、LlamaIndex

#### 3.1.5 RAG 的关键技术

**1. 文档处理**：

- **分块策略**：固定长度、语义分块、滑动窗口
- **元数据提取**：标题、作者、日期、章节
- **去重与清洗**：去除重复内容、清理格式

**2. 向量化**：

- **模型选择**：BGE-M3（中文）、E5（多语言）、OpenAI Embedding
- **维度选择**：768 维（平衡）、1024 维（高精度）
- **批量处理**：加速向量化过程

**3. 检索策略**：

- **稀疏检索**：BM25、TF-IDF（精确匹配）
- **稠密检索**：向量相似度（语义理解）
- **混合检索**：RRF 融合、加权融合

**4. 重排序**：

- **Cross-Encoder**：BERT、BGE-Reranker
- **LLM Reranker**：用 LLM 直接打分
- **规则 Reranker**：基于元数据、时间等规则

**5. 上下文优化**：

- **上下文压缩**：去除冗余信息
- **上下文扩展**：补充相关段落
- **上下文排序**：重要信息前置

#### 3.1.6 RAG 的应用场景

| 场景 | 特点 | 示例 |
|------|------|------|
| **企业知识库** | 内部文档检索 | 规章制度、技术文档、会议纪要 |
| **客服问答** | 高频问题解答 | 产品说明、售后政策、故障排查 |
| **法律咨询** | 法规条款检索 | 法律法规、判例分析、合同审查 |
| **医疗诊断** | 病例文献检索 | 诊疗指南、药品说明、病例库 |
| **金融分析** | 研报数据检索 | 财报分析、行业研究、政策解读 |
| **教育辅导** | 教材知识检索 | 课本内容、习题解析、知识点讲解 |

### 3.2 什么是 Agent（智能体）

**Agent = 能自主决策、调用工具、完成复杂任务的 AI 系统。**

#### 3.2.1 传统 LLM vs Agent

| 对比维度 | 传统 LLM | Agent |
|---------|---------|-------|
| **能力** | 只能对话 | 能调用工具、执行任务 |
| **决策** | 被动回答 | 主动规划、多步推理 |
| **工具** | 无 | 可调用数据库、API、计算函数 |
| **任务** | 单轮问答 | 多步骤任务编排 |
| **记忆** | 无状态 | 有记忆、可学习 |
| **反思** | 无 | 可自我评估、迭代优化 |

#### 3.2.2 Agent 的典型工作流程

```text
用户：生成本周项目周报

Agent（周报生成 Agent）：
  ① 调用进度工具 → 获取 SPI、延期任务
  ② 调用成本工具 → 获取 CPI、超支项
  ③ 调用安全工具 → 获取合格率、隐患
  ④ 综合分析 → 计算风险等级
  ⑤ 调用 RAG → 检索相关改进建议
  ⑥ 生成结构化周报 → 输出 Markdown/JSON
```

#### 3.2.3 Agent 的核心能力

**1. 感知（Perception）**：

- 理解用户意图
- 解析任务需求
- 识别环境状态

**2. 规划（Planning）**：

- 任务分解
- 步骤排序
- 资源分配

**3. 执行（Execution）**：

- 调用工具
- 执行操作
- 处理结果

**4. 记忆（Memory）**：

- 短期记忆：当前对话上下文
- 长期记忆：历史交互、知识积累
- 工作记忆：任务执行过程中的中间状态

**5. 反思（Reflection）**：

- 自我评估
- 错误检测
- 策略调整

#### 3.2.4 Agent 的分类

**按架构模式分类**：

**1. ReAct Agent（推理-行动循环）**

```text
思考（Thought）→ 行动（Action）→ 观察（Observation）→ 思考 → ...

示例：
Thought: 我需要查询北京明天的天气
Action: call_weather_api(city="北京", date="明天")
Observation: 北京明天晴，15-25°C
Thought: 我已经获取到天气信息，可以回答用户了
Answer: 北京明天天气晴朗，温度 15-25°C
```

- **优点**：推理过程可解释、错误可追溯
- **缺点**：步骤多、延迟高
- **适用**：需要多步推理的复杂任务

**2. Plan-and-Execute Agent（计划-执行分离）**

```text
① 规划阶段：
   用户任务 → 分解为子任务列表 → 生成执行计划

② 执行阶段：
   按计划顺序执行 → 每步完成后更新状态 → 继续下一步

示例：
用户：帮我订一张明天北京到上海的机票
Plan:
  1. 查询明天北京到上海的航班
  2. 筛选合适的航班（时间、价格）
  3. 确认用户选择
  4. 调用订票 API
  5. 返回订单信息

Execute:
  Step 1: [执行查询] → 找到 10 个航班
  Step 2: [筛选] → 推荐 3 个航班
  Step 3: [等待用户确认] → 用户选择航班 A
  Step 4: [调用 API] → 订票成功
  Step 5: [返回] → 订单号 XXX
```

- **优点**：结构清晰、易于并行化
- **缺点**：计划固定、难以应对突发情况
- **适用**：流程明确的任务（订票、预约、报表生成）

**3. Reflexion Agent（反思型 Agent）**

```text
执行 → 评估 → 反思 → 改进 → 重新执行

示例：
Attempt 1: 生成代码 → 运行失败（语法错误）
Reflection: 我在第 5 行少了一个括号
Attempt 2: 修复代码 → 运行失败（逻辑错误）
Reflection: 我的循环条件写错了
Attempt 3: 再次修复 → 运行成功
```

- **优点**：自我改进、错误恢复能力强
- **缺点**：多次尝试成本高
- **适用**：代码生成、复杂推理、需要迭代优化的任务

**4. Multi-Agent System（多 Agent 协作）**

```text
┌─────────────────────────────────────────────────────────┐
│                    协调 Agent                            │
│              （任务分配、结果聚合）                       │
└─────────────────┬───────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
┌───▼───┐    ┌───▼───┐    ┌───▼───┐    ┌───▼───┐
│Agent A│    │Agent B│    │Agent C│    │Agent D│
│专家1  │    │专家2  │    │专家3  │    │专家4  │
└───────┘    └───────┘    └───────┘    └───────┘

示例（本项目）：
协调 Agent: 周报生成 Agent
  ├─ Agent A: 进度分析 Agent（计算 SPI）
  ├─ Agent B: 成本分析 Agent（计算 CPI）
  ├─ Agent C: 安全分析 Agent（计算合格率）
  └─ Agent D: RAG Agent（检索改进建议）
```

- **优点**：专业分工、并行处理、可扩展性强
- **缺点**：协调复杂、通信开销大
- **适用**：复杂系统、需要多领域专业知识的任务

**5. Tool-Augmented Agent（工具增强型 Agent）**

```text
Agent 核心 + 工具库

工具库：
  - 数据库查询工具
  - API 调用工具
  - 计算工具（数学、统计）
  - 文件操作工具
  - 代码执行工具

示例：
用户：帮我分析一下项目成本
Agent:
  1. 调用 get_cost_overview() → 获取成本数据
  2. 调用 calculate_cpi() → 计算 CPI
  3. 调用 identify_overruns() → 识别超支项
  4. 调用 generate_chart() → 生成图表
  5. 综合分析 → 生成报告
```

- **优点**：能力可扩展、工具可复用
- **缺点**：工具选择需要准确
- **适用**：需要调用外部能力的任务（本项目采用此模式）

**按应用领域分类**：

| Agent 类型 | 核心能力 | 典型应用 |
|-----------|---------|---------|
| **对话 Agent** | 多轮对话、上下文理解 | 客服机器人、虚拟助手 |
| **任务 Agent** | 任务规划、工具调用 | 自动化办公、流程执行 |
| **分析 Agent** | 数据分析、报告生成 | 商业智能、数据洞察 |
| **创作 Agent** | 内容生成、创意设计 | 文案写作、图像生成 |
| **代码 Agent** | 代码生成、调试修复 | 编程助手、自动化测试 |
| **研究 Agent** | 信息检索、知识整合 | 文献综述、市场调研 |

**按自主程度分类**：

**1. 被动 Agent（Passive Agent）**：

- 只响应用户指令
- 不主动规划
- 示例：简单的命令执行器

**2. 半自主 Agent（Semi-Autonomous Agent）**：

- 可以分解任务
- 需要用户确认关键步骤
- 示例：本项目的 Agent（需要用户提供 project_id）

**3. 全自主 Agent（Fully Autonomous Agent）**：

- 完全自主决策
- 可以长时间运行
- 示例：自动交易系统、持续监控系统

#### 3.2.5 Agent 的技术挑战

**1. 幻觉问题**：

- Agent 可能调用不存在的工具
- 可能编造工具返回结果
- **解决**：工具白名单、结果验证

**2. 规划失败**：

- 任务分解不合理
- 步骤顺序错误
- **解决**：Few-shot 示例、反思机制

**3. 工具选择错误**：

- 选择了不合适的工具
- 工具参数错误
- **解决**：工具描述优化、参数校验

**4. 无限循环**：

- 陷入重复的推理-行动循环
- **解决**：最大步数限制、循环检测

**5. 成本控制**：

- 多步推理导致 Token 消耗大
- **解决**：缓存、并行化、提前终止

### 3.3 Agent + RAG 的协同关系

**Agent + RAG = 能自主决策 + 能检索知识的智能系统**

```text
┌────────────────────────────────────────────────────────┐
│                    Agent 层（决策与编排）                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 周报 Agent   │  │ 成本 Agent   │  │ 进度 Agent   │  │
│  │ 11步编排     │  │ CPI 计算     │  │ SPI 计算     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         └─────────────────┼─────────────────┘          │
│                           │                            │
└───────────────────────────┼────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    工具层（能力提供）                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 成本工具     │  │ 进度工具     │  │ RAG 工具     │  │
│  │ 8个函数      │  │ 8个函数      │  │ 检索+生成    │  │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  │
└─────────────────────────────────────────────┼──────────┘
                                              │
┌─────────────────────────────────────────────▼──────────┐
│                    RAG 层（知识检索）                     │
│  BM25 检索 + 向量检索 + 图谱检索 → 融合 → Rerank → LLM  │
└─────────────────────────────────────────────────────────┘
```

**在本项目中的体现**：
- **Agent 负责**：任务编排、数据聚合、风险评估、报告生成
- **RAG 负责**：知识检索、文档问答、AI 建议生成
- **工具负责**：数据获取、指标计算、业务逻辑

---

## 四、整体架构：三路检索融合设计

### 4.1 架构总览

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Web / API)                            │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                        FastAPI API Layer                             │
│  ┌───────┐ ┌────────┐ ┌───────┐ ┌────────┐ ┌───────┐ ┌───────────┐ │
│  │  /qa  │ │/document│ │/admin │ │/agents │ │/graph │ │ /drawing  │ │
│  └───────┘ └────────┘ └───────┘ └────────┘ └───────┘ └───────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                        Business Layer                                │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │    RAG Pipeline     │  │ Agent Orchestra  │  │  Graph Service │  │
│  │ Query→Retrieve→     │  │ Weekly│Risk│Cost │  │ Entity│Relation│  │
│  │ Rerank→Generate     │  │ Progress│Safety  │  │  Query│Path    │  │
│  └─────────────────────┘  └──────────────────┘  └────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                        Service Layer                                 │
│  Document │ Embedding │ Retrieval │ LLM │ Cache │ Graph │ Drawing   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                        Infrastructure                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │PostgreSQL│ │  Milvus  │ │  Redis   │ │  Neo4j   │ │ LLM API  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 三路检索融合设计（核心创新）

```text
用户查询："KL-1 梁使用什么混凝土材料？"
    │
    ├─────────────────┬─────────────────┬─────────────────┐
    │                 │                 │                 │
    ▼                 ▼                 ▼                 ▼
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ BM25    │     │ Vector  │     │ Graph   │     │ 融合    │
│ 检索    │     │ 检索    │     │ 检索    │     │ 策略    │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
│ 关键词  │     │ 语义    │     │ 结构化  │     │ RRF     │
│ 精确匹配│     │ 理解    │     │ 知识    │     │ 倒数排名│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
    │                 │                 │                 │
    └─────────────────┴─────────────────┴─────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Rerank 精排   │
                    │ Cross-Encoder │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Prompt 构建   │
                    │ 图谱上下文优先│
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ LLM 生成答案  │
                    └───────────────┘
```

**三路检索的优势**：

| 检索路径 | 适用场景 | 示例 |
|---------|---------|------|
| **BM25（关键词）** | 精确匹配、专业术语 | 规范编号 `GB50009-2012`、构件编号 `KL-1` |
| **Vector（语义）** | 语义理解、同义词 | "混凝土强度" ≈ "砼标号" ≈ "混凝土等级" |
| **Graph（结构）** | 实体关系、推理 | `KL-1 -[USES_MATERIAL]-> C30` |

---

## 五、RAG Pipeline 九阶段详解

### 5.1 阶段总览

```text
用户查询："KL-1 梁使用什么混凝土材料？"
    ↓
① 懒加载初始化（首次调用时）
    ↓
② 缓存命中检查（Redis）
    ↓
③ 查询预处理（清洗、扩展）
    ↓
④ 三路并行检索
    ├─ BM25 关键词检索
    ├─ Vector 语义检索
    └─ Graph 图谱检索
    ↓
⑤ RRF 融合排序
    ↓
⑥ Rerank 精排序（Cross-Encoder）
    ↓
⑦ Prompt 构建（图谱上下文优先）
    ↓
⑧ LLM 生成答案
    ↓
⑨ 结果缓存与返回
```

### 5.2 阶段 ①：懒加载初始化（`services/rag/pipeline.py`）

**为什么需要懒加载**：

- 向量模型加载耗时（BGE-M3 约 2-3 秒）
- Reranker 模型加载耗时（BGE-Reranker 约 1-2 秒）
- 应用启动时不应阻塞

**核心代码**：

```python
class RagPipeline:
    def __init__(self, embedding_model=None, llm_client=None,
                enable_graph=True, graph_weight=0.3):
        self.enable_graph = enable_graph and GRAPH_RETRIEVAL_AVAILABLE
        self._initialized = False

        # 延迟初始化的组件
        self.embedding_model = embedding_model
        self.embedder = None
        self.llm_client = llm_client
        self.bm25_retriever = None
        self.vector_retriever = None
        self.reranker = None
        self.hybrid_retriever = None
        self.graph_retriever = None

    def _lazy_init(self):
        """首次调用时才初始化重量级组件"""
        if self._initialized:
            return

        logger.info("开始懒加载初始化 RAG Pipeline...")

        # 1. 向量模型
        if self.embedding_model is None:
            self.embedding_model = EmbeddingModel()

        # 2. 向量化器
        self.embedder = Embedder(self.embedding_model)

        # 3. LLM 客户端
        if self.llm_client is None:
            self.llm_client = LLMClient()

        # 4. BM25 检索器
        self.bm25_retriever = BM25Retriever()

        # 5. 向量检索器
        self.vector_retriever = VectorRetriever(self.embedder)

        # 6. Reranker（可选）
        try:
            self.reranker = Reranker()
        except Exception as e:
            logger.warning(f"Reranker 初始化失败，将跳过重排序: {e}")
            self.reranker = None

        # 7. 混合检索器
        self.hybrid_retriever = HybridRetriever(
            bm25_retriever=self.bm25_retriever,
            vector_retriever=self.vector_retriever
        )

        # 8. 图谱检索器（可选）
        if self.enable_graph:
            try:
                self.graph_retriever = GraphRetriever()
            except Exception as e:
                logger.warning(f"图谱检索器初始化失败: {e}")
                self.graph_retriever = None

        self._initialized = True
        logger.info("RAG Pipeline 初始化完成")
```

**优雅降级策略**：

- Reranker 失败 → 跳过重排序，直接用融合结果
- Neo4j 失败 → 跳过图谱检索，只用 BM25 + Vector
- 不影响核心问答能力

### 5.3 阶段 ②：缓存命中检查（`services/cache/redis_client.py`）

**缓存键设计**：

```python
def _generate_cache_key(self, query: str, top_k: int) -> str:
    """生成缓存键：query_hash + top_k"""
    query_hash = hashlib.md5(query.encode('utf-8')).hexdigest()
    return f"rag:query:{query_hash}:top_k:{top_k}"
```

**缓存逻辑**：

```python
async def query(self, query: str, top_k: int = 5) -> Dict[str, Any]:
    # 1. 懒加载初始化
    self._lazy_init()

    # 2. 检查缓存
    cache_key = self._generate_cache_key(query, top_k)
    cached_result = await self.cache_client.get(cache_key)

    if cached_result:
        logger.info(f"缓存命中: {query[:50]}")
        return cached_result

    # 3. 缓存未命中，执行完整检索...
```

**缓存过期时间**：

- 默认 1 小时（3600 秒）
- 可通过配置调整

### 5.4 阶段 ③：查询预处理

**清洗逻辑**：

```python
def preprocess_query(self, query: str) -> str:
    """查询预处理：去除特殊字符、多余空格"""
    # 去除多余空格
    query = re.sub(r'\s+', ' ', query).strip()

    # 去除特殊字符（保留中文、英文、数字、常见标点）
    query = re.sub(r'[^\w\s\u4e00-\u9fff.,!?;:，。！？；：]', '', query)

    return query
```

**查询扩展**（可选）：

- 同义词扩展（如"混凝土" → "砼"）
- 缩写展开（如"KL" → "框架梁"）
- 本项目未实现，但预留接口

### 5.5 阶段 ④：三路并行检索

#### BM25 检索（`services/retrieval/bm25/bm25_engine.py`）

**核心原理**：

- TF-IDF 改进版，考虑文档长度归一化
- 适合精确匹配、专业术语

**代码实现**：

```python
class BM25Retriever:
    def __init__(self, k1=1.5, b=0.75):
        self.k1 = k1  # 词频饱和参数
        self.b = b    # 长度归一化参数
        self.bm25 = None
        self.corpus = []
        self.doc_ids = []

    def build_index(self, documents: List[Dict]):
        """构建 BM25 索引"""
        self.corpus = [doc['content'] for doc in documents]
        self.doc_ids = [doc['id'] for doc in documents]

        # 分词
        tokenized_corpus = [list(jieba.cut(doc)) for doc in self.corpus]

        # 构建 BM25 模型
        self.bm25 = BM25Okapi(tokenized_corpus)

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """BM25 检索"""
        # 分词
        tokenized_query = list(jieba.cut(query))

        # 计算 BM25 分数
        scores = self.bm25.get_scores(tokenized_query)

        # 排序并返回 top_k
        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            if scores[idx] > 0:  # 过滤零分结果
                results.append({
                    'doc_id': self.doc_ids[idx],
                    'content': self.corpus[idx],
                    'score': float(scores[idx]),
                    'source': 'bm25'
                })

        return results
```

#### Vector 检索（`services/retrieval/vector/vector_engine.py`）

**核心原理**：

- 使用 BGE-M3 模型将文本转为 768 维向量
- Milvus 使用 HNSW 索引进行 ANN 搜索
- 适合语义理解、同义词匹配

**代码实现**：

```python
class VectorRetriever:
    def __init__(self, embedder: Embedder):
        self.embedder = embedder
        self.milvus_client = MilvusClient()
        self.collection_name = "document_chunks"

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """向量检索"""
        # 1. 查询向量化
        query_vector = self.embedder.embed_query(query)

        # 2. Milvus 检索
        search_params = {
            "metric_type": "IP",  # Inner Product（内积）
            "params": {"ef": 64}  # HNSW 参数
        }

        results = self.milvus_client.search(
            collection_name=self.collection_name,
            data=[query_vector],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            output_fields=["content", "doc_id", "metadata"]
        )

        # 3. 格式化结果
        formatted_results = []
        for hit in results[0]:
            formatted_results.append({
                'doc_id': hit.entity.get('doc_id'),
                'content': hit.entity.get('content'),
                'score': float(hit.distance),
                'source': 'vector',
                'metadata': hit.entity.get('metadata')
            })

        return formatted_results
```

#### Graph 检索（`services/retrieval/graph/graph_retriever.py`）

**核心原理**：

- 从查询中提取实体（如"KL-1"）
- 在 Neo4j 中查找实体及其关系
- 返回结构化知识

**代码实现**：

```python
class GraphRetriever:
    def __init__(self):
        self.neo4j_client = Neo4jClient()

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """图谱检索"""
        # 1. 实体识别（简化版，实际应使用 NER）
        entities = self._extract_entities(query)

        if not entities:
            return []

        # 2. 图谱查询
        results = []
        for entity in entities:
            # Cypher 查询：查找实体及其一跳关系
            cypher = """
            MATCH (n)-[r]->(m)
            WHERE n.name CONTAINS $entity OR m.name CONTAINS $entity
            RETURN n.name AS source, type(r) AS relation,
                   m.name AS target, n.type AS source_type,
                   m.type AS target_type
            LIMIT $limit
            """

            graph_results = self.neo4j_client.execute_query(
                cypher,
                {"entity": entity, "limit": top_k}
            )

            # 3. 格式化为文本
            for record in graph_results:
                content = f"{record['source']} {record['relation']} {record['target']}"
                results.append({
                    'doc_id': f"graph_{entity}",
                    'content': content,
                    'score': 1.0,  # 图谱结果默认高分
                    'source': 'graph',
                    'metadata': {
                        'entity': entity,
                        'relation': record['relation'],
                        'source_type': record['source_type'],
                        'target_type': record['target_type']
                    }
                })

        return results

    def _extract_entities(self, query: str) -> List[str]:
        """简化版实体提取（实际应使用 NER 模型）"""
        # 匹配构件编号（如 KL-1, ZJ-2）
        pattern = r'[A-Z]{2}-\d+'
        entities = re.findall(pattern, query)
        return entities
```

### 5.6 阶段 ⑤：RRF 融合排序（`services/retrieval/hybrid/hybrid_retriever.py`）

**RRF 算法原理**：

```text
RRF(d) = Σ [ 1 / (k + rank_i(d)) ]

其中：
- d: 文档
- rank_i(d): 文档 d 在第 i 个检索器中的排名
- k: 常数（默认 60）
```

**核心代码**：

```python
class HybridRetriever:
    def __init__(self, bm25_retriever, vector_retriever, k=60):
        self.bm25_retriever = bm25_retriever
        self.vector_retriever = vector_retriever
        self.k = k

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """混合检索 + RRF 融合"""
        # 1. 并行检索
        bm25_results = self.bm25_retriever.search(query, top_k=top_k*2)
        vector_results = self.vector_retriever.search(query, top_k=top_k*2)

        # 2. RRF 融合
        rrf_scores = {}

        # BM25 结果
        for rank, result in enumerate(bm25_results, start=1):
            doc_id = result['doc_id']
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (self.k + rank)

        # Vector 结果
        for rank, result in enumerate(vector_results, start=1):
            doc_id = result['doc_id']
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (self.k + rank)

        # 3. 排序
        sorted_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        # 4. 构造最终结果
        doc_map = {r['doc_id']: r for r in bm25_results + vector_results}
        final_results = []

        for doc_id, score in sorted_docs[:top_k]:
            result = doc_map[doc_id].copy()
            result['rrf_score'] = score
            final_results.append(result)

        return final_results
```

**三路融合（加入 Graph）**：

```python
class GraphEnhancedRetriever:
    def __init__(self, hybrid_retriever, graph_retriever, graph_weight=0.3):
        self.hybrid_retriever = hybrid_retriever
        self.graph_retriever = graph_retriever
        self.graph_weight = graph_weight

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """三路融合检索"""
        # 1. 混合检索（BM25 + Vector）
        hybrid_results = self.hybrid_retriever.search(query, top_k=top_k*2)

        # 2. 图谱检索
        graph_results = self.graph_retriever.search(query, top_k=5)

        # 3. 融合策略：图谱结果加权后插入
        all_results = hybrid_results + graph_results

        # 重新计算 RRF 分数（图谱结果权重更高）
        rrf_scores = {}
        for rank, result in enumerate(all_results, start=1):
            doc_id = result['doc_id']
            weight = self.graph_weight if result['source'] == 'graph' else 1.0
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + weight / (60 + rank)

        # 4. 排序并返回
        sorted_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        doc_map = {r['doc_id']: r for r in all_results}

        final_results = []
        for doc_id, score in sorted_docs[:top_k]:
            result = doc_map[doc_id].copy()
            result['final_score'] = score
            final_results.append(result)

        return final_results
```

### 5.7 阶段 ⑥：Rerank 精排序（`services/rerank/reranker.py`）

**为什么需要 Rerank**：

- RRF 融合是"分数无关"的排序，不考虑语义相关性
- Cross-Encoder 模型直接对 (query, doc) 对打分，更精准

**核心代码**：

```python
class Reranker:
    def __init__(self, model_name="BAAI/bge-reranker-base"):
        self.model = CrossEncoder(model_name)

    def rerank(self, query: str, documents: List[Dict], top_k: int = 5) -> List[Dict]:
        """重排序"""
        if not documents:
            return []

        # 1. 构造 (query, doc) 对
        pairs = [[query, doc['content']] for doc in documents]

        # 2. 批量打分
        scores = self.model.predict(pairs)

        # 3. 排序
        for doc, score in zip(documents, scores):
            doc['rerank_score'] = float(score)

        reranked = sorted(documents, key=lambda x: x['rerank_score'], reverse=True)

        return reranked[:top_k]
```

**性能优化**：

- 只对 top 20 结果进行 Rerank（减少计算量）
- 批量推理（batch_size=32）

### 5.8 阶段 ⑦：Prompt 构建

**Prompt 模板**（`services/llm/prompt/qa_prompt.py`）：

```python
QA_PROMPT_TEMPLATE = """你是一个专业的建筑工程助手，请根据以下参考资料回答用户问题。

## 参考资料

{context}

## 用户问题

{query}

## 回答要求

1. 基于参考资料回答，不要编造信息
2. 如果参考资料中没有相关信息，明确告知用户
3. 回答要专业、准确、简洁
4. 如果涉及规范或标准，请引用具体条款

## 你的回答

"""
```

**上下文构建逻辑**：

```python
def build_context(self, documents: List[Dict]) -> str:
    """构建上下文（图谱结果优先）"""
    context_parts = []

    # 1. 图谱结果（结构化知识）
    graph_docs = [d for d in documents if d['source'] == 'graph']
    if graph_docs:
        context_parts.append("### 知识图谱信息\n")
        for doc in graph_docs:
            context_parts.append(f"- {doc['content']}\n")

    # 2. 文档结果
    text_docs = [d for d in documents if d['source'] != 'graph']
    if text_docs:
        context_parts.append("\n### 相关文档\n")
        for i, doc in enumerate(text_docs, 1):
            context_parts.append(f"{i}. {doc['content']}\n")

    return "".join(context_parts)
```

### 5.9 阶段 ⑧：LLM 生成答案（`services/llm/generator.py`）

**核心代码**：

```python
class Generator:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def generate(self, query: str, context: str) -> str:
        """生成答案"""
        # 1. 构建 Prompt
        prompt = QA_PROMPT_TEMPLATE.format(
            context=context,
            query=query
        )

        # 2. 调用 LLM
        response = await self.llm_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,  # 低温度，减少随机性
            max_tokens=1024
        )

        # 3. 提取答案
        answer = response['choices'][0]['message']['content']

        return answer
```

### 5.10 阶段 ⑨：结果缓存与返回

**完整流程代码**：

```python
async def query(self, query: str, top_k: int = 5) -> Dict[str, Any]:
    """完整 RAG 查询流程"""
    # ① 懒加载初始化
    self._lazy_init()

    # ② 缓存检查
    cache_key = self._generate_cache_key(query, top_k)
    cached_result = await self.cache_client.get(cache_key)
    if cached_result:
        return cached_result

    # ③ 查询预处理
    processed_query = self.preprocess_query(query)

    # ④ 三路检索
    retrieved_docs = self.graph_enhanced_retriever.search(processed_query, top_k=20)

    # ⑤ 已在 graph_enhanced_retriever 中完成 RRF 融合

    # ⑥ Rerank 精排序
    if self.reranker:
        reranked_docs = self.reranker.rerank(processed_query, retrieved_docs, top_k=top_k)
    else:
        reranked_docs = retrieved_docs[:top_k]

    # ⑦ Prompt 构建
    context = self.build_context(reranked_docs)

    # ⑧ LLM 生成
    answer = await self.generator.generate(processed_query, context)

    # ⑨ 构造结果并缓存
    result = {
        'query': query,
        'answer': answer,
        'sources': reranked_docs,
        'timestamp': datetime.now().isoformat()
    }

    await self.cache_client.set(cache_key, result, expire=3600)

    return result
```

---

## 六、Agent 智能体系统（周报/成本/进度/安全/风险）

### 6.1 Agent 架构总览

```text
┌─────────────────────────────────────────────────────────┐
│                    Agent 编排层                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 周报 Agent   │  │ 成本 Agent   │  │ 进度 Agent   │  │
│  │ 11步编排     │  │ CPI 计算     │  │ SPI 计算     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 安全 Agent   │  │ 风险 Agent   │                    │
│  │ 合格率分析   │  │ 风险评估     │                    │
│  └──────┬───────┘  └──────┬───────┘                    │
│         │                 │                            │
└─────────┼─────────────────┼────────────────────────────┘
          │                 │
┌─────────▼─────────────────▼────────────────────────────┐
│                    工具层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 成本工具     │  │ 进度工具     │  │ 安全工具     │  │
│  │ 8个函数      │  │ 8个函数      │  │ 9个函数      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 6.2 周报生成 Agent（`agents/weekly_report_agent.py`）

**数据结构定义**：

```python
from dataclasses import dataclass
from typing import List, Dict, Optional

@dataclass
class ProgressSection:
    """进度部分"""
    spi: float  # Schedule Performance Index
    planned_progress: float
    actual_progress: float
    delayed_tasks: List[Dict]
    critical_path_status: str

@dataclass
class CostSection:
    """成本部分"""
    cpi: float  # Cost Performance Index
    budget: float
    actual_cost: float
    cost_variance: float
    overbudget_items: List[Dict]

@dataclass
class SafetySection:
    """安全部分"""
    compliance_rate: float
    total_inspections: int
    passed_inspections: int
    hazards: List[Dict]

@dataclass
class WeeklyReport:
    """完整周报"""
    project_id: str
    report_date: str
    progress: ProgressSection
    cost: CostSection
    safety: SafetySection
    overall_risk_level: str  # green/yellow/red
    key_risks: List[Dict]
    action_items: List[Dict]
    ai_suggestions: List[str]
```

**11 步编排流程**：

```python
class WeeklyReportAgent:
    def __init__(self, db: Session):
        self.db = db
        self.progress_tools = get_progress_tools(db)
        self.cost_tools = get_cost_tools(db)
        self.safety_tools = get_safety_tools(db)
        self.rag_tool = RAGTool()

    async def generate_report(self, project_id: str) -> WeeklyReport:
        """生成周报（11步编排）"""

        # Step 1: 获取进度数据
        progress_data = self.progress_tools.get_progress_overview(project_id)
        spi = progress_data['spi']
        delayed_tasks = self.progress_tools.get_delayed_tasks(project_id)

        # Step 2: 获取成本数据
        cost_data = self.cost_tools.get_cost_overview(project_id)
        cpi = cost_data['cpi']
        overbudget_items = self.cost_tools.get_overbudget_items(project_id)

        # Step 3: 获取安全数据
        safety_data = self.safety_tools.get_safety_overview(project_id)
        compliance_rate = safety_data['compliance_rate']
        hazards = self.safety_tools.get_active_hazards(project_id)

        # Step 4: 计算综合风险等级
        overall_risk = self._calculate_overall_risk(spi, cpi, compliance_rate)

        # Step 5: 识别关键风险
        key_risks = self._identify_key_risks(
            delayed_tasks, overbudget_items, hazards
        )

        # Step 6: 生成行动项
        action_items = self._generate_action_items(key_risks)

        # Step 7: 调用 RAG 获取 AI 建议
        ai_suggestions = await self._get_ai_suggestions(
            project_id, key_risks, overall_risk
        )

        # Step 8: 构造进度部分
        progress_section = ProgressSection(
            spi=spi,
            planned_progress=progress_data['planned_progress'],
            actual_progress=progress_data['actual_progress'],
            delayed_tasks=delayed_tasks,
            critical_path_status=progress_data['critical_path_status']
        )

        # Step 9: 构造成本部分
        cost_section = CostSection(
            cpi=cpi,
            budget=cost_data['budget'],
            actual_cost=cost_data['actual_cost'],
            cost_variance=cost_data['variance'],
            overbudget_items=overbudget_items
        )

        # Step 10: 构造安全部分
        safety_section = SafetySection(
            compliance_rate=compliance_rate,
            total_inspections=safety_data['total_inspections'],
            passed_inspections=safety_data['passed_inspections'],
            hazards=hazards
        )

        # Step 11: 组装完整周报
        report = WeeklyReport(
            project_id=project_id,
            report_date=datetime.now().strftime('%Y-%m-%d'),
            progress=progress_section,
            cost=cost_section,
            safety=safety_section,
            overall_risk_level=overall_risk,
            key_risks=key_risks,
            action_items=action_items,
            ai_suggestions=ai_suggestions
        )

        return report

    def _calculate_overall_risk(self, spi: float, cpi: float,
                               compliance_rate: float) -> str:
        """综合风险评估"""
        risk_score = 0

        # 进度风险
        if spi < 0.85:
            risk_score += 3
        elif spi < 0.95:
            risk_score += 1

        # 成本风险
        if cpi < 0.85:
            risk_score += 3
        elif cpi < 0.95:
            risk_score += 1

        # 安全风险
        if compliance_rate < 0.85:
            risk_score += 3
        elif compliance_rate < 0.95:
            risk_score += 1

        # 风险等级判定
        if risk_score >= 5:
            return "red"
        elif risk_score >= 2:
            return "yellow"
        else:
            return "green"

    async def _get_ai_suggestions(self, project_id: str,
                                 key_risks: List[Dict],
                                 risk_level: str) -> List[str]:
        """调用 RAG 获取改进建议"""
        # 构造查询
        query = f"""
        项目风险等级：{risk_level}
        关键风险：{', '.join([r['description'] for r in key_risks])}

        请提供针对性的改进建议。
        """

        # 调用 RAG
        rag_result = await self.rag_tool.query(query, top_k=3)

        # 提取建议
        suggestions = []
        for source in rag_result['sources']:
            suggestions.append(source['content'])

        return suggestions
```

### 6.3 成本分析 Agent（`agents/cost_agent.py`）

**核心指标：CPI（Cost Performance Index）**：

```text
CPI = 挣值（EV） / 实际成本（AC）

其中：
- 挣值 = 预算 × 实际进度百分比
- CPI > 1.0：成本节约
- CPI = 1.0：成本符合预算
- CPI < 1.0：成本超支
```

**代码实现**：

```python
class CostAgent:
    def __init__(self, db: Session):
        self.db = db
        self.cost_tools = get_cost_tools(db)

    def analyze_cost(self, project_id: str) -> Dict[str, Any]:
        """成本分析"""
        # 1. 获取成本概览
        overview = self.cost_tools.get_cost_overview(project_id)

        # 2. 计算 CPI
        budget = overview['budget']
        actual_cost = overview['actual_cost']
        progress_rate = overview['progress_rate']

        earned_value = budget * (progress_rate / 100)
        cpi = earned_value / actual_cost if actual_cost > 0 else 0

        # 3. 风险等级判定
        if cpi >= 1.05:
            risk_level = "green"
            risk_desc = "成本节约，表现优秀"
        elif cpi >= 0.95:
            risk_level = "green"
            risk_desc = "成本符合预算"
        elif cpi >= 0.85:
            risk_level = "yellow"
            risk_desc = "轻微超支，需关注"
        else:
            risk_level = "red"
            risk_desc = "严重超支，需立即干预"

        # 4. 识别超支项
        overbudget_items = self.cost_tools.get_overbudget_items(project_id)

        # 5. 趋势分析
        trend = self.cost_tools.get_cost_trend(project_id, days=30)

        return {
            'cpi': round(cpi, 2),
            'earned_value': round(earned_value, 2),
            'actual_cost': round(actual_cost, 2),
            'variance': round(earned_value - actual_cost, 2),
            'risk_level': risk_level,
            'risk_description': risk_desc,
            'overbudget_items': overbudget_items,
            'trend': trend
        }
```

### 6.4 进度分析 Agent（`agents/progress_agent.py`）

**核心指标：SPI（Schedule Performance Index）**：

```text
SPI = 实际进度 / 计划进度

- SPI > 1.0：进度超前
- SPI = 1.0：进度符合计划
- SPI < 1.0：进度延误
```

**代码实现**：

```python
class ProgressAgent:
    def __init__(self, db: Session):
        self.db = db
        self.progress_tools = get_progress_tools(db)

    def analyze_progress(self, project_id: str) -> Dict[str, Any]:
        """进度分析"""
        # 1. 获取进度概览
        overview = self.progress_tools.get_progress_overview(project_id)

        # 2. 计算 SPI
        planned_progress = overview['planned_progress']
        actual_progress = overview['actual_progress']

        spi = actual_progress / planned_progress if planned_progress > 0 else 0

        # 3. 风险等级判定
        if spi >= 1.05:
            risk_level = "green"
            risk_desc = "进度超前"
        elif spi >= 0.95:
            risk_level = "green"
            risk_desc = "进度正常"
        elif spi >= 0.85:
            risk_level = "yellow"
            risk_desc = "轻微延误"
        else:
            risk_level = "red"
            risk_desc = "严重延误"

        # 4. 识别延期任务
        delayed_tasks = self.progress_tools.get_delayed_tasks(project_id)

        # 5. 关键路径分析
        critical_path = self.progress_tools.get_critical_path_status(project_id)

        return {
            'spi': round(spi, 2),
            'planned_progress': round(planned_progress, 2),
            'actual_progress': round(actual_progress, 2),
            'variance': round(actual_progress - planned_progress, 2),
            'risk_level': risk_level,
            'risk_description': risk_desc,
            'delayed_tasks': delayed_tasks,
            'critical_path_status': critical_path
        }
```

### 6.5 安全分析 Agent（`agents/safety_agent.py`）

**核心指标：合格率**：

```text
合格率 = 通过检查数 / 总检查数 × 100%
```

**代码实现**：

```python
class SafetyAgent:
    def __init__(self, db: Session):
        self.db = db
        self.safety_tools = get_safety_tools(db)

    def analyze_safety(self, project_id: str) -> Dict[str, Any]:
        """安全分析"""
        # 1. 获取安全概览
        overview = self.safety_tools.get_safety_overview(project_id)

        # 2. 计算合格率
        total_inspections = overview['total_inspections']
        passed_inspections = overview['passed_inspections']

        compliance_rate = (passed_inspections / total_inspections * 100
                          if total_inspections > 0 else 0)

        # 3. 风险等级判定
        if compliance_rate >= 95:
            risk_level = "green"
            risk_desc = "安全状况良好"
        elif compliance_rate >= 85:
            risk_level = "yellow"
            risk_desc = "存在安全隐患"
        else:
            risk_level = "red"
            risk_desc = "安全风险严重"

        # 4. 获取活跃隐患
        hazards = self.safety_tools.get_active_hazards(project_id)

        # 5. 隐患分类统计
        hazard_stats = self.safety_tools.get_hazard_statistics(project_id)

        return {
            'compliance_rate': round(compliance_rate, 2),
            'total_inspections': total_inspections,
            'passed_inspections': passed_inspections,
            'failed_inspections': total_inspections - passed_inspections,
            'risk_level': risk_level,
            'risk_description': risk_desc,
            'active_hazards': hazards,
            'hazard_statistics': hazard_stats
        }
```

### 6.6 风险评估 Agent（`agents/risk_agent.py`）

**综合风险评估逻辑**：

```python
class RiskAgent:
    def __init__(self, db: Session):
        self.db = db
        self.progress_agent = ProgressAgent(db)
        self.cost_agent = CostAgent(db)
        self.safety_agent = SafetyAgent(db)

    def assess_risk(self, project_id: str) -> Dict[str, Any]:
        """综合风险评估"""
        # 1. 获取各维度分析结果
        progress_analysis = self.progress_agent.analyze_progress(project_id)
        cost_analysis = self.cost_agent.analyze_cost(project_id)
        safety_analysis = self.safety_agent.analyze_safety(project_id)

        # 2. 计算综合风险分数
        risk_score = 0

        # 进度风险权重：30%
        if progress_analysis['risk_level'] == 'red':
            risk_score += 30
        elif progress_analysis['risk_level'] == 'yellow':
            risk_score += 15

        # 成本风险权重：30%
        if cost_analysis['risk_level'] == 'red':
            risk_score += 30
        elif cost_analysis['risk_level'] == 'yellow':
            risk_score += 15

        # 安全风险权重：40%（安全最重要）
        if safety_analysis['risk_level'] == 'red':
            risk_score += 40
        elif safety_analysis['risk_level'] == 'yellow':
            risk_score += 20

        # 3. 综合风险等级
        if risk_score >= 50:
            overall_risk = "red"
            overall_desc = "项目风险严重，需立即干预"
        elif risk_score >= 20:
            overall_risk = "yellow"
            overall_desc = "项目存在风险，需密切关注"
        else:
            overall_risk = "green"
            overall_desc = "项目风险可控"

        # 4. 识别关键风险
        key_risks = []

        if progress_analysis['risk_level'] in ['red', 'yellow']:
            key_risks.append({
                'category': '进度风险',
                'level': progress_analysis['risk_level'],
                'description': progress_analysis['risk_description'],
                'details': progress_analysis['delayed_tasks']
            })

        if cost_analysis['risk_level'] in ['red', 'yellow']:
            key_risks.append({
                'category': '成本风险',
                'level': cost_analysis['risk_level'],
                'description': cost_analysis['risk_description'],
                'details': cost_analysis['overbudget_items']
            })

        if safety_analysis['risk_level'] in ['red', 'yellow']:
            key_risks.append({
                'category': '安全风险',
                'level': safety_analysis['risk_level'],
                'description': safety_analysis['risk_description'],
                'details': safety_analysis['active_hazards']
            })

        return {
            'overall_risk_level': overall_risk,
            'overall_risk_score': risk_score,
            'overall_description': overall_desc,
            'key_risks': key_risks,
            'progress_analysis': progress_analysis,
            'cost_analysis': cost_analysis,
            'safety_analysis': safety_analysis
        }
```

---

## 七、工具层设计（25个专业工具）

### 7.1 工具层架构

```text
┌─────────────────────────────────────────────────────────┐
│                    工具层（Tools Layer）                  │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────┐│
│  │  成本工具（8个）  │  │  进度工具（8个）  │  │ 安全工具││
│  │                  │  │                  │  │ （9个） ││
│  │ • CPI 计算       │  │ • SPI 计算       │  │ • 合格率││
│  │ • 超支识别       │  │ • 延期识别       │  │ • 隐患  ││
│  │ • 成本预测       │  │ • 关键路径       │  │ • 统计  ││
│  │ • 对标分析       │  │ • 进度预测       │  │ • 分析  ││
│  └──────────────────┘  └──────────────────┘  └────────┘│
└─────────────────────────────────────────────────────────┘
```

### 7.2 成本工具（`tools/cost_tools.py`）

**8 个工具函数**：

1. `get_cost_overview` - 成本概览（CPI、预算消耗率）
2. `get_cost_by_category` - 按类别统计（材料/人工/机械/分包）
3. `identify_cost_overruns` - 识别超支项
4. `predict_final_cost` - 预测最终成本（EAC）
5. `compare_with_benchmark` - 对标历史项目
6. `analyze_cost_trend` - 成本趋势分析
7. `identify_cost_risks` - 识别成本风险
8. `get_cost_control_suggestions` - 生成控制建议

**核心工具代码示例**：

```python
class CostTools:
    """成本分析工具集"""

    def __init__(self, db: Session):
        self.db = db

    def get_cost_overview(self, project_id: str) -> Dict[str, Any]:
        """
        工具1: 获取成本概览

        CPI计算公式:
            CPI = 挣值 / 实际成本
            挣值 = 总预算 × (进度率 / 100)
        """
        project = ProjectService.get_project(self.db, project_id)
        costs = CostService.get_costs_by_project(self.db, project_id)

        # 1. 计算总成本
        total_planned = sum(float(c.planned_amount or 0) for c in costs)
        total_actual = sum(float(c.actual_amount or 0) for c in costs)

        # 2. 计算偏差
        variance = total_actual - total_planned
        variance_rate = (variance / total_planned * 100) if total_planned > 0 else 0

        # 3. 计算预算消耗率
        budget = float(project.total_budget or 0)
        budget_usage_rate = (total_actual / budget * 100) if budget > 0 else 0

        # 4. 计算CPI (Cost Performance Index)
        progress_rate = project.progress_rate
        earned_value = budget * (progress_rate / 100) if budget > 0 else 0
        cpi = (earned_value / total_actual) if total_actual > 0 else 0

        # 5. 风险等级判定
        if cpi >= 1.05:
            risk_level, risk_desc = "green", "成本控制良好，低于预算"
        elif cpi >= 0.95:
            risk_level, risk_desc = "green", "成本基本符合预算"
        elif cpi >= 0.85:
            risk_level, risk_desc = "yellow", "成本有超支风险，需关注"
        else:
            risk_level, risk_desc = "red", "成本严重超支，需立即采取措施"

        return {
            "project_id": project_id,
            "total_budget": budget,
            "total_actual": total_actual,
            "variance": variance,
            "variance_rate": round(variance_rate, 2),
            "budget_usage_rate": round(budget_usage_rate, 2),
            "progress_rate": progress_rate,
            "earned_value": earned_value,
            "cpi": round(cpi, 3),
            "risk_level": risk_level,
            "risk_description": risk_desc
        }

    def get_cost_by_category(self, project_id: str) -> Dict[str, Any]:
        """
        工具2: 按类别统计成本

        分析四大类别成本：材料、人工、机械、分包
        """
        costs = CostService.get_costs_by_project(self.db, project_id)

        category_stats = {}
        categories = ["材料", "人工", "机械", "分包"]

        for category in categories:
            cat_costs = [c for c in costs if c.cost_category == category]

            if cat_costs:
                planned = sum(float(c.planned_amount or 0) for c in cat_costs)
                actual = sum(float(c.actual_amount or 0) for c in cat_costs)
                variance = actual - planned
                variance_rate = (variance / planned * 100) if planned > 0 else 0

                category_stats[category] = {
                    "planned": planned,
                    "actual": actual,
                    "variance": variance,
                    "variance_rate": round(variance_rate, 2),
                    "count": len(cat_costs),
                    "status": "超支" if variance > 0 else "正常"
                }

        return {
            "project_id": project_id,
            "category_stats": category_stats
        }

    def predict_final_cost(self, project_id: str) -> Dict[str, Any]:
        """
        工具4: 预测最终成本（EAC）

        EAC计算公式:
            EAC = 实际成本 + (预算 - 挣值) / CPI
        """
        overview = self.get_cost_overview(project_id)

        budget = overview['total_budget']
        actual_cost = overview['total_actual']
        earned_value = overview['earned_value']
        cpi = overview['cpi']

        # 计算 EAC (Estimate at Completion)
        if cpi > 0:
            eac = actual_cost + (budget - earned_value) / cpi
        else:
            eac = budget  # 无法预测时使用预算值

        # 预测超支金额
        predicted_overrun = eac - budget
        predicted_overrun_rate = (predicted_overrun / budget * 100) if budget > 0 else 0

        return {
            "project_id": project_id,
            "current_actual_cost": actual_cost,
            "total_budget": budget,
            "predicted_final_cost": round(eac, 2),
            "predicted_overrun": round(predicted_overrun, 2),
            "predicted_overrun_rate": round(predicted_overrun_rate, 2),
            "cpi": cpi
        }
```

### 7.3 进度工具（`tools/progress_tools.py`）

**8 个工具函数**：

1. `get_progress_overview` - 进度概览（SPI、完成率）
2. `get_delayed_tasks` - 获取延期任务
3. `get_critical_path_status` - 关键路径状态
4. `predict_completion_date` - 预测完工日期
5. `analyze_progress_trend` - 进度趋势分析
6. `identify_progress_risks` - 识别进度风险
7. `get_milestone_status` - 里程碑状态
8. `get_progress_suggestions` - 生成进度建议

**核心工具代码示例**：

```python
class ProgressTools:
    """进度分析工具集"""

    def __init__(self, db: Session):
        self.db = db

    def get_progress_overview(self, project_id: str) -> Dict[str, Any]:
        """
        工具1: 获取进度概览

        SPI计算公式:
            SPI = 实际进度 / 计划进度
        """
        project = ProjectService.get_project(self.db, project_id)
        tasks = TaskService.get_tasks_by_project(self.db, project_id)

        # 1. 计算计划进度
        today = date.today()
        total_days = (project.end_date - project.start_date).days
        elapsed_days = (today - project.start_date).days
        planned_progress = (elapsed_days / total_days * 100) if total_days > 0 else 0

        # 2. 获取实际进度
        actual_progress = project.progress_rate

        # 3. 计算SPI (Schedule Performance Index)
        spi = (actual_progress / planned_progress) if planned_progress > 0 else 0

        # 4. 风险等级判定
        if spi >= 1.05:
            risk_level, risk_desc = "green", "进度超前"
        elif spi >= 0.95:
            risk_level, risk_desc = "green", "进度正常"
        elif spi >= 0.85:
            risk_level, risk_desc = "yellow", "进度轻微延误"
        else:
            risk_level, risk_desc = "red", "进度严重延误"

        return {
            "project_id": project_id,
            "planned_progress": round(planned_progress, 2),
            "actual_progress": round(actual_progress, 2),
            "variance": round(actual_progress - planned_progress, 2),
            "spi": round(spi, 3),
            "risk_level": risk_level,
            "risk_description": risk_desc,
            "total_tasks": len(tasks),
            "completed_tasks": len([t for t in tasks if t.status == "已完成"])
        }

    def get_delayed_tasks(self, project_id: str) -> List[Dict]:
        """
        工具2: 获取延期任务
        """
        tasks = TaskService.get_tasks_by_project(self.db, project_id)
        today = date.today()

        delayed_tasks = []
        for task in tasks:
            if task.status != "已完成" and task.planned_end_date < today:
                delay_days = (today - task.planned_end_date).days
                delayed_tasks.append({
                    "task_id": task.task_id,
                    "task_name": task.task_name,
                    "planned_end_date": task.planned_end_date.isoformat(),
                    "delay_days": delay_days,
                    "responsible_person": task.responsible_person,
                    "progress": task.progress_rate
                })

        # 按延期天数排序
        delayed_tasks.sort(key=lambda x: x['delay_days'], reverse=True)

        return delayed_tasks

    def predict_completion_date(self, project_id: str) -> Dict[str, Any]:
        """
        工具4: 预测完工日期

        预测公式:
            预测工期 = 计划工期 / SPI
        """
        project = ProjectService.get_project(self.db, project_id)
        overview = self.get_progress_overview(project_id)

        spi = overview['spi']
        planned_duration = (project.end_date - project.start_date).days

        # 预测总工期
        if spi > 0:
            predicted_duration = planned_duration / spi
        else:
            predicted_duration = planned_duration

        # 预测完工日期
        predicted_end_date = project.start_date + timedelta(days=int(predicted_duration))

        # 预测延期天数
        delay_days = (predicted_end_date - project.end_date).days

        return {
            "project_id": project_id,
            "planned_end_date": project.end_date.isoformat(),
            "predicted_end_date": predicted_end_date.isoformat(),
            "predicted_delay_days": delay_days,
            "spi": spi
        }
```

### 7.4 安全工具（`tools/safety_tools.py`）

**9 个工具函数**：

1. `get_safety_overview` - 安全概览（合格率、隐患数）
2. `get_active_hazards` - 获取活跃隐患
3. `get_hazard_statistics` - 隐患分类统计
4. `analyze_safety_trend` - 安全趋势分析
5. `identify_safety_risks` - 识别安全风险
6. `get_inspection_records` - 获取检查记录
7. `get_rectification_status` - 整改状态
8. `get_safety_training_status` - 培训状态
9. `get_safety_suggestions` - 生成安全建议

**核心工具代码示例**：

```python
class SafetyTools:
    """安全分析工具集"""

    def __init__(self, db: Session):
        self.db = db

    def get_safety_overview(self, project_id: str) -> Dict[str, Any]:
        """
        工具1: 获取安全概览

        合格率计算:
            合格率 = 通过检查数 / 总检查数 × 100%
        """
        records = SafetyService.get_safety_records(self.db, project_id)

        # 1. 计算检查统计
        total_inspections = len(records)
        passed_inspections = len([r for r in records if r.inspection_result == "合格"])
        failed_inspections = total_inspections - passed_inspections

        # 2. 计算合格率
        compliance_rate = (passed_inspections / total_inspections * 100
                          if total_inspections > 0 else 0)

        # 3. 风险等级判定
        if compliance_rate >= 95:
            risk_level, risk_desc = "green", "安全状况良好"
        elif compliance_rate >= 85:
            risk_level, risk_desc = "yellow", "存在安全隐患，需加强管理"
        else:
            risk_level, risk_desc = "red", "安全风险严重，需立即整改"

        # 4. 统计隐患数量
        active_hazards = len([r for r in records
                             if r.inspection_result == "不合格"
                             and r.rectification_status != "已整改"])

        return {
            "project_id": project_id,
            "total_inspections": total_inspections,
            "passed_inspections": passed_inspections,
            "failed_inspections": failed_inspections,
            "compliance_rate": round(compliance_rate, 2),
            "active_hazards": active_hazards,
            "risk_level": risk_level,
            "risk_description": risk_desc
        }

    def get_active_hazards(self, project_id: str) -> List[Dict]:
        """
        工具2: 获取活跃隐患
        """
        records = SafetyService.get_safety_records(self.db, project_id)

        hazards = []
        for record in records:
            if (record.inspection_result == "不合格"
                and record.rectification_status != "已整改"):

                hazards.append({
                    "record_id": record.record_id,
                    "inspection_date": record.inspection_date.isoformat(),
                    "inspection_item": record.inspection_item,
                    "hazard_description": record.hazard_description,
                    "hazard_level": record.hazard_level,
                    "rectification_status": record.rectification_status,
                    "responsible_person": record.responsible_person
                })

        # 按隐患等级排序（高 > 中 > 低）
        level_order = {"高": 0, "中": 1, "低": 2}
        hazards.sort(key=lambda x: level_order.get(x['hazard_level'], 3))

        return hazards

    def get_hazard_statistics(self, project_id: str) -> Dict[str, Any]:
        """
        工具3: 隐患分类统计
        """
        records = SafetyService.get_safety_records(self.db, project_id)

        # 按隐患等级统计
        level_stats = {"高": 0, "中": 0, "低": 0}
        for record in records:
            if record.inspection_result == "不合格":
                level = record.hazard_level
                if level in level_stats:
                    level_stats[level] += 1

        # 按整改状态统计
        rectification_stats = {
            "未整改": 0,
            "整改中": 0,
            "已整改": 0
        }
        for record in records:
            if record.inspection_result == "不合格":
                status = record.rectification_status
                if status in rectification_stats:
                    rectification_stats[status] += 1

        return {
            "project_id": project_id,
            "hazard_level_stats": level_stats,
            "rectification_stats": rectification_stats
        }
```

### 7.5 工具层设计原则

**1. 单一职责**：

- 每个工具函数只做一件事
- 成本工具不涉及进度计算
- 进度工具不涉及安全分析

**2. 可组合性**：

- Agent 可以自由组合多个工具
- 周报 Agent 调用所有三类工具
- 成本 Agent 只调用成本工具

**3. 数据驱动**：

- 所有计算基于数据库数据
- 不依赖外部 API
- 结果可复现

**4. 风险分级**：

- 统一的风险等级：green/yellow/red
- 统一的阈值标准
- 便于综合评估

---

## 八、三路检索源码拆解（BM25 + Vector + Graph）

### 8.1 BM25 检索引擎（`services/retrieval/bm25/bm25_engine.py`）

**核心特点**：

- 基于 TF-IDF 改进，考虑文档长度归一化
- 使用 jieba 分词
- 适合精确匹配、专业术语（如"GB50009-2012"、"KL-1"）

**关键参数**：

- `k1=1.5`：词频饱和参数
- `b=0.75`：长度归一化参数

### 8.2 Vector 检索引擎（`services/retrieval/vector/vector_engine.py`）

**核心特点**：

- 使用 BGE-M3 模型（768 维向量）
- Milvus 使用 HNSW 索引
- 适合语义理解、同义词（"混凝土强度" ≈ "砼标号"）

**检索参数**：

- `metric_type="IP"`：内积相似度
- `ef=64`：HNSW 搜索参数

### 8.3 Graph 检索引擎（`services/retrieval/graph/graph_retriever.py`）

**核心特点**：

- 从查询中提取实体（如"KL-1"）
- 在 Neo4j 中查找实体及其关系
- 返回结构化知识（`KL-1 -[USES_MATERIAL]-> C30`）

**Cypher 查询示例**：

```cypher
MATCH (n)-[r]->(m)
WHERE n.name CONTAINS $entity OR m.name CONTAINS $entity
RETURN n.name AS source, type(r) AS relation,
       m.name AS target
LIMIT $limit
```

### 8.4 RRF 融合算法（`services/retrieval/hybrid/hybrid_retriever.py`）

**RRF 公式**：

```text
RRF(d) = Σ [ 1 / (k + rank_i(d)) ]

其中：
- d: 文档
- rank_i(d): 文档 d 在第 i 个检索器中的排名
- k: 常数（默认 60）
```

**优势**：

- 分数无关：不需要归一化不同检索器的分数
- 排名融合：只关注排名，不关心具体分数
- 鲁棒性强：对异常分数不敏感

---

## 九、数据模型与存储设计

### 9.1 核心数据模型（`models/`）

**Document 模型**（`models/document.py`）：

```python
class Document(Base):
    __tablename__ = "documents"

    doc_id = Column(String(50), primary_key=True)
    title = Column(String(200))
    content = Column(Text)
    doc_type = Column(String(50))  # 施工图/规范/合同
    upload_time = Column(DateTime)
    file_path = Column(String(500))
```

**DocumentChunk 模型**：

```python
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    chunk_id = Column(String(50), primary_key=True)
    doc_id = Column(String(50), ForeignKey("documents.doc_id"))
    content = Column(Text)
    chunk_index = Column(Integer)
    token_count = Column(Integer)
```

**Project 模型**（`models/project.py`）：

```python
class ProjectBasic(Base):
    __tablename__ = "project_basic"

    project_id = Column(String(50), primary_key=True)
    project_name = Column(String(200))
    total_budget = Column(Numeric(15, 2))
    progress_rate = Column(Numeric(5, 2))
    start_date = Column(Date)
    end_date = Column(Date)
```

### 9.2 存储架构

```text
┌─────────────────────────────────────────────────────────┐
│                    存储层架构                             │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ PostgreSQL   │  │   Milvus     │  │   Neo4j      │  │
│  │              │  │              │  │              │  │
│  │ • 元数据     │  │ • 向量索引   │  │ • 知识图谱   │  │
│  │ • 项目数据   │  │ • HNSW       │  │ • 实体关系   │  │
│  │ • 用户数据   │  │ • 768维向量  │  │ • Cypher查询 │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐                                       │
│  │    Redis     │                                       │
│  │              │                                       │
│  │ • 查询缓存   │                                       │
│  │ • 会话管理   │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 十、配置、启动脚本、健康检查

### 10.1 配置中心（`core/config.py`）

**核心配置项**：

```python
class Settings:
    # 数据库配置
    POSTGRES_HOST = "localhost"
    POSTGRES_PORT = 5432
    POSTGRES_DB = "enterprise_rag"

    # Milvus 配置
    MILVUS_HOST = "localhost"
    MILVUS_PORT = 19530

    # Neo4j 配置
    NEO4J_URI = "bolt://localhost:7687"

    # Redis 配置
    REDIS_HOST = "localhost"
    REDIS_PORT = 6379

    # LLM 配置
    LLM_API_KEY = os.getenv("LLM_API_KEY")
    LLM_BASE_URL = "https://api.openai.com/v1"
    LLM_MODEL = "gpt-4"

    # 向量模型配置
    EMBEDDING_MODEL = "BAAI/bge-m3"
    RERANKER_MODEL = "BAAI/bge-reranker-base"
```

### 10.2 Docker Compose 部署（`docker/docker-compose.yml`）

**核心服务**：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: enterprise_rag
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password

  milvus:
    image: milvusdb/milvus:latest
    ports:
      - "19530:19530"

  neo4j:
    image: neo4j:5.9
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/password

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - milvus
      - neo4j
      - redis
```

### 10.3 初始化脚本

**数据库初始化**（`scripts/init_db.py`）：

```bash
python scripts/init_db.py
```

**Milvus 集合创建**（`scripts/init_milvus.py`）：

```bash
python scripts/init_milvus.py
```

**文档批量导入**（`scripts/ingest_docs.py`）：

```bash
python scripts/ingest_docs.py --data_dir ./data/documents
```

---

## 十一、面向新手的完整实操步骤（含命令、入口、产物、排错）

### 11.1 第 0 步：环境准备

```bash
# 克隆仓库
git clone https://github.com/kerro99920/Enterprise_RAG.git
cd Enterprise_RAG

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 11.2 第 1 步：启动基础设施

```bash
# 启动 Docker 服务
cd docker
docker-compose up -d

# 检查服务状态
docker-compose ps
```

**期望输出**：

```text
postgres   Up   5432/tcp
milvus     Up   19530/tcp
neo4j      Up   7474/tcp, 7687/tcp
redis      Up   6379/tcp
```

### 11.3 第 2 步：初始化数据库

```bash
# 创建 PostgreSQL 表结构
python scripts/init_db.py

# 创建 Milvus 集合
python scripts/init_milvus.py
```

**期望产物**：

- PostgreSQL 中创建了 `documents`、`document_chunks`、`projects` 等表
- Milvus 中创建了 `document_chunks` 集合（768 维向量）

### 11.4 第 3 步：导入文档

```bash
# 批量导入文档
python scripts/ingest_docs.py --data_dir ./data/documents

# 查看导入结果
python scripts/check_data.py
```

**期望产物**：

- 文档被解析、分块、向量化
- 数据写入 PostgreSQL + Milvus
- 实体关系写入 Neo4j

### 11.5 第 4 步：启动 API 服务

```bash
# 启动 FastAPI 服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**期望输出**：

```text
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 11.6 第 5 步：测试 RAG 问答

**方式 1：API 测试**：

```bash
curl -X POST http://localhost:8000/api/v1/qa/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "KL-1 梁使用什么混凝土材料？",
    "top_k": 5
  }'
```

**方式 2：Web 界面**：

访问 `http://localhost:8000/docs`，使用 Swagger UI 测试。

**期望响应**：

```json
{
  "query": "KL-1 梁使用什么混凝土材料？",
  "answer": "根据施工图说明，KL-1 梁使用 C30 混凝土。",
  "sources": [
    {
      "content": "KL-1 混凝土强度等级为 C30",
      "score": 0.95,
      "source": "graph"
    }
  ]
}
```

### 11.7 第 6 步：测试 Agent 功能

**生成周报**：

```bash
curl -X POST http://localhost:8000/api/v1/agents/weekly-report \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "P001"
  }'
```

**期望响应**：

```json
{
  "project_id": "P001",
  "report_date": "2026-04-16",
  "progress": {
    "spi": 0.92,
    "planned_progress": 65.0,
    "actual_progress": 60.0,
    "delayed_tasks": [...]
  },
  "cost": {
    "cpi": 0.88,
    "budget": 10000000,
    "actual_cost": 7500000,
    "overbudget_items": [...]
  },
  "safety": {
    "compliance_rate": 92.5,
    "active_hazards": [...]
  },
  "overall_risk_level": "yellow",
  "ai_suggestions": [...]
}
```

### 11.8 常见报错与排查

**1. Milvus 连接失败**：

```text
错误：MilvusException: <MilvusException: (code=1, message=Fail connecting to server)>
排查：docker-compose ps 检查 Milvus 是否启动
解决：docker-compose restart milvus
```

**2. Neo4j 连接失败**：

```text
错误：ServiceUnavailable: Unable to retrieve routing information
排查：检查 Neo4j 是否启动，端口 7687 是否开放
解决：docker-compose restart neo4j
```

**3. 向量模型加载失败**：

```text
错误：OSError: Can't load tokenizer for 'BAAI/bge-m3'
排查：检查网络连接，模型是否下载
解决：手动下载模型到 ./models/ 目录
```

**4. LLM API 调用失败**：

```text
错误：AuthenticationError: Invalid API key
排查：检查 .env 文件中的 LLM_API_KEY
解决：export LLM_API_KEY="your-api-key"
```

---

## 十二、工程点评与改进建议

### 12.1 优点

**1. 架构设计清晰**：

- 分层明确：API → Business → Service → Infrastructure
- 职责分离：RAG、Agent、Tool 各司其职
- 易于扩展：新增 Agent 或工具不影响现有功能

**2. 技术选型合理**：

- 三路检索融合：覆盖关键词、语义、结构化知识
- 懒加载初始化：加快应用启动速度
- 优雅降级：Reranker 或 Neo4j 失败不影响核心功能

**3. 工程化完善**：

- Docker Compose 一键部署
- 完整的初始化脚本
- 详细的技术文档

**4. 业务价值明确**：

- 面向建筑行业的实际需求
- Agent 提供专业分析（CPI、SPI、合格率）
- RAG 提供可溯源的知识问答

### 12.2 当前局限

**1. 实体识别简化**：

- 当前使用正则表达式提取实体（如 `[A-Z]{2}-\d+`）
- 建议：引入 NER 模型（如 BERT-NER）提升准确率

**2. 图谱构建依赖人工**：

- 实体和关系需要预先定义
- 建议：引入自动化图谱构建（如 OpenIE）

**3. 缺少用户反馈机制**：

- 无法收集用户对答案的评价
- 建议：增加点赞/点踩功能，用于模型优化

**4. 缺少多轮对话支持**：

- 当前是单轮问答
- 建议：增加会话管理，支持上下文追问

### 12.3 建议的下一步优化

**短期优化（1-2 周）**：

1. 增加用户反馈接口（点赞/点踩）
2. 优化 Prompt 模板（减少幻觉）
3. 增加查询日志分析（识别高频问题）

**中期优化（1-2 月）**：

1. 引入 NER 模型提升实体识别
2. 增加多轮对话支持
3. 优化 Rerank 模型（微调 BGE-Reranker）

**长期优化（3-6 月）**：

1. 自动化图谱构建
2. 引入强化学习优化检索策略
3. 支持多模态（图片、CAD 图纸）

---

## 结语

Enterprise_RAG 的价值不只是"做了个问答系统"，而是给出了一个**企业级 RAG + Agent 系统的完整落地方案**：

- **RAG 层**：三路检索融合 + Rerank + LLM 生成
- **Agent 层**：5 个专业 Agent + 25 个工具函数
- **存储层**：PostgreSQL + Milvus + Neo4j + Redis
- **工程层**：Docker Compose + 完整测试 + 优雅降级

如果你准备从"单模型调用"走向"可部署的 AI 应用后端"，这个项目很适合作为第一份可拆解模板。

**本文覆盖了完整训练链路的核心代码和关键逻辑**，提供了新手可执行的实操步骤和排错指南，建立了代码索引，方便对照 GitHub 深入学习。

如果你想从"会调 API"跨到"能看懂并改 RAG 系统"，这个项目是很好的跳板。

