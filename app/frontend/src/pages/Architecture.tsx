import Navbar from "@/components/Navbar";
import {
  Database,
  Globe,
  Server,
  Shield,
  Cpu,
  GitBranch,
  Layers,
  Cloud,
  Bot,
  Code2,
  Workflow,
  HardDrive,
  Clock,
  Users,
  MousePointer,
  MessageSquare,
  FileCode,
  Eye,
  Terminal,
  ArrowRight,
  ArrowDown,
  Repeat,
  Sparkles,
  Upload,
  Download,
  Share2,
  Settings,
  Palette,
  LayoutGrid,
} from "lucide-react";

export default function ArchitecturePage() {
  const techStack = [
    {
      category: "Frontend",
      color: "from-[#3B82F6] to-[#60A5FA]",
      items: [
        { name: "React 18+", desc: "UI Framework with Hooks & Concurrent Mode" },
        { name: "TypeScript", desc: "Type-safe development" },
        { name: "Vite", desc: "Fast build tool & dev server" },
        { name: "Tailwind CSS", desc: "Utility-first CSS framework" },
        { name: "shadcn/ui", desc: "Accessible component library" },
        { name: "React Router", desc: "Client-side routing" },
      ],
    },
    {
      category: "Backend",
      color: "from-[#22C55E] to-[#4ADE80]",
      items: [
        { name: "Node.js / Deno", desc: "Server runtime for edge functions" },
        { name: "FastAPI (Python)", desc: "High-performance API framework" },
        { name: "PostgreSQL", desc: "Primary relational database" },
        { name: "Redis", desc: "Caching & session management" },
        { name: "S3-compatible Storage", desc: "Object storage for files" },
        { name: "WebSocket", desc: "Real-time communication" },
      ],
    },
    {
      category: "AI / Agent Layer",
      color: "from-[#7C3AED] to-[#A855F7]",
      items: [
        { name: "Multi-Agent Framework", desc: "MetaGPT-based agent orchestration" },
        { name: "Claude / GPT / Gemini", desc: "Multiple LLM provider support" },
        { name: "DeepSeek / Qwen", desc: "Cost-effective model options" },
        { name: "RAG Pipeline", desc: "Context-aware code generation" },
        { name: "Code Sandbox", desc: "Isolated execution environment" },
        { name: "Tool Use / Function Calling", desc: "Agent capability extension" },
      ],
    },
    {
      category: "Infrastructure",
      color: "from-[#F59E0B] to-[#FBBF24]",
      items: [
        { name: "Docker / K8s", desc: "Container orchestration" },
        { name: "Global CDN", desc: "Edge content delivery" },
        { name: "CI/CD Pipeline", desc: "Automated build & deploy" },
        { name: "SSL / TLS", desc: "End-to-end encryption" },
        { name: "Monitoring & Logging", desc: "Observability stack" },
        { name: "Auto-scaling", desc: "Dynamic resource allocation" },
      ],
    },
  ];

  const modules = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Auth Module",
      desc: "User registration, login, OAuth (Google, GitHub), session management, JWT tokens, RBAC permissions",
      effort: "3-4 weeks",
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "Project Management",
      desc: "Project CRUD, version control, file system management, collaboration, sharing & permissions",
      effort: "4-5 weeks",
    },
    {
      icon: <Bot className="w-6 h-6" />,
      title: "AI Agent Orchestration",
      desc: "Multi-agent coordination (Engineer, PM, Designer, Analyst), task planning, context management, tool use",
      effort: "8-12 weeks",
    },
    {
      icon: <Code2 className="w-6 h-6" />,
      title: "Code Sandbox",
      desc: "Isolated execution environment, file system emulation, package management, build pipeline, live preview",
      effort: "6-8 weeks",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Deployment Pipeline",
      desc: "One-click deploy, custom domains, SSL provisioning, CDN distribution, rollback support",
      effort: "4-5 weeks",
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Atoms Cloud (BaaS)",
      desc: "Database management, file storage, edge functions, auth integration, API generation",
      effort: "6-8 weeks",
    },
    {
      icon: <Cpu className="w-6 h-6" />,
      title: "LLM Gateway",
      desc: "Multi-model routing (Claude, GPT, Gemini, DeepSeek, Qwen), rate limiting, cost optimization, fallback",
      effort: "3-4 weeks",
    },
    {
      icon: <HardDrive className="w-6 h-6" />,
      title: "Real-time Collaboration",
      desc: "WebSocket-based live updates, cursor sharing, conflict resolution, chat synchronization",
      effort: "4-6 weeks",
    },
  ];

  const roadmap = [
    {
      phase: "Phase 1",
      title: "Foundation",
      duration: "Month 1-2",
      items: [
        "Auth system (registration, login, OAuth)",
        "Project management (CRUD, file system)",
        "Basic UI shell (chat, editor, preview layout)",
        "Single LLM integration",
      ],
    },
    {
      phase: "Phase 2",
      title: "Core AI",
      duration: "Month 3-5",
      items: [
        "Multi-agent framework setup",
        "Code generation pipeline",
        "Code sandbox & live preview",
        "Multi-LLM gateway",
      ],
    },
    {
      phase: "Phase 3",
      title: "Platform",
      duration: "Month 6-8",
      items: [
        "Deployment pipeline",
        "Atoms Cloud (BaaS)",
        "Custom domains & SSL",
        "Billing & subscriptions",
      ],
    },
    {
      phase: "Phase 4",
      title: "Scale",
      duration: "Month 9-12",
      items: [
        "Real-time collaboration",
        "Race mode (parallel LLM)",
        "Enterprise features",
        "Community & marketplace",
      ],
    },
  ];

  const dbTables = [
    { name: "users", columns: "id, email, name, avatar, plan, created_at" },
    {
      name: "projects",
      columns: "id, user_id, name, description, status, visibility, created_at",
    },
    {
      name: "project_files",
      columns: "id, project_id, path, content, type, updated_at",
    },
    {
      name: "conversations",
      columns: "id, project_id, user_id, model, created_at",
    },
    {
      name: "messages",
      columns: "id, conversation_id, role, content, tokens, created_at",
    },
    {
      name: "deployments",
      columns: "id, project_id, url, domain, status, created_at",
    },
    {
      name: "subscriptions",
      columns: "id, user_id, plan, credits, period_start, period_end",
    },
    {
      name: "credit_usage",
      columns: "id, user_id, amount, action, model, created_at",
    },
  ];

  // Frontend interaction flows
  const interactionFlows = [
    {
      title: "核心交互流程：从需求到产品",
      icon: <Workflow className="w-5 h-5" />,
      steps: [
        {
          step: "1. 用户输入需求",
          detail: "用户在左侧 Chat 面板的输入框中描述需求（支持文本、图片上传、文件附件）",
          tech: "React State + WebSocket 实时发送",
        },
        {
          step: "2. Agent 接收 & 规划",
          detail: "后端 Agent Orchestrator 解析需求，分配给对应 Agent（Engineer/PM/Designer），生成任务计划",
          tech: "SSE (Server-Sent Events) 流式返回规划结果",
        },
        {
          step: "3. 用户确认计划",
          detail: "Chat 面板显示 draft_plan，用户可选择 Approve / Update / 修改具体任务",
          tech: "交互式消息组件 + 按钮回调",
        },
        {
          step: "4. Agent 执行开发",
          detail: "Agent 实时生成代码，右侧 Editor 面板同步显示文件变更，Terminal 显示命令执行",
          tech: "WebSocket 双向通信 + 文件系统 diff 推送",
        },
        {
          step: "5. 实时预览",
          detail: "App Viewer 面板通过 iframe 加载 dev server，代码变更后自动 HMR 热更新",
          tech: "Vite HMR + iframe postMessage 通信",
        },
        {
          step: "6. 一键部署",
          detail: "用户点击 Publish 按钮，触发 build → upload → CDN 分发流程",
          tech: "REST API + 异步任务队列 + 进度条 WebSocket 推送",
        },
      ],
    },
  ];

  const panelInteractions = [
    {
      panel: "Chat 面板",
      icon: <MessageSquare className="w-5 h-5" />,
      color: "from-[#3B82F6] to-[#60A5FA]",
      interactions: [
        {
          action: "发送消息",
          trigger: "Enter 键 / 点击发送按钮",
          behavior: "消息通过 WebSocket 发送到后端，SSE 流式接收 Agent 回复，逐字渲染",
          state: "messages[], isStreaming, currentAgent",
        },
        {
          action: "上传文件/图片",
          trigger: "点击 +Add 按钮 / 拖拽 / 粘贴",
          behavior: "文件上传到 Object Storage，返回 URL 附加到消息中，图片支持预览",
          state: "attachments[], uploadProgress",
        },
        {
          action: "模式切换",
          trigger: "点击 Engineer Mode / Team Mode 切换按钮",
          behavior: "Engineer Mode 仅激活 Alex Agent；Team Mode 多 Agent 协作",
          state: "mode: 'engineer' | 'team'",
        },
        {
          action: "选择 LLM 模型",
          trigger: "点击模型选择下拉菜单",
          behavior: "切换底层 LLM（Claude/GPT/Gemini/DeepSeek/Qwen），影响后续所有 Agent 调用",
          state: "selectedModel",
        },
        {
          action: "Remix（版本分支）",
          trigger: "点击消息旁的 Remix 图标",
          behavior: "从当前版本创建分支，保留上下文，新开一个对话线程",
          state: "versions[], currentVersionId",
        },
        {
          action: "Bug Fix",
          trigger: "左下角 Bug Report 弹窗 → Fix All",
          behavior: "收集 build/lint 错误信息，自动发送给 Agent 修复",
          state: "bugs[], isFixing",
        },
      ],
    },
    {
      panel: "Editor 面板",
      icon: <FileCode className="w-5 h-5" />,
      color: "from-[#22C55E] to-[#4ADE80]",
      interactions: [
        {
          action: "文件树浏览",
          trigger: "点击左侧文件树的文件夹/文件",
          behavior: "展开/折叠目录，点击文件在编辑区打开，支持多 Tab",
          state: "fileTree, openFiles[], activeFileId",
        },
        {
          action: "代码编辑",
          trigger: "直接在编辑区修改代码",
          behavior: "Monaco Editor 提供语法高亮、自动补全、错误提示，修改后自动保存并触发 HMR",
          state: "fileContent, isDirty, cursorPosition",
        },
        {
          action: "Agent 实时写入",
          trigger: "Agent 执行代码生成时自动触发",
          behavior: "WebSocket 推送 file diff，编辑器实时高亮显示变更行（绿色新增/红色删除）",
          state: "pendingChanges[], highlightedLines",
        },
        {
          action: "文件搜索",
          trigger: "Ctrl+P 快捷键",
          behavior: "模糊搜索文件名，快速跳转到目标文件",
          state: "searchQuery, searchResults[]",
        },
      ],
    },
    {
      panel: "App Viewer 面板",
      icon: <Eye className="w-5 h-5" />,
      color: "from-[#F59E0B] to-[#FBBF24]",
      interactions: [
        {
          action: "实时预览",
          trigger: "代码变更后自动刷新",
          behavior: "iframe 加载 Vite dev server (localhost:5173)，HMR 热更新无需手动刷新",
          state: "previewUrl, isLoading",
        },
        {
          action: "元素选择 & 替换",
          trigger: "开启 Inspect 模式 → 点击页面元素",
          behavior: "高亮选中元素，弹出操作面板：描述替换内容 → Agent 自动修改对应代码",
          state: "inspectMode, selectedElement, elementPath",
        },
        {
          action: "图片添加/替换",
          trigger: "Inspect 模式选中元素 → 点击 'Add or Exchange'",
          behavior: "打开图片选择器（上传/AI 生成/URL），替换选中元素的图片",
          state: "imagePickerOpen, targetElement",
        },
        {
          action: "发布部署",
          trigger: "点击 Publish 按钮",
          behavior: "弹出部署面板：可编辑 URL slug → 点击 Publish → 触发 build & deploy 流程",
          state: "publishUrl, deployStatus, deployProgress",
        },
        {
          action: "响应式预览",
          trigger: "切换设备尺寸按钮（Desktop/Tablet/Mobile）",
          behavior: "调整 iframe 宽度模拟不同设备，实时查看响应式效果",
          state: "viewportSize: 'desktop' | 'tablet' | 'mobile'",
        },
      ],
    },
    {
      panel: "Terminal 面板",
      icon: <Terminal className="w-5 h-5" />,
      color: "from-[#EF4444] to-[#F87171]",
      interactions: [
        {
          action: "命令执行显示",
          trigger: "Agent 执行 Terminal 命令时自动显示",
          behavior: "实时流式输出命令执行结果（pnpm install, lint, build 等），支持 ANSI 颜色",
          state: "terminalLines[], isRunning",
        },
        {
          action: "错误捕获",
          trigger: "命令执行失败时自动触发",
          behavior: "解析错误信息，高亮错误行，自动关联到 Bug Report 面板",
          state: "errors[], errorSource",
        },
        {
          action: "手动输入（可选）",
          trigger: "点击终端输入区域",
          behavior: "允许用户手动输入终端命令（受限于沙箱权限）",
          state: "inputBuffer, commandHistory[]",
        },
      ],
    },
  ];

  const stateManagement = [
    {
      category: "全局状态 (Zustand / Context)",
      items: [
        { key: "user", desc: "当前登录用户信息、plan、credits 余额" },
        { key: "project", desc: "当前项目 ID、名称、文件列表、部署状态" },
        { key: "conversation", desc: "当前对话 ID、消息列表、Agent 状态" },
        { key: "settings", desc: "选中的 LLM 模型、模式（Engineer/Team）、主题" },
      ],
    },
    {
      category: "面板状态 (Local State)",
      items: [
        { key: "chatState", desc: "输入内容、附件列表、流式接收状态、滚动位置" },
        { key: "editorState", desc: "打开的文件 Tab、当前文件内容、光标位置、diff 高亮" },
        { key: "previewState", desc: "预览 URL、Inspect 模式、选中元素、视口尺寸" },
        { key: "terminalState", desc: "输出行列表、运行状态、错误列表" },
      ],
    },
    {
      category: "实时通信 (WebSocket)",
      items: [
        { key: "agent:message", desc: "Agent 回复消息（SSE 流式）" },
        { key: "file:change", desc: "文件变更通知（path, diff, action）" },
        { key: "terminal:output", desc: "终端输出流（stdout, stderr）" },
        { key: "deploy:progress", desc: "部署进度更新（step, progress, status）" },
        { key: "preview:reload", desc: "预览刷新信号（HMR 或全量刷新）" },
      ],
    },
  ];

  const keyInteractionPatterns = [
    {
      title: "流式消息渲染",
      icon: <Sparkles className="w-5 h-5" />,
      desc: "Agent 回复通过 SSE 逐 token 返回，前端使用 requestAnimationFrame 批量更新 DOM，避免逐字重渲染导致的性能问题。Markdown 内容使用增量解析器实时渲染。",
      code: `// SSE 流式接收
const eventSource = new EventSource('/api/chat/stream');
eventSource.onmessage = (e) => {
  const chunk = JSON.parse(e.data);
  setMessages(prev => appendChunk(prev, chunk));
};`,
    },
    {
      title: "文件 Diff 同步",
      icon: <FileCode className="w-5 h-5" />,
      desc: "Agent 修改文件时，后端推送 unified diff 格式的变更。前端 Editor 使用 Monaco Editor 的 inline diff 功能高亮显示变更，用户可逐行 accept/reject。",
      code: `// WebSocket 文件变更
ws.on('file:change', ({ path, diff }) => {
  applyDiffToEditor(path, diff);
  highlightChangedLines(path, diff);
  triggerHMR(); // 通知 preview 刷新
});`,
    },
    {
      title: "Inspect 模式元素选择",
      icon: <MousePointer className="w-5 h-5" />,
      desc: "App Viewer 的 Inspect 模式通过 iframe postMessage 通信。鼠标悬停时高亮元素边界，点击后获取元素的 CSS selector 和对应的源码位置，发送给 Agent 进行修改。",
      code: `// iframe 内注入的 inspect 脚本
document.addEventListener('click', (e) => {
  const selector = getUniqueSelector(e.target);
  const sourceMap = getSourceLocation(selector);
  parent.postMessage({
    type: 'element-selected',
    selector, sourceMap, boundingRect
  }, '*');
});`,
    },
    {
      title: "版本管理 (Remix)",
      icon: <GitBranch className="w-5 h-5" />,
      desc: "每次 Agent 完成一轮开发后自动创建 snapshot。用户可通过 Remix 从任意 snapshot 创建分支，分支间共享基础代码但独立演化。类似 Git branch 但更轻量。",
      code: `// 创建版本分支
const remix = async (snapshotId) => {
  const branch = await api.createBranch({
    parentSnapshot: snapshotId,
    files: currentFiles,
    conversation: currentMessages
  });
  navigate(\`/project/\${branch.id}\`);
};`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-full px-4 py-1.5 mb-6">
            <Workflow className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-sm text-[#A855F7]">
              Architecture Document
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Platform{" "}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent">
              Architecture
            </span>
          </h1>
          <p className="text-[#A1A1AA] text-lg max-w-3xl mx-auto leading-relaxed">
            A comprehensive technical blueprint for building an AI-powered
            development platform like Atoms. This document covers system
            architecture, frontend interaction design, technology stack, core modules,
            database design, and a development roadmap.
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📑 目录</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {[
                "系统架构总览",
                "前端交互流程详解",
                "四大面板交互设计",
                "关键交互模式 & 代码示例",
                "状态管理架构",
                "技术栈",
                "核心模块 & 工作量估算",
                "数据库设计",
                "开发路线图",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-[#A1A1AA] text-sm hover:text-white cursor-pointer transition-colors"
                >
                  <span className="text-[#7C3AED] font-mono text-xs w-5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* System Architecture Diagram */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            1. 系统架构总览
          </h2>

          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-8 space-y-6">
            {/* Client Layer */}
            <div className="space-y-2">
              <div className="text-xs text-[#71717A] uppercase tracking-wider font-semibold">
                Client Layer — 用户界面
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: "Chat UI", desc: "对话交互" },
                  { name: "Code Editor", desc: "代码编辑" },
                  { name: "App Viewer", desc: "实时预览" },
                  { name: "Terminal", desc: "终端输出" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-lg p-3 text-center"
                  >
                    <div className="text-sm text-[#93C5FD]">{item.name}</div>
                    <div className="text-xs text-[#71717A] mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-1">
                <ArrowDown className="w-4 h-4 text-[#52525B]" />
                <span className="text-xs text-[#52525B]">WebSocket + REST + SSE</span>
                <ArrowDown className="w-4 h-4 text-[#52525B]" />
              </div>
            </div>

            {/* API Gateway */}
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg p-4 text-center">
              <div className="text-sm text-[#FCD34D] font-semibold">
                API Gateway / Load Balancer
              </div>
              <div className="text-xs text-[#71717A] mt-1">
                JWT Authentication · Rate Limiting · Request Routing · WebSocket Upgrade
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-px h-8 bg-[#27272A]" />
            </div>

            {/* Service Layer */}
            <div className="space-y-2">
              <div className="text-xs text-[#71717A] uppercase tracking-wider font-semibold">
                Service Layer — 微服务
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "Auth Service", desc: "认证授权" },
                  { name: "Project Service", desc: "项目管理" },
                  { name: "Agent Orchestrator", desc: "Agent 编排" },
                  { name: "Code Sandbox", desc: "代码沙箱" },
                  { name: "Deploy Service", desc: "部署服务" },
                  { name: "LLM Gateway", desc: "模型网关" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg p-3 text-center"
                  >
                    <div className="text-sm text-[#86EFAC]">{item.name}</div>
                    <div className="text-xs text-[#71717A] mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-px h-8 bg-[#27272A]" />
            </div>

            {/* AI Layer */}
            <div className="space-y-2">
              <div className="text-xs text-[#71717A] uppercase tracking-wider font-semibold">
                AI Agent Layer — 智能体
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { name: "Engineer", desc: "代码开发" },
                  { name: "PM", desc: "需求分析" },
                  { name: "Designer", desc: "UI 设计" },
                  { name: "Data Analyst", desc: "数据分析" },
                  { name: "SEO", desc: "内容优化" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg p-3 text-center"
                  >
                    <div className="text-sm text-[#C4B5FD]">{item.name}</div>
                    <div className="text-xs text-[#71717A] mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-px h-8 bg-[#27272A]" />
            </div>

            {/* Data Layer */}
            <div className="space-y-2">
              <div className="text-xs text-[#71717A] uppercase tracking-wider font-semibold">
                Data Layer — 数据存储
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: "PostgreSQL", desc: "关系数据" },
                  { name: "Redis", desc: "缓存/会话" },
                  { name: "Object Storage", desc: "文件存储" },
                  { name: "Vector DB", desc: "语义检索" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-3 text-center"
                  >
                    <div className="text-sm text-[#FCA5A5]">{item.name}</div>
                    <div className="text-xs text-[#71717A] mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frontend Interaction Flow */}
      <section className="py-16 px-6 bg-[#0D0D0F]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">
            2. 前端交互流程详解
          </h2>
          <p className="text-[#A1A1AA] text-center mb-12 max-w-3xl mx-auto">
            用户从输入需求到产品上线的完整交互链路，每一步都涉及前后端的实时通信
          </p>

          {interactionFlows.map((flow, fi) => (
            <div key={fi} className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7]">
                  {flow.icon}
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {flow.title}
                </h3>
              </div>

              <div className="relative">
                {/* Connection line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#7C3AED] via-[#A855F7] to-[#7C3AED]/20 hidden md:block" />

                <div className="space-y-6">
                  {flow.steps.map((step, si) => (
                    <div key={si} className="flex gap-6">
                      <div className="hidden md:flex flex-col items-center z-10">
                        <div className="w-3 h-3 rounded-full bg-[#7C3AED] border-4 border-[#0D0D0F]" />
                      </div>
                      <div className="flex-1 bg-[#18181B] border border-[#27272A] rounded-xl p-5 hover:border-[#7C3AED]/30 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-semibold">{step.step}</h4>
                          <span className="text-xs bg-[#27272A] text-[#A1A1AA] px-2 py-1 rounded font-mono">
                            {step.tech}
                          </span>
                        </div>
                        <p className="text-[#A1A1AA] text-sm">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Panel Interactions */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">
            3. 四大面板交互设计
          </h2>
          <p className="text-[#A1A1AA] text-center mb-12 max-w-3xl mx-auto">
            每个面板的用户操作、触发方式、交互行为和状态管理详解
          </p>

          <div className="space-y-8">
            {panelInteractions.map((panel, pi) => (
              <div
                key={pi}
                className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden"
              >
                {/* Panel Header */}
                <div className="p-6 border-b border-[#27272A]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${panel.color} bg-opacity-10 flex items-center justify-center text-white`}
                    >
                      {panel.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      {panel.panel}
                    </h3>
                    <span className="text-xs text-[#71717A] bg-[#27272A] px-2 py-1 rounded">
                      {panel.interactions.length} 个交互
                    </span>
                  </div>
                </div>

                {/* Interactions Table */}
                <div className="divide-y divide-[#27272A]">
                  {panel.interactions.map((interaction, ii) => (
                    <div key={ii} className="p-5 hover:bg-[#1a1a1e] transition-colors">
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-[#71717A] uppercase tracking-wider mb-1">
                            操作
                          </div>
                          <div className="text-white text-sm font-medium">
                            {interaction.action}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#71717A] uppercase tracking-wider mb-1">
                            触发方式
                          </div>
                          <div className="text-[#A1A1AA] text-sm">
                            {interaction.trigger}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#71717A] uppercase tracking-wider mb-1">
                            交互行为
                          </div>
                          <div className="text-[#A1A1AA] text-sm">
                            {interaction.behavior}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#71717A] uppercase tracking-wider mb-1">
                            状态
                          </div>
                          <div className="text-[#C084FC] text-xs font-mono bg-[#27272A] rounded px-2 py-1 inline-block">
                            {interaction.state}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Interaction Patterns */}
      <section className="py-16 px-6 bg-[#0D0D0F]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">
            4. 关键交互模式 & 代码示例
          </h2>
          <p className="text-[#A1A1AA] text-center mb-12 max-w-3xl mx-auto">
            实现 Atoms 级别交互体验的核心技术方案
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {keyInteractionPatterns.map((pattern, i) => (
              <div
                key={i}
                className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7]">
                      {pattern.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {pattern.title}
                    </h3>
                  </div>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed mb-4">
                    {pattern.desc}
                  </p>
                </div>
                <div className="bg-[#0D0D0F] border-t border-[#27272A] p-4">
                  <pre className="text-xs font-mono text-[#E4E4E7] overflow-x-auto whitespace-pre leading-5">
                    {pattern.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* State Management */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">
            5. 状态管理架构
          </h2>
          <p className="text-[#A1A1AA] text-center mb-12 max-w-3xl mx-auto">
            前端状态分为全局状态、面板局部状态和实时通信事件三层
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {stateManagement.map((group, gi) => (
              <div
                key={gi}
                className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  {group.category}
                </h3>
                <div className="space-y-3">
                  {group.items.map((item, ii) => (
                    <div key={ii}>
                      <div className="text-[#C084FC] text-xs font-mono bg-[#27272A] rounded px-2 py-1 inline-block mb-1">
                        {item.key}
                      </div>
                      <p className="text-[#A1A1AA] text-sm">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-6 bg-[#0D0D0F]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            6. 技术栈
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {techStack.map((stack, i) => (
              <div
                key={i}
                className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6"
              >
                <div
                  className={`inline-block bg-gradient-to-r ${stack.color} bg-clip-text text-transparent text-lg font-semibold mb-4`}
                >
                  {stack.category}
                </div>
                <div className="space-y-3">
                  {stack.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div
                        className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${stack.color} mt-2 flex-shrink-0`}
                      />
                      <div>
                        <span className="text-white text-sm font-medium">
                          {item.name}
                        </span>
                        <span className="text-[#71717A] text-sm ml-2">
                          — {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Modules */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            7. 核心模块 & 工作量估算
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((mod, i) => (
              <div
                key={i}
                className="bg-[#18181B] border border-[#27272A] rounded-xl p-6 hover:border-[#7C3AED]/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#A855F7]">
                    {mod.icon}
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#27272A] rounded-full px-3 py-1">
                    <Clock className="w-3 h-3 text-[#71717A]" />
                    <span className="text-xs text-[#A1A1AA]">{mod.effort}</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {mod.title}
                </h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  {mod.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Total Effort */}
          <div className="mt-8 bg-gradient-to-r from-[#7C3AED]/10 to-[#A855F7]/10 border border-[#7C3AED]/20 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-[#A855F7]" />
              <span className="text-lg font-semibold text-white">
                Total Estimated Effort
              </span>
            </div>
            <p className="text-[#A1A1AA]">
              With a team of 5-8 engineers:{" "}
              <span className="text-white font-bold">10-14 months</span> for
              MVP
            </p>
            <p className="text-[#71717A] text-sm mt-1">
              Solo developer: 18-24+ months (not recommended)
            </p>
          </div>
        </div>
      </section>

      {/* Database Design */}
      <section className="py-16 px-6 bg-[#0D0D0F]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            8. 数据库设计
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {dbTables.map((table, i) => (
              <div
                key={i}
                className="bg-[#18181B] border border-[#27272A] rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-[#7C3AED]" />
                  <span className="text-white font-mono text-sm font-semibold">
                    {table.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {table.columns.split(", ").map((col, j) => (
                    <span
                      key={j}
                      className="bg-[#27272A] text-[#A1A1AA] text-xs px-2 py-1 rounded font-mono"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            9. 开发路线图
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#7C3AED] via-[#A855F7] to-[#7C3AED]/20 hidden md:block" />

            <div className="space-y-12">
              {roadmap.map((phase, i) => (
                <div key={i} className="flex gap-8">
                  {/* Timeline dot */}
                  <div className="hidden md:flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-[#7C3AED] border-4 border-[#09090B] z-10" />
                  </div>

                  <div className="flex-1 bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-[#7C3AED]/10 text-[#A855F7] text-xs font-semibold px-3 py-1 rounded-full">
                        {phase.phase}
                      </span>
                      <span className="text-white font-semibold">
                        {phase.title}
                      </span>
                      <span className="text-[#71717A] text-sm ml-auto">
                        {phase.duration}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {phase.items.map((item, j) => (
                        <li
                          key={j}
                          className="flex items-center gap-2 text-[#A1A1AA] text-sm"
                        >
                          <GitBranch className="w-3 h-3 text-[#7C3AED] flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="py-16 px-6 bg-[#0D0D0F]">
        <div className="max-w-4xl mx-auto text-center">
          <Cloud className="w-12 h-12 text-[#7C3AED] mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">总结</h2>
          <p className="text-[#A1A1AA] leading-relaxed mb-6">
            构建一个 Atoms 级别的平台需要在前端交互、后端架构、AI/ML 工程、DevOps 和产品设计方面具备深厚的专业知识。
            核心挑战在于：多 Agent 编排、代码沙箱隔离、实时协作通信、以及可扩展的部署基础设施。
            前端交互的关键在于 WebSocket 实时通信、SSE 流式渲染、iframe 沙箱通信、以及精细的状态管理。
          </p>
          <p className="text-[#A1A1AA] leading-relaxed">
            推荐的开发路径是：先构建 MVP（单 Agent + 简单编辑器 + 预览），然后迭代添加多 Agent 支持、部署功能和云服务。
            前端交互可以先实现基础的 Chat → Code → Preview 链路，再逐步添加 Inspect、Remix、Bug Fix 等高级功能。
          </p>
          <div className="mt-8 grid grid-cols-4 gap-4">
            {[
              { label: "核心模块", value: "8+" },
              { label: "交互模式", value: "20+" },
              { label: "团队规模", value: "5-8人" },
              { label: "MVP 周期", value: "10-14月" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-[#18181B] border border-[#27272A] rounded-xl p-4"
              >
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-[#71717A]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#27272A] py-8 px-6 text-center">
        <p className="text-[#71717A] text-sm">
          © 2024 Atoms Architecture Document. For reference purposes only.
        </p>
      </footer>
    </div>
  );
}