---
title: "Travel_Agent2Agent 全栈源码拆解：A2A + MCP 多 Agent 旅行系统从架构到落地"
date: 2026-04-15
categories: ["技术"]
tags: ["A2A", "MCP", "Multi-Agent", "Python", "LangChain", "Streamlit", "MySQL"]
description: "按源码逐层拆解 Travel_Agent2Agent：A2A 协议、MCP 数据服务、Weather/Ticket/Order 三类 Agent、SQL 与订单链路、启动与排障，附新手可执行步骤。"
---

> 这篇文章基于项目 A2A 的完整源码阅读整理。
>
> 参考仓库：`https://github.com/kerro99920/Travel_Agent2Agent`
>
> 覆盖范围说明：
> - 不是逐行罗列仓库每一行代码。
> - 但覆盖了完整主链路：入口层（CLI/Web）→ 意图识别 → A2A Agent → MCP 工具 → MySQL。
> - 重点是让新手知道“先看什么、怎么跑、每一步产物是什么、出错怎么查”。

---

## 目录

1. 项目定位与一句话结论
2. 新手先看：文件结构与阅读顺序
3. 整体架构：A2A + MCP 是怎么协作的
4. 双入口层：CLI 与 Streamlit Web
5. 意图识别与 Prompt 体系
6. Agent 层源码拆解（Weather / Ticket / Order）
7. MCP 层源码拆解（Weather / Ticket / Order）
8. 数据库与订单事务链路
9. 配置、启动脚本、健康检查与测试
10. 面向新手的完整实操步骤（含命令、入口、产物、排错）
11. 工程点评与改进建议

---

## 一、项目定位与一句话结论

Travel_Agent2Agent（文档中也叫 SmartVoyage）是一个典型的**多 Agent 协同业务系统**：

- 前端入口支持 CLI + Streamlit
- 中间层按业务拆成 3 个 Agent：天气、票务、订票
- 数据服务层拆成 3 个 MCP 服务
- 落地到 MySQL 表（天气、票务、订单）

一句话总结：**它不是“单模型聊天机器人”，而是“协议驱动的可拆分业务系统模板”。**

---

## 二、新手先看：文件结构与阅读顺序

### 2.1 文件结构（学习版）

```text
Travel_Agent2Agent/
├── README.md
├── requirements.txt
├── docs/
│   ├── 技术设计文档.md
│   └── API接口文档.md
├── sql/
│   └── init_database.sql
├── scripts/
│   ├── start_services.sh
│   └── health_check.py
├── src/
│   ├── main.py                  # CLI入口
│   ├── app.py                   # Streamlit入口
│   ├── config/settings.py       # 全局配置
│   ├── prompts/templates.py     # 所有 Prompt 模板
│   ├── agents/
│   │   ├── base_agent.py        # Agent基类 + MCP调用Mixin
│   │   ├── weather_agent.py
│   │   ├── ticket_agent.py
│   │   └── order_agent.py
│   ├── mcp_servers/
│   │   ├── base_service.py      # 数据库通用执行层
│   │   ├── weather_mcp.py
│   │   ├── ticket_mcp.py
│   │   └── order_mcp.py
│   └── utils/validators.py
└── tests/
    ├── test_agents.py
    └── test_validators.py
```

### 2.2 推荐阅读顺序（不迷路）

1. `README.md`：先看系统边界和端口。
2. `src/main.py`：理解完整请求主流程。
3. `src/prompts/templates.py`：理解意图识别与 SQL 生成怎么做。
4. `src/agents/*.py`：理解业务编排。
5. `src/mcp_servers/*.py`：理解数据访问和工具暴露。
6. `sql/init_database.sql`：理解最终数据模型。
7. `scripts/start_services.sh` + `health_check.py`：理解工程化运维路径。

---

## 三、整体架构：A2A + MCP 是怎么协作的

### 3.1 A2A 是什么（完整解读）

**A2A（Agent-to-Agent）** 是 Google 提出的 AI Agent 间通信协议，用于解决”不同 Agent 如何发现彼此、如何协作、如何交换任务和结果”的标准化问题。

#### 为什么需要 A2A

