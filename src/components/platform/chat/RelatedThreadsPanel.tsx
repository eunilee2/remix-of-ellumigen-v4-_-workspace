import { GitBranch, MessageSquare, Database, FlaskConical, ArrowRight, FolderOpen } from "lucide-react";
import type { Chat } from "@/types/chat";
import { getRelatedThreads, getWorkspaceForChat } from "@/lib/workspaces";

interface RelatedThreadsPanelProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectThread: (id: string) => void;
  onOpenWorkspace: (workspaceId: string) => void;
}

/**
 * In-chat sidebar that surfaces other threads in the same workspace plus
 * the shared assets (datasets, methods). Reinforces that threads are not
 * isolated — they sit inside an organized workspace.
 */
export function RelatedThreadsPanel({
  chats,
  activeChatId,
  onSelectThread,
  onOpenWorkspace,
}: RelatedThreadsPanelProps) {
  const workspace = getWorkspaceForChat(chats, activeChatId);
  const related = getRelatedThreads(chats, activeChatId);

  if (!workspace) return null;

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-secondary/20 overflow-y-auto p-4 space-y-4 hidden xl:block">
      {/* Workspace header */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
          <FolderOpen className="w-3 h-3" />
          Workspace
        </div>
        <button
          onClick={() => onOpenWorkspace(workspace.id)}
          className="text-left w-full group"
        >
          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-start gap-1">
            <span className="flex-1">{workspace.name}</span>
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            {workspace.description}
          </p>
        </button>
      </div>

      {/* Shared assets */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Shared in workspace
        </div>
        {workspace.datasets.length > 0 && (
          <div className="flex items-start gap-2">
            <Database className="w-3.5 h-3.5 text-sky-600 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {workspace.datasets.map((d) => (
                <span
                  key={d}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 font-medium"
                >
                  @{d}
                </span>
              ))}
            </div>
          </div>
        )}
        {workspace.methods.length > 0 && (
          <div className="flex items-start gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {workspace.methods.map((m) => (
                <span
                  key={m}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200 font-medium"
                >
                  /{m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related threads */}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Related threads
        </div>
        {related.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No other threads in this workspace yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {related.map(({ chat, reason }) => {
              const isBranched = !!chat.parentId;
              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectThread(chat.id)}
                  className="w-full text-left p-2 rounded-md border border-border bg-background hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {isBranched ? (
                      <GitBranch className="w-3 h-3 text-violet-500" />
                    ) : (
                      <MessageSquare className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate">
                      {chat.title}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{reason}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Microcopy hint */}
      <div className="text-[10px] text-muted-foreground italic leading-snug border-t border-border pt-3">
        Threads are explorations within your workspace. Branch, switch, or save as a method — nothing is ever stuck in one chat.
      </div>
    </aside>
  );
}
