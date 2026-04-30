import { useState } from "react";
import Navbar from "@/components/Navbar";
import WorkspacePanel from "@/components/WorkspacePanel";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  MessageSquare,
  FileCode,
  Eye,
  Terminal,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

type TabType = "chat" | "editor" | "preview" | "terminal";

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "editor", label: "Editor", icon: <FileCode className="w-4 h-4" /> },
  { id: "preview", label: "App Viewer", icon: <Eye className="w-4 h-4" /> },
  { id: "terminal", label: "Terminal", icon: <Terminal className="w-4 h-4" /> },
];

export default function WorkspacePage() {
  const { t } = useLanguage();
  const [leftTab, setLeftTab] = useState<TabType>("chat");
  const [rightTab, setRightTab] = useState<TabType>("editor");
  const [showLeft, setShowLeft] = useState(true);
  const tabLabels: Record<TabType, string> = {
    chat: t("workspace.chat"),
    editor: t("workspace.editor"),
    preview: t("workspace.appViewer"),
    terminal: t("workspace.terminal"),
  };

  return (
    <div className="h-screen bg-[#09090B] text-white flex flex-col">
      <Navbar />

      {/* Workspace Header */}
      <div className="h-12 border-b border-[#27272A] flex items-center px-4 mt-16">
        <button
          onClick={() => setShowLeft(!showLeft)}
          className="text-[#71717A] hover:text-white mr-4"
        >
          {showLeft ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5" />
          )}
        </button>
        <div className="flex items-center gap-1 bg-[#18181B] rounded-lg p-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A855F7]" />
          <span className="text-sm text-[#A1A1AA] px-2">
            My SaaS Landing Page
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[#52525B]">{t("workspace.demoMode")}</span>
          <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {showLeft && (
          <div className="w-1/2 border-r border-[#27272A] flex flex-col">
            {/* Left Tabs */}
            <div className="h-10 border-b border-[#27272A] flex items-center px-2 gap-1">
              {tabs.slice(0, 2).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLeftTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
                    leftTab === tab.id
                      ? "bg-[#27272A] text-white"
                      : "text-[#71717A] hover:text-[#A1A1AA]"
                  }`}
                >
                  {tab.icon}
                  {tabLabels[tab.id]}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              <WorkspacePanel activeTab={leftTab} />
            </div>
          </div>
        )}

        {/* Right Panel */}
        <div className="flex-1 flex flex-col">
          {/* Right Tabs */}
          <div className="h-10 border-b border-[#27272A] flex items-center px-2 gap-1">
            {tabs.slice(1).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
                  rightTab === tab.id
                    ? "bg-[#27272A] text-white"
                    : "text-[#71717A] hover:text-[#A1A1AA]"
                }`}
              >
                {tab.icon}
                {tabLabels[tab.id]}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            <WorkspacePanel activeTab={rightTab} />
          </div>
        </div>
      </div>
    </div>
  );
}
