import { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { client } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileTab {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}

const LANG_MAP: Record<string, string> = {
  tsx: "typescript",
  ts: "typescript",
  jsx: "javascript",
  js: "javascript",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
  py: "python",
  txt: "plaintext",
};

const FILE_ICONS: Record<string, string> = {
  tsx: "⚛️",
  ts: "📘",
  jsx: "⚛️",
  js: "📒",
  css: "🎨",
  html: "🌐",
  json: "📋",
  md: "📝",
  py: "🐍",
};

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANG_MAP[ext] || "plaintext";
}

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || "📄";
}

export default function CodeEditor() {
  const { isAuthenticated } = useAuth();
  const { files, setFiles, projectId, fileVersion } = useWorkspace();
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(["src"])
  );

  // Initialize files from DB or defaults
  useEffect(() => {
    if (!projectId || !isAuthenticated) {
      setFiles([]);
      setTabs([]);
      setActiveTab("");
      return;
    }
    const loadFiles = async () => {
      try {
        const res = await client.entities.project_files.query({
          query: { project_id: projectId },
          sort: "file_path",
          limit: 200,
        });
        if (res?.data?.items && res.data.items.length > 0) {
          setFiles(
            res.data.items.map((f: Record<string, unknown>) => ({
              id: f.id as number,
              file_path: f.file_path as string,
              file_name: f.file_name as string,
              content: (f.content as string) || "",
              language: (f.language as string) || "plaintext",
              is_directory: (f.is_directory as boolean) || false,
            }))
          );
        } else {
          setFiles([]);
          setTabs([]);
          setActiveTab("");
        }
      } catch (err) {
        console.error("Failed to load files:", err);
        setFiles([]);
        setTabs([]);
        setActiveTab("");
      }
    };
    loadFiles();
  }, [projectId, isAuthenticated, setFiles]);

  // When files change (e.g. AI writes new files), update open tabs and auto-expand dirs
  useEffect(() => {
    if (files.length === 0) {
      setTabs([]);
      setActiveTab("");
      return;
    }

    // Update content of open tabs if file changed externally
    setTabs((prev) =>
      prev.map((tab) => {
        const file = files.find((f) => f.file_path === tab.path);
        if (file && file.content !== tab.content && !tab.modified) {
          return { ...tab, content: file.content };
        }
        return tab;
      })
    );

    // Auto-expand directories for new files
    const dirs = new Set<string>();
    files.forEach((f) => {
      const parts = f.file_path.split("/");
      if (parts.length > 1) {
        dirs.add(parts.slice(0, -1).join("/"));
      }
    });
    setExpandedDirs((prev) => new Set([...prev, ...dirs]));
  }, [files, fileVersion]);

  // Open first file by default
  useEffect(() => {
    if (files.length > 0 && tabs.length === 0) {
      const firstFile = files.find((f) => !f.is_directory);
      if (firstFile) {
        openFile(firstFile.file_path, firstFile.file_name, firstFile.content);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const openFile = (filePath: string, fileName: string, content: string) => {
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) {
      setActiveTab(filePath);
      // Update content if changed
      const file = files.find((f) => f.file_path === filePath);
      if (file && file.content !== existing.content && !existing.modified) {
        setTabs((prev) =>
          prev.map((t) =>
            t.path === filePath ? { ...t, content: file.content } : t
          )
        );
      }
      return;
    }
    const newTab: FileTab = {
      path: filePath,
      name: fileName,
      content,
      language: getLanguage(fileName),
      modified: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(filePath);
  };

  const closeTab = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.path !== path);
      if (activeTab === path && filtered.length > 0) {
        setActiveTab(filtered[filtered.length - 1].path);
      } else if (filtered.length === 0) {
        setActiveTab("");
      }
      return filtered;
    });
  };

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;
      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeTab ? { ...t, content: value, modified: true } : t
        )
      );
    },
    [activeTab]
  );

  const saveFile = async (path: string) => {
    const tab = tabs.find((t) => t.path === path);
    if (!tab || !projectId) return;

    try {
      const file = files.find((f) => f.file_path === path);
      if (file?.id) {
        await client.entities.project_files.update({
          id: String(file.id),
          data: {
            content: tab.content,
            updated_at: new Date().toISOString(),
          },
        });
      }
      setTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, modified: false } : t))
      );
      setFiles((prev) =>
        prev.map((f) =>
          f.file_path === path ? { ...f, content: tab.content } : f
        )
      );
      toast.success("File saved");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save file");
    }
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const buildTree = () => {
    const tree: Record<string, typeof files> = { "": [] };
    files.forEach((f) => {
      const parts = f.file_path.split("/");
      if (parts.length === 1) {
        tree[""] = tree[""] || [];
        tree[""].push(f);
      } else {
        const dir = parts.slice(0, -1).join("/");
        tree[dir] = tree[dir] || [];
        tree[dir].push(f);
      }
    });
    return tree;
  };

  const tree = buildTree();
  const dirs = Object.keys(tree)
    .filter((d) => d !== "")
    .sort();
  const rootFiles = tree[""] || [];
  const activeTabData = tabs.find((t) => t.path === activeTab);

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-56 border-r border-[#27272A] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272A]">
          <span className="text-[10px] uppercase tracking-wider text-[#71717A] font-semibold">
            Explorer
          </span>
          <button className="text-[#71717A] hover:text-white">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {dirs.map((dir) => (
            <div key={dir}>
              <button
                onClick={() => toggleDir(dir)}
                className="w-full flex items-center gap-1 px-3 py-1 text-xs text-[#A1A1AA] hover:bg-[#18181B] hover:text-white"
              >
                {expandedDirs.has(dir) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {expandedDirs.has(dir) ? (
                  <FolderOpen className="w-3.5 h-3.5 text-[#A855F7]" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-[#A855F7]" />
                )}
                <span>{dir}</span>
              </button>
              {expandedDirs.has(dir) &&
                tree[dir]
                  ?.filter((f) => !f.is_directory)
                  .map((f) => (
                    <button
                      key={f.file_path}
                      onClick={() =>
                        openFile(f.file_path, f.file_name, f.content)
                      }
                      className={`w-full flex items-center gap-1.5 pl-8 pr-3 py-1 text-xs hover:bg-[#18181B] ${
                        activeTab === f.file_path
                          ? "bg-[#18181B] text-white"
                          : "text-[#A1A1AA]"
                      }`}
                    >
                      <span className="text-[10px]">
                        {getFileIcon(f.file_name)}
                      </span>
                      <span className="truncate">{f.file_name}</span>
                    </button>
                  ))}
            </div>
          ))}
          {rootFiles
            .filter((f) => !f.is_directory)
            .map((f) => (
              <button
                key={f.file_path}
                onClick={() => openFile(f.file_path, f.file_name, f.content)}
                className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs hover:bg-[#18181B] ${
                  activeTab === f.file_path
                    ? "bg-[#18181B] text-white"
                    : "text-[#A1A1AA]"
                }`}
              >
                <File className="w-3.5 h-3.5" />
                <span className="text-[10px]">
                  {getFileIcon(f.file_name)}
                </span>
                <span className="truncate">{f.file_name}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center border-b border-[#27272A] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => setActiveTab(tab.path)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border-r border-[#27272A] min-w-max ${
                activeTab === tab.path
                  ? "bg-[#18181B] text-white border-b-2 border-b-[#7C3AED]"
                  : "text-[#71717A] hover:text-[#A1A1AA]"
              }`}
            >
              <span className="text-[10px]">{getFileIcon(tab.name)}</span>
              <span>{tab.name}</span>
              {tab.modified && (
                <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
              )}
              <button
                onClick={(e) => closeTab(tab.path, e)}
                className="ml-1 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
          {activeTabData?.modified && (
            <div className="flex items-center gap-1 px-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] text-[#A1A1AA] hover:text-white"
                onClick={() => saveFile(activeTab)}
              >
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1">
          {activeTabData ? (
            <Editor
              height="100%"
              language={activeTabData.language}
              value={activeTabData.content}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                minimap: { enabled: false },
                padding: { top: 12 },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                lineNumbers: "on",
                renderLineHighlight: "line",
                bracketPairColorization: { enabled: true },
                automaticLayout: true,
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="text-sm text-[#A1A1AA] mb-2">Workspace is empty</div>
              <div className="text-xs text-[#52525B] max-w-sm">
                The agent can start from a blank <code>/workspace</code> and create the file structure defined by the system prompt.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