在企业内部和跨组织场景中，AI Agent 正在快速增长：

- **企业内部**：业务系统拆分出天气 Agent、订单 Agent、客服 Agent 等，它们需要相互调用
- **对外服务**：Agent 供应商希望其他 Agent 能发现并使用自己的服务（类似 SEO）

A2A 提供了统一的”发现 → 调用 → 协作”机制，避免每个系统都自己造轮子。

#### A2A 的四大核心能力

1. **能力发现（AgentCard）**
   每个 Agent 在 `https://<host>/.well-known/agent.json` 公开自己的”名片”，包含：
   - 能力列表（skills）
   - 认证方式（OAuth2/JWT）
   - 输入输出模式（text/image/video）

2. **任务管理（Task）**
   支持短期和长期任务的状态同步：
   - `submitted` → `working` → `completed`
   - 或 `input_required`（需补充信息）、`failed`（失败）
   - 通过 `sessionId` 关联多轮对话

3. **协作通信（Message）**
   Agent 之间通过 Message 传递：
   - 用户上下文
   - 执行指令
   - 错误信息
   - 思考过程

4. **用户体验协商**
   Client Agent 可以要求 Server Agent 返回特定格式（如”返回视频而非文本”）。

#### A2A 的技术基础

A2A 没有重新发明轮子，而是基于成熟标准：

- **HTTP + SSE**：通信协议，支持流式响应
- **JSON-RPC 2.0**：消息格式
- **OpenAPI 认证规范**：身份验证（令牌通过 HTTP 头传递）

#### A2A 核心实体

| 实体 | 作用 |
|------|------|
| **AgentCard** | Agent 的”名片”，描述能力、认证、技能列表 |
| **Task** | 任务实体，有唯一 ID 和状态，由 Client 创建、Server 维护 |
| **Message** | Agent 间通信载体（不含最终结果） |
| **Artifact** | 任务执行结果（不可变、可命名、支持流式追加） |
| **Part** | Message 和 Artifact 的基本单元（text/file/data） |

#### A2A 典型工作流程

```text
1. Server Agent 托管 AgentCard（/.well-known/agent.json）
2. Client Agent 发现并获取 AgentCard
3. Client Agent 发起 Task（tasks/send）
4. Client Agent 设置回调监听（可选，用于长任务）
5. Server Agent 执行任务，返回 Artifact
6. Client Agent 查询 Task 获取最终结果（tasks/get）
```

#### 在本项目中的体现

本项目的 A2A 实现是简化版，核心体现在：

- **AgentCard**：每个 Agent 在 `/.well-known/agent.json` 暴露能力
- **Task 状态**：`completed`、`input_required`、`failed`
- **JSON-RPC 消息**：`method: “tasks/send”`、`params.message`、`result.state`

这让不同职责的 Agent 能稳定协作：

- 天气 Agent 只负责天气能力
- 票务 Agent 只负责查票能力
- 订票 Agent 负责下单编排
- 入口层（CLI/Web）只负责接收用户请求并路由

协议化约束带来的好处：

1. **可替换**：某个 Agent 可以独立重写，只要协议不变就能接入
2. **可扩展**：后续新增”酒店 Agent””景点门票 Agent”时，不需要推翻原有入口
3. **可观测**：每次调用都有统一请求/响应结构，便于日志追踪和排障

### 3.2 A2A 和 MCP 的区别（最容易混淆）

一句话区分：

- **A2A**：Agent 和 Agent 之间的协作协议（业务编排层）
- **MCP**：Agent 调用工具/数据服务的协议（工具执行层）

在本项目中的典型链路是：

`用户 -> 入口 -> A2A Agent -> MCP 工具 -> MySQL`

所以它们不是竞争关系，而是上下游关系：

- A2A 负责“任务分发与协作”
- MCP 负责“具体能力执行与数据访问”

可以把它理解成：**A2A 是调度层，MCP 是执行层。**

可以把它理解成三层调用链：

1. **入口层（UI/CLI）**：收用户自然语言输入。
2. **Agent 层（A2A）**：识别意图并决定调用哪个业务 Agent。
3. **MCP 层（工具）**：执行具体查询/下单逻辑，读写 MySQL。

