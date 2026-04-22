# Gemini Briefing

## 项目是什么

Atoms 是一个本地优先的 AI app-building workspace。

目标用户流是：

1. 用户创建一个新项目。
2. 新项目的 workspace 应该接近空白，不应预置一整套模板代码。
3. 用户在聊天框里提出实现需求。
4. SWE / engineer agent 先写 `draft_plan`，等待用户批准。
5. 批准后，agent 必须先写实现计划，再写 `docs/todo.md`，然后才允许开始实现。
6. 实现过程中的文件变化需要实时同步到右侧编辑器。
7. 实现结束后，sandbox 内的前后端需要启动，App Viewer / Preview 能在本地正常访问。

当前仓库既包含产品代码，也包含一部分设计文档和实验性改动。

## 关键目录

- `app/backend`
  - FastAPI 后端
  - 负责项目、agent run、sandbox runtime、preview session、realtime 事件流
- `app/frontend`
  - Vite + React + TypeScript 前端
  - 负责聊天面板、文件树/编辑器、Workspace 状态、App Preview UI
- `docker/atoms-sandbox`
  - per-project sandbox 镜像与启动脚本
  - `start-dev` / `start-preview` 会在容器里拉起 preview 服务
- `docs`
  - 产品 spec、设计文档、修复计划、handoff 文档
- `docs/app-preview-spec.md`
  - 这次 app review / app preview 优化的核心参考文档

## 目前最关键的后端文件

- `app/backend/services/engineer_runtime.py`
  - SWE agent 编排主入口
  - prompt、工具装配、workspace runtime 约束、preview manifest 引导都在这里
- `app/backend/services/approval_gate.py`
  - draft plan / implementation plan / todo gate
  - 现在已经实现：没有 `docs/todo.md` 时，不允许真正进入实现写入
- `app/backend/services/agent_task_store.py`
  - 持久化 task/todo 到数据库
- `app/backend/openmanus_runtime/tool/todo_write.py`
  - `todo_write` 工具定义
  - 会写 `docs/todo.md`，并同步 task store
- `app/backend/routers/workspace_runtime.py`
  - workspace runtime ensure、preview session、ready 检查
- `app/backend/services/preview_sessions.py`
  - preview session key、过期时间、URL 生成

## 目前最关键的前端文件

- `app/frontend/src/contexts/WorkspaceContext.tsx`
  - workspace realtime 状态中心
- `app/frontend/src/pages/ProjectWorkspace.tsx`
  - 聊天、编辑器、preview 主页面
- `app/frontend/src/components/ChatPanel.tsx`
  - 用户和 agent 交互入口
- `app/frontend/src/lib/workspaceRuntime.ts`
  - frontend 调用 backend runtime / preview 的接口封装

## 当前已经做过的关键修复

1. 修复 preview sandbox launcher 对 `/workspace/app/frontend` 目录结构的兼容性。
2. 修复 preview session 过期后仍复用 stale session 的问题。
3. 修复 `start-preview` 失败时仍把 runtime 标记为 running 的问题。
4. 修复 readiness probe 在容器内误用 host-mapped port 的问题。
5. 把 `todo_write` 从“建议步骤”提升为硬 gate：
   - plan 写完后，允许只读探索
   - 但不允许真实实现写入
   - 直到 agent 成功调用 `todo_write`

## 当前仍然存在的核心问题

最大的未解决问题不是 preview，而是 agent completion discipline 不够强。

现在系统已经能保证：

- agent 先写 plan
- plan 通过后先写 `docs/todo.md`
- 然后才开始 implement

但系统还不能保证：

- `docs/todo.md` 里的所有任务都完成后 agent 才能结束
- agent 在结束前必须跑过至少一个有效验证步骤
- agent 不会在“主文件刚写完但验证/收尾未做完”的情况下提前 self-terminate

换句话说，现在是“有开工 gate”，但缺少“收工 gate”。

## 可对比的参考

本地参考代码：

- `~/Documents/learn/learn-claude-code/agents/s03_todo_write.py`
  - 优点：轻量、清晰，有 nag reminder，会逼 agent 持续更新 todo
  - 缺点：没有真正的硬 gate，也没有 completion gate
- `~/Documents/learn/learn-claude-code/agents/s07_task_system.py`
  - 优点：task 持久化到 `.tasks/`，支持依赖关系 `blockedBy`
  - 缺点：同样没有“todo 全做完前不能结束”的机制

官方开源 Codex 也值得参考：

- 仓库：<https://github.com/openai/codex>
- 本机已 clone 到：`/tmp/openai-codex`
- 已看到的公开线索：
  - SDK 有 `todo_list` item 类型
  - app protocol 有 `plan` / `TurnPlanUpdatedNotification`
  - 说明它至少在协议层把 plan/todo 当成一等事件处理

## 你接手时最值得先看的问题

1. 我们是否应该新增一个 completion gate？
   - 如果 `docs/todo.md` 里还有 `pending` 或 `in_progress`，agent 不能结束
   - 如果这轮没有跑任何验证命令，agent 也不能结束
2. 这个 gate 应该挂在哪一层最稳？
   - `engineer_runtime` 的 run completion
   - tool/event 层
   - 或 approval/task-store 侧的状态机
3. 是否要引入 reminder / nag 机制？
   - 类似 s03：几轮不更新 todo 就提醒 agent
4. 是否要把 task dependency 做得更强？
   - 类似 s07：由 task graph 驱动 next-step，而不是纯 prompt 约束

## 建议起手顺序

1. 先读 `engineer_runtime.py`、`approval_gate.py`、`todo_write.py`、`agent_task_store.py`
2. 再看 `workspace_runtime.py` 和 preview 相关逻辑，确认 preview 现状
3. 对照 `learn-claude-code` 的 s03 / s07，看哪些机制值得引入
4. 最后再看 `/tmp/openai-codex` 里 plan/todo 的协议设计，判断是否有可借鉴的状态建模

## 当前目标

短期目标不是继续堆 prompt，而是把 agent 从“会开工”推进到“会完整收工”。

重点是：

- 不提前结束
- todo 和实现进度保持一致
- 结束前有最基本的验证证据
- preview 和 app review 链路稳定可用
