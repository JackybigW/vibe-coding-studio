import { useState, useRef, useEffect, useCallback } from "react";
import { client } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace, parseCodeBlocks } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Paperclip,
  Bot,
  User,
  Loader2,
  Code2,
  Palette,
  BarChart3,
  Briefcase,
  Sparkles,
  StopCircle,
  FileCode,
  CheckCircle2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  agent?: string;
  model?: string;
  created_at?: string;
  isStreaming?: boolean;
  filesWritten?: string[];
}

const MODELS = [
  { id: "deepseek-v3.2", label: "DeepSeek V3", icon: "🔮" },
  { id: "gpt-5-chat", label: "GPT-5", icon: "🧠" },
  { id: "claude-4-5-sonnet", label: "Claude 4.5", icon: "🎭" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5", icon: "💎" },
];

const AGENTS = [
  { id: "engineer", label: "Engineer", icon: <Code2 className="w-3.5 h-3.5" /> },
  { id: "pm", label: "PM", icon: <Briefcase className="w-3.5 h-3.5" /> },
  { id: "designer", label: "Designer", icon: <Palette className="w-3.5 h-3.5" /> },
  { id: "analyst", label: "Analyst", icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

const AGENT_COLORS: Record<string, string> = {
  engineer: "text-blue-400",
  pm: "text-green-400",
  designer: "text-pink-400",
  analyst: "text-amber-400",
};

interface ChatPanelProps {
  mode: "engineer" | "team";
}

export default function ChatPanel({ mode }: ChatPanelProps) {
  const { user, isAuthenticated } = useAuth();
  const { projectId, writeMultipleFiles, addTerminalLog } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("deepseek-v3.2");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load messages for project
  useEffect(() => {
    if (!projectId || !isAuthenticated) return;
    const loadMessages = async () => {
      try {
        const res = await client.entities.messages.query({
          query: { project_id: projectId },
          sort: "created_at",
          limit: 100,
        });
        if (res?.data?.items) {
          setMessages(
            res.data.items.map((m: Record<string, unknown>) => ({
              id: m.id as number,
              role: m.role as "user" | "assistant" | "system",
              content: m.content as string,
              agent: m.agent as string,
              model: m.model as string,
              created_at: m.created_at as string,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };
    loadMessages();
  }, [projectId, isAuthenticated]);

  const saveMessage = async (msg: Omit<Message, "id">) => {
    if (!projectId) return;
    try {
      await client.entities.messages.create({
        data: {
          project_id: projectId,
          role: msg.role,
          content: msg.content,
          model: msg.model || selectedModel,
          agent: msg.agent || "engineer",
          tokens_used: 0,
          created_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  /** After AI finishes, extract code blocks and write to files */
  const processAIResponse = useCallback(
    async (content: string) => {
      const codeBlocks = parseCodeBlocks(content);
      if (codeBlocks.length === 0) return [];

      addTerminalLog("");
      addTerminalLog("$ AI detected file operations...");

      await writeMultipleFiles(codeBlocks);

      return codeBlocks.map((b) => b.path);
    },
    [writeMultipleFiles, addTerminalLog]
  );

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);

    await saveMessage(userMsg);

    const agent = mode === "team" ? "engineer" : "engineer";

    const assistantMsg: Message = {
      role: "assistant",
      content: "",
      agent,
      model: selectedModel,
      isStreaming: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    // System prompt instructs AI to output code in file-tagged code blocks
    const systemPrompt =
      mode === "team"
        ? `You are an AI development team. You are responding as the ${agent} agent.
Help the user build their project. When writing code, ALWAYS use this format so files are written to the project:

\`\`\`tsx:src/App.tsx
// your code here
\`\`\`

\`\`\`css:src/index.css
/* your styles here */
\`\`\`

The format is \`\`\`language:filepath. This will automatically write the code to the project files.
Be concise. Write complete, working code. Use React + Tailwind CSS.`
        : `You are Alex, an expert software engineer. Help the user build their project.

IMPORTANT: When writing code, ALWAYS use this exact format so files are automatically written to the project:

\`\`\`tsx:src/App.tsx
// your code here
\`\`\`

\`\`\`css:src/index.css
/* your styles here */
\`\`\`

The format is \`\`\`language:filepath — this writes the code directly into the project's file tree.
Always write complete, working code. Use React + Tailwind CSS. Be concise and helpful.`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.slice(-10).map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: input.trim() },
    ];

    let fullContent = "";

    try {
      await client.ai.gentxt({
        messages: chatMessages,
        model: selectedModel,
        stream: true,
        onChunk: (chunk: { content?: string }) => {
          if (chunk.content) {
            fullContent += chunk.content;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: fullContent,
                };
              }
              return updated;
            });
          }
        },
        onComplete: async () => {
          // Parse code blocks and write to files
          const writtenFiles = await processAIResponse(fullContent);

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                isStreaming: false,
                filesWritten: writtenFiles,
              };
            }
            return updated;
          });
          setIsLoading(false);
          setIsStreaming(false);

          saveMessage({
            role: "assistant",
            content: fullContent,
            agent,
            model: selectedModel,
          });
        },
        onError: (error: { message?: string }) => {
          console.error("AI error:", error);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content:
                  fullContent ||
                  "Sorry, I encountered an error. Please try again.",
                isStreaming: false,
              };
            }
            return updated;
          });
          setIsLoading(false);
          setIsStreaming(false);
        },
      });
    } catch (err) {
      console.error("Chat error:", err);
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  return (
    <div className="flex flex-col h-full">
      {/* Model Selector */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#27272A]">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[180px] h-8 bg-[#18181B] border-[#27272A] text-xs text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#27272A]">
            {MODELS.map((m) => (
              <SelectItem
                key={m.id}
                value={m.id}
                className="text-[#FAFAFA] text-xs"
              >
                <span className="mr-1">{m.icon}</span> {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {mode === "team" && (
          <div className="flex items-center gap-1 ml-auto">
            {AGENTS.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-[#18181B] border border-[#27272A] ${AGENT_COLORS[a.id]}`}
              >
                {a.icon}
                <span className="hidden xl:inline">{a.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#A855F7]/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-[#A855F7]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {mode === "team" ? "Team Mode" : "Engineer Mode"}
            </h3>
            <p className="text-sm text-[#71717A] max-w-sm">
              {mode === "team"
                ? "Multiple AI agents collaborate to build your project. Describe what you want to create."
                : "Alex, your AI engineer, is ready to help. Describe your project or ask a question."}
            </p>
            <p className="text-xs text-[#52525B] mt-3 max-w-xs">
              Code will be automatically written to your project files and previewed in real-time.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className="flex-shrink-0">
              {msg.role === "user" ? (
                <div className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-[#A1A1AA]" />
                  )}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div
              className={`max-w-[85%] ${
                msg.role === "user"
                  ? "bg-[#7C3AED]/20 border border-[#7C3AED]/30 rounded-2xl rounded-tr-md px-4 py-2.5"
                  : "bg-[#18181B] border border-[#27272A] rounded-2xl rounded-tl-md px-4 py-2.5"
              }`}
            >
              {msg.role === "assistant" && msg.agent && (
                <div
                  className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                    AGENT_COLORS[msg.agent] || "text-[#A855F7]"
                  }`}
                >
                  {msg.agent}
                </div>
              )}
              <div className="text-sm text-[#E4E4E7] prose prose-invert prose-sm max-w-none [&_pre]:bg-[#0A0A0C] [&_pre]:border [&_pre]:border-[#27272A] [&_pre]:rounded-lg [&_code]:text-[#A855F7] [&_pre_code]:text-[#E4E4E7]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
                {msg.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-[#A855F7] animate-pulse ml-0.5" />
                )}
              </div>

              {/* Files written indicator */}
              {msg.filesWritten && msg.filesWritten.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#27272A]">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#22C55E] font-semibold uppercase tracking-wider mb-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Files written to project
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.filesWritten.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1 text-[10px] bg-[#22C55E]/10 text-[#22C55E] px-2 py-0.5 rounded border border-[#22C55E]/20"
                      >
                        <FileCode className="w-2.5 h-2.5" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[#27272A] p-3">
        <div className="flex items-end gap-2 bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 focus-within:border-[#7C3AED]/50 transition-colors">
          <button className="text-[#71717A] hover:text-[#A1A1AA] p-1 mb-0.5">
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              projectId
                ? "Describe what you want to build..."
                : "Create a project first to start chatting"
            }
            disabled={!projectId || isLoading}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#52525B] resize-none outline-none min-h-[24px] max-h-[200px]"
            rows={1}
          />
          {isStreaming ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1 mb-0.5"
            >
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !projectId}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white p-1 mb-0.5 h-7 w-7"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}