核心协议分工：

- **A2A（Agent-to-Agent）**：Agent 之间的任务请求/响应协议（JSON-RPC 风格）
- **MCP（Model Context Protocol）**：模型或 Agent 调用“工具”的协议层

这套结构的价值：

- Agent 专注“语义理解 + 业务编排”
- MCP 专注“数据操作 + 工具能力”
- 更容易拆分、测试、替换和扩展

---

## 四、双入口层：CLI 与 Streamlit Web

### 4.1 CLI 主入口（`src/main.py`）

`SmartVoyageCLI` 初始化时做了三件事：

```python
self.agent_network = AgentNetwork(name="SmartVoyage Network")
self.agent_network.add("WeatherQueryAssistant", config.agents.weather_url)
self.agent_network.add("TicketQueryAssistant", config.agents.ticket_url)
self.agent_network.add("TicketOrderAssistant", config.agents.order_url)

self.llm = ChatOpenAI(...)
```

也就是：

- 建立 Agent 网络路由表
- 建立 LLM 客户端（用于意图识别/总结）
- 维护会话历史 `conversation_history`

主处理逻辑在 `process_input()`：

1. 调 `recognize_intent()` 得到 intents
2. attraction 直接本地 LLM 生成推荐
3. 其他意图用 `call_agent()` 异步发给对应 A2A Agent
4. 天气和票务结果再做总结（`summarize_response`）
5. 合并多意图结果返回

### 4.2 Web 入口（`src/app.py`）

Web 版和 CLI 版的核心业务逻辑基本一致，只是界面不同：

- 用 `st.session_state` 存会话和网络对象
- 用 `st.chat_input` + `st.chat_message` 展示对话
- 侧边栏展示 Agent 在线状态与快捷提示

这说明这个项目已经把“业务逻辑”和“表现层”做了基本解耦。

---

## 五、意图识别与 Prompt 体系

Prompt 集中在 `src/prompts/templates.py`，这是全项目最关键的一层抽象。

### 5.1 意图识别 Prompt

`intent_recognition()` 要求 LLM 返回固定 JSON：

```json
{
  "intents": ["weather", "train"],
  "user_queries": {
    "weather": "...",
    "train": "..."
  },
  "follow_up_message": ""
}
```

这比“返回自然语言”可靠很多，因为程序可以直接按字段路由。

### 5.2 SQL 生成 Prompt

项目给 train/flight/concert 分别提供 SQL 生成模板（也有 weather 的 SQL Prompt）。

优点：

- 模板里明确了表结构、规则、必要字段
- 缺信息时要求输出 `input_required`，避免瞎查

风险点（后面会再讲）：

- 让 LLM 直接生成 SQL，再透传执行，需更强约束/白名单校验

---

## 六、Agent 层源码拆解（Weather / Ticket / Order）

## 6.1 BaseAgent（`src/agents/base_agent.py`）

所有 Agent 的共性都放在基类里：

- LLM 初始化
- 用户输入提取 `extract_user_input`
- 响应构造 `success_response/error_response/input_required_response`
- 统一 `handle_task` 抽象接口

另外 `MCPClientMixin` 封装了 MCP 调用：

```python
async with streamablehttp_client(mcp_url) as (read, write, _):
    async with ClientSession(read, write) as session:
        await session.initialize()
        result = await session.call_tool(tool_name, params)
```

这层抽象让业务 Agent 不需要重复写 MCP 连接细节。

## 6.2 Weather Agent（`src/agents/weather_agent.py`）

处理流程非常清晰：

1. `generate_sql(user_query)`：LLM 生成 SQL 或追问
2. 若 `input_required` 直接返回追问
3. 否则调用 Weather MCP：

```python
mcp_result = await self.call_mcp_tool(self.mcp_url, "query_weather", {"sql": sql})
```

4. `format_weather_results` 格式化成用户可读文本

这个 Agent 的亮点是格式化做得比较完整（图标、温度、湿度、风向、温馨提示）。

## 6.3 Ticket Agent（`src/agents/ticket_agent.py`）

核心是“一份 Prompt 处理三类票务”并带 `type`：

- train → `train_tickets`
- flight → `flight_tickets`
- concert → `concert_tickets`

