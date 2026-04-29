// Workspace AI Tools System

export interface ToolCall {
  tool: string;
  method: string;
  args: Record<string, string>;
}

export interface ToolResult {
  tool: string;
  method: string;
  success: boolean;
  output: string;
  filePath?: string;
}

export function parseToolCalls(content: string): ToolCall[] {
  const calls: ToolCall[] = [];

  const editorWriteRegex =
    /<Editor\.write>\s*<path>\s*([\s\S]*?)\s*<\/path>\s*<content>\s*([\s\S]*?)\s*<\/content>\s*<\/Editor\.write>/g;
  let match;
  while ((match = editorWriteRegex.exec(content)) !== null) {
    calls.push({
      tool: "Editor",
      method: "write",
      args: {
        path: match[1].trim(),
        content: match[2].trim(),
      },
    });
  }

  const editorReadRegex =
    /<Editor\.read>\s*<path>\s*([\s\S]*?)\s*<\/path>\s*<\/Editor\.read>/g;
  while ((match = editorReadRegex.exec(content)) !== null) {
    calls.push({
      tool: "Editor",
      method: "read",
      args: { path: match[1].trim() },
    });
  }

  const terminalRegex =
    /<Terminal\.run>\s*<cmd>\s*([\s\S]*?)\s*<\/cmd>\s*<\/Terminal\.run>/g;
  while ((match = terminalRegex.exec(content)) !== null) {
    calls.push({
      tool: "Terminal",
      method: "run",
      args: { cmd: match[1].trim() },
    });
  }

  if (calls.length === 0) {
    const codeBlockRegex = /```(?:(\w+):)?([^\n`]+\.\w+)\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const filePath = (match[2] || "").trim();
      const code = (match[3] || "").trim();
      if (filePath && code) {
        calls.push({
          tool: "Editor",
          method: "write",
          args: { path: filePath, content: code },
        });
      }
    }
  }

  return calls;
}

export function extractExplanation(content: string): string {
  let text = content;
  text = text.replace(/<Editor\.write>[\s\S]*?<\/Editor\.write>/g, "");
  text = text.replace(/<Editor\.read>[\s\S]*?<\/Editor\.read>/g, "");
  text = text.replace(/<Terminal\.run>[\s\S]*?<\/Terminal\.run>/g, "");
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

export function simulateTerminalCommand(cmd: string): string[] {
  const lines: string[] = ["$ " + cmd];

  if (
    cmd.includes("pnpm install") ||
    cmd.includes("pnpm add") ||
    cmd.includes("npm install")
  ) {
    const pkg = cmd.split(/\s+/).slice(-1)[0];
    lines.push("  Resolving dependencies...");
    lines.push("  Done: installed " + (pkg || "dependencies") + " (1.2s)");
  } else if (cmd.includes("pnpm run dev") || cmd.includes("npm run dev")) {
    lines.push("  VITE v5.4.0  ready in 312ms");
    lines.push("  Local: http://localhost:5173/");
  } else if (cmd.includes("pnpm run build") || cmd.includes("npm run build")) {
    lines.push("  vite v5.4.0 building for production...");
    lines.push("  142 modules transformed. Built in 3.2s");
  } else if (cmd.includes("pnpm run lint") || cmd.includes("eslint")) {
    lines.push("  No lint errors found");
  } else {
    lines.push("  Command executed successfully");
  }

  return lines;
}

function getToolDocumentation(): string {
  const parts: string[] = [];
  parts.push("## Available Tools\n");
  parts.push("You have tools to help build the project. Use XML tags in your response.\n");
  parts.push("### Editor.write");
  parts.push("Write or create a file. It appears in the file tree and preview auto-refreshes.");
  parts.push("Wrap your file path in path tags and code in content tags inside Editor.write tags.\n");
  parts.push("### Terminal.run");
  parts.push("Run a terminal command. Wrap the command in cmd tags inside Terminal.run tags.\n");
  parts.push("## Rules");
  parts.push("1. ALWAYS use Editor.write to create or update files.");
  parts.push("2. Write COMPLETE file contents. No placeholders.");
  parts.push("3. Use React + Tailwind CSS. Write modern, clean code.");
  parts.push("4. You can write multiple files in a single response.");
  parts.push("5. Explain what you are doing briefly BEFORE the tool calls.");
  parts.push("6. After writing files, the preview auto-refreshes.");
  return parts.join("\n");
}

export function buildSystemPrompt(
  mode: "engineer" | "team",
  agent: string
): string {
  const toolDocs = getToolDocumentation();

  if (mode === "team") {
    return [
      "You are an AI development team. You are currently responding as the",
      agent,
      "agent. Help the user build their project.\n\n",
      toolDocs,
    ].join(" ");
  }

  return [
    "You are Alex, an expert software engineer on the Vibe Coding Studio platform.",
    "You help users build web applications by writing code directly into their project.\n\n",
    toolDocs,
  ].join(" ");
}
