import { useState } from "react";
import {
  Send,
  Plus,
  FileCode,
  Terminal as TerminalIcon,
  Eye,
  ChevronRight,
  ChevronDown,
  Bot,
  User,
  Globe,
  RefreshCw,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Chat Panel ---
function ChatPanel() {
  const [input, setInput] = useState("");
  const messages = [
    {
      role: "user" as const,
      content: "Help me build a landing page for my SaaS product",
    },
    {
      role: "assistant" as const,
      content:
        "I'll create a modern landing page for your SaaS product. Let me start by setting up the project structure with a hero section, features grid, pricing cards, and a footer.\n\nFirst, I'll initialize the template...",
    },
    {
      role: "user" as const,
      content: "Make it dark theme with purple accents",
    },
    {
      role: "assistant" as const,
      content:
        "Great choice! I'll update the design to use a dark theme (#09090B background) with purple gradient accents (#7C3AED → #A855F7). Let me modify the components...",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#09090B]">
      {/* Chat Header */}
      <div className="h-12 border-b border-[#27272A] flex items-center px-4 gap-2">
        <div className="flex items-center gap-2 bg-[#18181B] rounded-lg px-3 py-1.5">
          <Bot className="w-4 h-4 text-[#7C3AED]" />
          <span className="text-xs text-[#A1A1AA]">Team Mode</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-[#71717A]">Claude Sonnet</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-[#27272A]"
                  : "bg-gradient-to-br from-[#7C3AED] to-[#A855F7]"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-3.5 h-3.5 text-[#A1A1AA]" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#71717A] mb-1">
                {msg.role === "user" ? "You" : "Alex (Engineer)"}
              </p>
              <p className="text-sm text-[#E4E4E7] leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#27272A]">
        <div className="flex items-center gap-2 bg-[#18181B] rounded-xl px-3 py-2 border border-[#27272A] focus-within:border-[#7C3AED]/50">
          <button className="text-[#71717A] hover:text-[#A1A1AA]">
            <Plus className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to build..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#52525B] outline-none"
          />
          <button className="text-[#7C3AED] hover:text-[#A855F7]">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- File Tree ---
function FileTree() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    src: true,
    components: true,
    pages: false,
  });

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="text-xs text-[#A1A1AA] space-y-0.5">
      <button
        onClick={() => toggle("src")}
        className="flex items-center gap-1 hover:text-white w-full py-0.5"
      >
        {expanded.src ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="text-[#E4E4E7]">src</span>
      </button>
      {expanded.src && (
        <div className="ml-3 space-y-0.5">
          <button
            onClick={() => toggle("components")}
            className="flex items-center gap-1 hover:text-white w-full py-0.5"
          >
            {expanded.components ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>components</span>
          </button>
          {expanded.components && (
            <div className="ml-3 space-y-0.5">
              <div className="flex items-center gap-1 py-0.5 text-[#7C3AED]">
                <FileCode className="w-3 h-3" />
                <span>Navbar.tsx</span>
              </div>
              <div className="flex items-center gap-1 py-0.5 hover:text-white cursor-pointer">
                <FileCode className="w-3 h-3" />
                <span>Hero.tsx</span>
              </div>
              <div className="flex items-center gap-1 py-0.5 hover:text-white cursor-pointer">
                <FileCode className="w-3 h-3" />
                <span>PricingCard.tsx</span>
              </div>
            </div>
          )}
          <button
            onClick={() => toggle("pages")}
            className="flex items-center gap-1 hover:text-white w-full py-0.5"
          >
            {expanded.pages ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>pages</span>
          </button>
          {expanded.pages && (
            <div className="ml-3 space-y-0.5">
              <div className="flex items-center gap-1 py-0.5 hover:text-white cursor-pointer">
                <FileCode className="w-3 h-3" />
                <span>Index.tsx</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 py-0.5 hover:text-white cursor-pointer">
            <FileCode className="w-3 h-3" />
            <span>App.tsx</span>
          </div>
          <div className="flex items-center gap-1 py-0.5 hover:text-white cursor-pointer">
            <FileCode className="w-3 h-3" />
            <span>main.tsx</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Editor Panel ---
function EditorPanel() {
  const codeLines = [
    'import { Button } from "@/components/ui/button";',
    "",
    "export default function Hero() {",
    "  return (",
    '    <section className="relative min-h-screen flex items-center">',
    '      <div className="max-w-7xl mx-auto px-6 text-center">',
    '        <h1 className="text-6xl font-bold text-white mb-6">',
    "          Turn ideas into",
    '          <span className="bg-gradient-to-r from-purple-500',
    '            to-violet-400 bg-clip-text text-transparent">',
    "            {\" \"}software",
    "          </span>",
    "        </h1>",
    '        <p className="text-xl text-gray-400 mb-8">',
    "          Build, deploy, and scale your apps with AI",
    "        </p>",
    "        <Button>Get Started</Button>",
    "      </div>",
    "    </section>",
    "  );",
    "}",
  ];

  return (
    <div className="flex h-full bg-[#0D0D0F]">
      {/* File Tree Sidebar */}
      <div className="w-48 border-r border-[#27272A] p-3 overflow-y-auto">
        <div className="text-xs text-[#71717A] uppercase tracking-wider mb-2 font-semibold">
          Explorer
        </div>
        <FileTree />
      </div>

      {/* Code Area */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <div className="h-9 border-b border-[#27272A] flex items-center">
          <div className="flex items-center gap-2 px-4 h-full border-b-2 border-[#7C3AED] bg-[#18181B]/50">
            <FileCode className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span className="text-xs text-white">Navbar.tsx</span>
          </div>
          <div className="flex items-center gap-2 px-4 h-full text-[#71717A] hover:text-[#A1A1AA] cursor-pointer">
            <FileCode className="w-3.5 h-3.5" />
            <span className="text-xs">Hero.tsx</span>
          </div>
        </div>

        {/* Code */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-5">
          {codeLines.map((line, i) => (
            <div key={i} className="flex">
              <span className="w-8 text-right text-[#52525B] select-none mr-4">
                {i + 1}
              </span>
              <span className="text-[#E4E4E7]">
                {colorizeCode(line)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function colorizeCode(line: string) {
  // Simple syntax highlighting
  return line
    .replace(
      /(import|from|export|default|function|return|const)/g,
      '<span class="text-[#C084FC]">$1</span>'
    )
    .replace(
      /(".*?")/g,
      '<span class="text-[#86EFAC]">$1</span>'
    )
    .replace(
      /(className)/g,
      '<span class="text-[#93C5FD]">$1</span>'
    );
}

// --- Preview Panel ---
function PreviewPanel() {
  return (
    <div className="flex flex-col h-full bg-[#09090B]">
      {/* Browser Bar */}
      <div className="h-10 border-b border-[#27272A] flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80" />
          <div className="w-3 h-3 rounded-full bg-[#22C55E]/80" />
        </div>
        <div className="flex-1 flex items-center gap-2 bg-[#18181B] rounded-lg px-3 py-1 mx-2">
          <Globe className="w-3.5 h-3.5 text-[#71717A]" />
          <span className="text-xs text-[#A1A1AA]">
            localhost:5173
          </span>
        </div>
        <button className="text-[#71717A] hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#09090B] to-[#1a0a2e]">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-3xl font-bold text-white">
            Turn ideas into{" "}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent">
              software
            </span>
          </h2>
          <p className="text-[#A1A1AA] text-sm">
            Build, deploy, and scale your apps with AI
          </p>
          <Button className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-sm">
            Get Started Free
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Terminal Panel ---
function TerminalPanel() {
  const lines = [
    { prefix: "$", text: "pnpm run dev", color: "text-[#22C55E]" },
    { prefix: "", text: "VITE v5.4.0  ready in 342 ms", color: "text-[#A1A1AA]" },
    { prefix: "", text: "", color: "" },
    {
      prefix: "➜",
      text: "Local:   http://localhost:5173/",
      color: "text-[#93C5FD]",
    },
    {
      prefix: "➜",
      text: "Network: http://192.168.1.100:5173/",
      color: "text-[#71717A]",
    },
    { prefix: "", text: "", color: "" },
    { prefix: "$", text: "pnpm run lint", color: "text-[#22C55E]" },
    { prefix: "", text: "✓ No ESLint warnings or errors", color: "text-[#22C55E]" },
    { prefix: "", text: "", color: "" },
    { prefix: "$", text: "pnpm run build", color: "text-[#22C55E]" },
    {
      prefix: "",
      text: "✓ built in 1.23s",
      color: "text-[#22C55E]",
    },
    {
      prefix: "",
      text: "dist/index.html    0.46 kB │ gzip:  0.30 kB",
      color: "text-[#A1A1AA]",
    },
    {
      prefix: "",
      text: "dist/assets/index-DwF3a1.css  24.18 kB │ gzip:  5.12 kB",
      color: "text-[#A1A1AA]",
    },
    {
      prefix: "",
      text: "dist/assets/index-Ba2x9k.js  142.56 kB │ gzip: 46.23 kB",
      color: "text-[#A1A1AA]",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0D0D0F]">
      <div className="h-9 border-b border-[#27272A] flex items-center px-4 gap-2">
        <TerminalIcon className="w-3.5 h-3.5 text-[#71717A]" />
        <span className="text-xs text-[#A1A1AA]">Terminal</span>
        <div className="ml-auto">
          <Play className="w-3.5 h-3.5 text-[#71717A]" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-5">
        {lines.map((line, i) => (
          <div key={i} className={line.color}>
            {line.prefix && (
              <span className="text-[#7C3AED] mr-2">{line.prefix}</span>
            )}
            {line.text}
          </div>
        ))}
        <div className="flex items-center mt-1">
          <span className="text-[#7C3AED] mr-2">$</span>
          <span className="w-2 h-4 bg-[#7C3AED] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// --- Main Workspace Component ---
interface WorkspacePanelProps {
  activeTab: "chat" | "editor" | "preview" | "terminal";
}

export default function WorkspacePanel({ activeTab }: WorkspacePanelProps) {
  switch (activeTab) {
    case "chat":
      return <ChatPanel />;
    case "editor":
      return <EditorPanel />;
    case "preview":
      return <PreviewPanel />;
    case "terminal":
      return <TerminalPanel />;
    default:
      return <ChatPanel />;
  }
}

export { ChatPanel, EditorPanel, PreviewPanel, TerminalPanel };