LLM 输出约定：

- 第一行是 `{"type":"train|flight|concert"}`
- 第二行是 SQL

然后统一调用 `query_tickets` 工具执行并格式化输出。

## 6.4 Order Agent（`src/agents/order_agent.py`）

这是最体现“Agent 协作”的模块：

1. `parse_intent` 解析订票信息
2. 如果缺联系人等，返回 `input_required`
3. 如果给了 ticket_id，直接下单
4. 否则先调 Ticket Agent 查余票
5. 从票务结果中提取 `票务ID`
6. 单一候选自动下单，多候选要求用户指定
7. 调 Order MCP `create_order`

这就是典型的“Agent 编排 Agent + 工具”的业务流。

---

## 七、MCP 层源码拆解（Weather / Ticket / Order）

## 7.1 基础数据库层（`src/mcp_servers/base_service.py`）

`DatabaseService` 统一处理：

- 连接管理
- 查询执行 `execute_query`
- 插入/更新 `execute_insert` / `execute_update`
- 日期、Decimal JSON 编码

这层把所有 MCP 的 DB 样板代码抽走了。

## 7.2 Weather MCP（`src/mcp_servers/weather_mcp.py`）

暴露一个工具：

```python
@mcp.tool()
def query_weather(sql: str) -> str:
    return weather_service.query_weather(sql)
```

## 7.3 Ticket MCP（`src/mcp_servers/ticket_mcp.py`）

暴露四个工具：

- `query_tickets(sql)`：通用 SQL
- `query_train_tickets(...)`
- `query_flight_tickets(...)`
- `query_concert_tickets(...)`

注意：后面三个内部仍是字符串拼接 SQL，工程上建议改参数化。

## 7.4 Order MCP（`src/mcp_servers/order_mcp.py`）

订单服务逻辑比较完整：

- `generate_order_no()` 订单号生成
- `get_ticket_info()` 查票务
- `update_remaining_seats()` 扣减/回滚库存
- `create_order()` 下单主逻辑
- `cancel_order()` 取消并回滚库存

`create_order()` 核心路径：

1. 校验票务存在
2. 校验余票充足
3. 扣库存
4. 插入订单
5. 插入失败则回滚库存

---

## 八、数据库与订单事务链路

## 8.1 表结构总览（`sql/init_database.sql`）

核心表：

- `weather_data`
- `train_tickets`
- `flight_tickets`
- `concert_tickets`
- `orders`
- `system_config`

订单表字段比较完整，包含：

- `order_no` 唯一
- `ticket_type + ticket_id` 关联票务
- `status`（pending/paid/cancelled/refunded/completed）

## 8.2 订单链路（业务视角）

```text
用户订票请求
  -> Order Agent 解析意图
  -> Ticket Agent 查余票（若无 ticket_id）
  -> Order MCP create_order
      -> 查票务
      -> 校验余票
      -> 扣库存
      -> 写 orders
      -> 返回 order_no
```

## 8.3 新手要注意的事务问题

目前“扣库存 + 写订单”虽然有回滚逻辑，但仍建议后续增强为：

- 显式事务包裹
- 行级锁/乐观锁
- 防并发超卖策略

---

## 九、配置、启动脚本、健康检查与测试

## 9.1 配置模块（`src/config/settings.py`）

项目用 dataclass 把配置分层：

- `LLMConfig`
- `DatabaseConfig`
- `AgentConfig`
- `MCPConfig`
- `ExternalAPIConfig`
- `LogConfig`

并通过 `.env` 覆盖默认值，这种组织方式很适合中小型后端项目。

## 9.2 一键启动脚本（`scripts/start_services.sh`）

脚本按层启动：

1. MCP（8000/8001/8002）
2. Agent（5005/5006/5007）
3. Streamlit（8501）

同时写 PID 和日志，支持 `start|stop|restart|status`。

## 9.3 健康检查（`scripts/health_check.py`）

会检测：

- MCP 服务可达性
- Agent 卡片接口可达性
- Web 可达性
- 数据库连接

适合本地联调和部署后巡检。

## 9.4 测试（`tests/`）

