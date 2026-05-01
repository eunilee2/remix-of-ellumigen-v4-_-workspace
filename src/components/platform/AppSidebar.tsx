import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Search,
  Plus,
  LayoutGrid,
  Clock,
  Sparkles,
  ChevronDown,
  Bookmark,
  MessageSquare,
  Database,
  MoreHorizontal,
  Beaker,
  FlaskConical,
  FolderOpen,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { Chat, Folder, BookmarkedMessage, BookmarkCollection } from "@/types/chat";
import { buildWorkspaces } from "@/lib/workspaces";
import { ChatBranchTree, type BranchTreeNode } from "./ChatBranchTree";
import { UserProfile } from "./UserProfile";
import ellumigenLogo from "@/assets/EllumigenLogo.png";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type SidebarView = "workspace" | "chat" | "history" | "usecases" | "artifacts" | "methods";

interface AppSidebarProps {
  chats: Chat[];
  folders: Folder[];
  bookmarkedMessages: BookmarkedMessage[];
  bookmarkCollections: BookmarkCollection[];
  activeChatId: string | null;
  activeView: SidebarView;
  branchTreeNodes?: BranchTreeNode[];
  onSelectChat: (id: string) => void;
  onSelectBranchNode?: (nodeId: string) => void;
  onSelectBranch?: (branchId: string) => void;
  onNewChat: () => void;
  onViewChange: (view: SidebarView) => void;
}

export function AppSidebar({
  chats,
  folders,
  bookmarkedMessages,
  bookmarkCollections,
  activeChatId,
  activeView,
  branchTreeNodes,
  onSelectChat,
  onSelectBranchNode,
  onSelectBranch,
  onNewChat,
  onViewChange,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar h-screen overflow-hidden transition-all duration-200",
        collapsed ? "w-[52px]" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-border",
        collapsed ? "justify-center px-2 py-4" : "justify-between px-4 py-4"
      )}>
        {collapsed ? (
          <img src={ellumigenLogo} alt="Ellumigen" className="w-7 h-7 rounded-lg" />
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <img src={ellumigenLogo} alt="Ellumigen" className="w-7 h-7 rounded-lg" />
              <span className="text-base font-semibold text-foreground tracking-tight">
                Ellumigen
              </span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
            </button>
          </>
        )}
      </div>

      {/* Collapsed: icon-only nav */}
      {collapsed ? (
        <nav className="flex-1 flex flex-col items-center gap-1 py-3">
          <SidebarIconButton
            icon={PanelLeftOpen}
            label="Expand sidebar"
            onClick={() => setCollapsed(false)}
          />
          <SidebarIconButton icon={Search} label="Search" />
          <SidebarIconButton icon={Plus} label="New Chat" onClick={onNewChat} />
          <SidebarIconButton icon={LayoutGrid} label="Workspace" onClick={() => onViewChange("workspace")} />
          <SidebarIconButton icon={Clock} label="History" onClick={() => onViewChange("history")} />
          <SidebarIconButton icon={Sparkles} label="Use Cases" onClick={() => onViewChange("usecases")} />
          <SidebarIconButton icon={Database} label="Artifacts" onClick={() => onViewChange("artifacts")} />
          <SidebarIconButton icon={FlaskConical} label="Methods" onClick={() => onViewChange("methods")} />
          <SidebarIconButton icon={Bookmark} label="Bookmarks" />
        </nav>
      ) : (
        <>
          {/* Search */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-sm">
              <Search className="w-4 h-4" />
              <span>Search...</span>
            </div>
          </div>

          {/* New Chat */}
          <div className="px-3 py-1">
            <button
              onClick={onNewChat}
              className="sidebar-item w-full font-medium text-foreground"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Nav items */}
          <nav className="px-3 py-1 space-y-0.5">
            <button
              onClick={() => onViewChange("workspace")}
              className={cn("sidebar-item w-full", activeView === "workspace" && "sidebar-item-active")}
            >
              <LayoutGrid className="w-4 h-4" />
              Workspace
            </button>
            <button
              onClick={() => onViewChange("history")}
              className={cn("sidebar-item w-full", activeView === "history" && "sidebar-item-active")}
            >
              <Clock className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => onViewChange("artifacts")}
              className={cn("sidebar-item w-full", activeView === "artifacts" && "sidebar-item-active")}
            >
              <Database className="w-4 h-4" />
              Artifacts
            </button>
            <button
              onClick={() => onViewChange("methods")}
              className={cn("sidebar-item w-full", activeView === "methods" && "sidebar-item-active")}
            >
              <FlaskConical className="w-4 h-4" />
              Methods
            </button>
            <button
              onClick={() => onViewChange("usecases")}
              className={cn("sidebar-item w-full", activeView === "usecases" && "sidebar-item-active")}
            >
              <Sparkles className="w-4 h-4" />
              Suggestions
            </button>
          </nav>

          {/* Current Chat branch tree */}
          {branchTreeNodes && branchTreeNodes.length > 0 && (
            <div className="mt-2">
              <ChatBranchTree nodes={branchTreeNodes} onSelectNode={onSelectBranchNode} onSelectBranch={onSelectBranch} />
            </div>
          )}

          {/* Chats section */}
          <div className="flex-1 overflow-y-auto mt-2">
            <Collapsible defaultOpen className="px-3">
              <CollapsibleTrigger className="section-label flex items-center gap-1 w-full">
                <MessageSquare className="w-3 h-3" />
                Chats
                <ChevronDown className="w-3 h-3 ml-auto transition-transform duration-200 [[data-state=closed]>&]:rotate-[-90deg]" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`sidebar-item w-full text-left truncate ${
                      activeView === "chat" && activeChatId === chat.id ? "sidebar-item-active" : ""
                    }`}
                  >
                    <span className="truncate">{chat.title}</span>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Bookmarks */}
            <Collapsible defaultOpen className="px-3 mt-4">
              <CollapsibleTrigger className="section-label flex items-center gap-1 w-full">
                <Bookmark className="w-3 h-3" />
                Bookmarks
                {bookmarkedMessages.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({bookmarkedMessages.length})</span>
                )}
                <ChevronDown className="w-3 h-3 ml-auto transition-transform duration-200 [[data-state=closed]>&]:rotate-[-90deg]" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {bookmarkCollections.map((col) => {
                  const colBookmarks = bookmarkedMessages.filter((bm) => bm.collectionId === col.id);
                  return (
                    <button
                      key={col.id}
                      className="sidebar-item w-full text-left group"
                    >
                      <Bookmark className="w-3.5 h-3.5 shrink-0" style={{ fill: col.color, stroke: col.color }} />
                      <span className="truncate text-sm">{col.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{colBookmarks.length}</span>
                    </button>
                  );
                })}

                {bookmarkedMessages.filter((bm) => !bm.collectionId).length > 0 && (
                  <button className="sidebar-item w-full text-left">
                    <Bookmark className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">Uncategorized</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {bookmarkedMessages.filter((bm) => !bm.collectionId).length}
                    </span>
                  </button>
                )}

                {bookmarkedMessages.length === 0 && bookmarkCollections.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">No bookmarks yet</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </>
      )}

      {/* User profile pinned to bottom */}
      <div className={cn("mt-auto border-t border-border", collapsed ? "p-1.5" : "p-2")}>
        <UserProfile collapsed={collapsed} />
      </div>
    </aside>
  );
}

function SidebarIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Icon className="w-[18px] h-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function formatTimeAgo(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