- `test_agents.py`：集成测试（需要服务先启动）
- `test_validators.py`：纯单元测试

新手建议：先跑 `test_validators.py` 再跑集成测试。

---

## 十、面向新手的完整实操步骤（含命令、入口、产物、排错）

下面是“能直接跑起来”的最短路径。

### 10.1 第 0 步：克隆与安装

```bash
git clone https://github.com/kerro99920/Travel_Agent2Agent.git
cd Travel_Agent2Agent
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
```

### 10.2 第 1 步：配置环境变量

在项目根目录准备 `.env`，至少保证：

- `LLM_API_KEY`
- `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`
- Agent/MCP 端口默认可先不改

### 10.3 第 2 步：初始化数据库

```bash
mysql -u root -p < sql/init_database.sql
```

检查是否成功建表：

```sql
USE travel_rag;
SHOW TABLES;
```

### 10.4 第 3 步：启动全服务

```bash
bash scripts/start_services.sh start
```

你应该看到端口：

- Agent: 5005 / 5006 / 5007
- MCP: 8000 / 8001 / 8002
- Web: 8501

### 10.5 第 4 步：健康检查

```bash
python scripts/health_check.py
```

期望：全部 ✅。

### 10.6 第 5 步：功能验证（最小闭环）

#### A. 天气查询

```bash
curl -X POST http://localhost:5005/a2a -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0",
  "method":"tasks/send",
  "params":{"message":{"role":"user","content":"北京明天天气怎么样"}},
  "id":"demo-1"
}'
```

#### B. 票务查询

```bash
curl -X POST http://localhost:5006/a2a -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0",
  "method":"tasks/send",
  "params":{"message":{"role":"user","content":"查询明天北京到上海的高铁票"}},
  "id":"demo-2"
}'
```

#### C. 订票

```bash
curl -X POST http://localhost:5007/a2a -H "Content-Type: application/json" -d '{
  "jsonrpc":"2.0",
  "method":"tasks/send",
  "params":{"message":{"role":"user","content":"订一张明天北京到上海的高铁票，二等座，张三，13800138000"}},
  "id":"demo-3"
}'
```

### 10.7 第 6 步：测试验证

```bash
pytest tests/test_validators.py -v
pytest tests/test_agents.py -v
```

说明：`test_agents.py` 依赖服务启动，否则会失败。

### 10.8 常见报错与排查

1. **Agent/MCP 连接失败**
   - 先跑 `python scripts/health_check.py` 看具体挂在哪个端口。

2. **数据库连接失败**
   - 检查 `.env` 的 DB 参数与 MySQL 服务状态。

3. **LLM 调用失败**
   - 检查 `LLM_API_KEY`、`LLM_BASE_URL`。

4. **查询返回 input_required**
   - 不是错误，表示信息不完整，需要补充城市/日期/联系人。

---

## 十一、工程点评与改进建议

## 11.1 优点

1. **分层清晰**：入口、Agent、MCP、DB 职责明确。
2. **协议化设计**：A2A 与 MCP 分工明确，便于扩展。
3. **可观测性不错**：有启动脚本、健康检查、测试。
4. **对新手友好**：流程完整，能从 0 跑出结果。

## 11.2 当前风险点

1. **SQL 安全风险**：多处字符串拼接 SQL，存在注入面。
2. **并发下单风险**：库存扣减与订单创建需更强事务保护。
3. **LLM 输出稳定性**：JSON/SQL 输出异常时需要更强兜底。

## 11.3 建议的下一步优化

1. 全面改为参数化查询 + SQL 白名单。
2. 订单链路改成数据库事务 + 锁。
3. 给 Prompt 输出增加 schema 校验和重试策略。
4. 给 Agent 增加 tracing（请求ID贯穿 A2A/MCP/DB）。

---

## 结语

Travel_Agent2Agent 的价值不只是“做了个旅行助手”，而是给出了一个**多 Agent 业务系统的可落地骨架**：

- 用 A2A 做业务协作
- 用 MCP 做工具调用
- 用 SQL/订单模型承接真实业务

如果你准备从“单模型调用”走向“可部署的 AI 应用后端”，这个项目很适合作为第一份可拆解模板。