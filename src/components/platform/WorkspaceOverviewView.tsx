import { useState, useMemo } from "react";
import {
  ArrowLeft,
  List as ListIcon,
  GitBranch,
  Database,
  FlaskConical,
  Users,
  Clock,
  MessageSquare,
  Plus,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import type { Chat } from "@/types/chat";
import { buildWorkspaces, type Workspace } from "@/lib/workspaces";
import { cn } from "@/lib/utils";

interface WorkspaceOverviewViewProps {
  chats: Chat[];
  workspaceId: string;
  onSelectThread: (chatId: string) => void;
  onNewThread: () => void;
  onBack: () => void;
}

type OverviewMode = "list" | "graph";
type GroupBy = "dataset" | "method" | "none";

export function WorkspaceOverviewView({
  chats,
  workspaceId,
  onSelectThread,
  onNewThread,
  onBack,
}: WorkspaceOverviewViewProps) {
  const [mode, setMode] = useState<OverviewMode>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("dataset");

  const workspace = useMemo(
    () => buildWorkspaces(chats).find((w) => w.id === workspaceId),
    [chats, workspaceId]
  );

  const threads = useMemo(
    () => chats.filter((c) => workspace?.threadIds.includes(c.id)) ?? [],
    [chats, workspace]
  );

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Workspace not found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-amber-50/40 via-background to-background">
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All workspaces
        </button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FolderOpen className="w-3.5 h-3.5" />
              Workspace
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {workspace.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {workspace.description}
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              A workspace is your project hub — threads are the analyses inside it.
            </p>
          </div>
          <button
            onClick={onNewThread}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New thread
          </button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={MessageSquare}
            label="Threads"
            value={threads.length}
            tone="amber"
          />
          <StatCard
            icon={Database}
            label="Datasets"
            value={workspace.datasets.length}
            tone="sky"
          />
          <StatCard
            icon={FlaskConical}
            label="Methods"
            value={workspace.methods.length}
            tone="violet"
          />
          <StatCard
            icon={Users}
            label="Collaborators"
            value={workspace.collaborators}
            tone="emerald"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Threads panel */}
          <section className="bg-background rounded-2xl border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Analysis threads
              </h2>
              <div className="flex items-center gap-2">
                {/* Group by */}
                {mode === "list" && (
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                    className="text-xs bg-secondary border border-border rounded-md px-2 py-1 text-foreground"
                  >
                    <option value="dataset">Group by dataset</option>
                    <option value="method">Group by method</option>
                    <option value="none">Flat list</option>
                  </select>
                )}
                {/* List ⇄ Graph */}
                <div className="flex items-center rounded-md border border-border overflow-hidden">
                  <button
                    onClick={() => setMode("list")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors",
                      mode === "list"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                    List
                  </button>
                  <button
                    onClick={() => setMode("graph")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors",
                      mode === "graph"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Graph
                  </button>
                </div>
              </div>
            </div>

            {mode === "list" ? (
              <ThreadList
                threads={threads}
                workspace={workspace}
                groupBy={groupBy}
                onSelectThread={onSelectThread}
              />
            ) : (
              <ThreadGraph threads={threads} onSelectThread={onSelectThread} />
            )}
          </section>

          {/* Sidebar: assets + activity */}
          <aside className="space-y-4">
            <AssetCard
              title="Datasets"
              icon={Database}
              tone="sky"
              items={workspace.datasets.map((d) => `@${d}`)}
              empty="No datasets attached"
            />
            <AssetCard
              title="Methods"
              icon={FlaskConical}
              tone="violet"
              items={workspace.methods.map((m) => `/${m}`)}
              empty="No methods attached"
            />
            <ActivityCard threads={threads} />
            <CollaboratorsCard count={workspace.collaborators} />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "amber" | "sky" | "violet" | "emerald";
}) {
  const toneMap = {
    amber: "text-amber-600 bg-amber-50",
    sky: "text-sky-600 bg-sky-50",
    violet: "text-violet-600 bg-violet-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };
  return (
    <div className="bg-background rounded-xl border border-border p-3 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", toneMap[tone])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold text-foreground leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function ThreadList({
  threads,
  workspace,
  groupBy,
  onSelectThread,
}: {
  threads: Chat[];
  workspace: Workspace;
  groupBy: GroupBy;
  onSelectThread: (id: string) => void;
}) {
  if (threads.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        No threads yet — start a new analysis to begin exploring this workspace.
      </div>
    );
  }

  // simple group bucket — assigns by index into datasets/methods so demo data has variety
  const groups = new Map<string, Chat[]>();
  if (groupBy === "none") {
    groups.set("All threads", threads);
  } else {
    const buckets =
      groupBy === "dataset"
        ? workspace.datasets.length
          ? workspace.datasets
          : ["Unassigned"]
        : workspace.methods.length
        ? workspace.methods
        : ["Unassigned"];
    threads.forEach((t, i) => {
      const key = buckets[i % buckets.length];
      const label = groupBy === "dataset" ? `@${key}` : `/${key}`;
      const arr = groups.get(label) ?? [];
      arr.push(t);
      groups.set(label, arr);
    });
  }

  return (
    <div className="space-y-5">
      {Array.from(groups.entries()).map(([label, items]) => (
        <div key={label}>
          {groupBy !== "none" && (
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {label}
            </div>
          )}
          <div className="space-y-2">
            {items.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                onClick={() => onSelectThread(thread.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadRow({ thread, onClick }: { thread: Chat; onClick: () => void }) {
  const isBranched = !!thread.parentId;
  const lastUpdated = formatRelative(thread.updatedAt);
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border bg-background hover:bg-secondary/40 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1">
        {isBranched ? (
          <GitBranch className="w-3.5 h-3.5 text-violet-500" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {thread.title}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">{lastUpdated}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{thread.messages.length} messages</span>
        {thread.branches?.length > 0 && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {thread.branches.length} branch{thread.branches.length === 1 ? "" : "es"}
            </span>
          </>
        )}
        {isBranched && (
          <>
            <span>·</span>
            <span className="text-violet-500">branched from another thread</span>
          </>
        )}
      </div>
    </button>
  );
}

function ThreadGraph({
  threads,
  onSelectThread,
}: {
  threads: Chat[];
  onSelectThread: (id: string) => void;
}) {
  if (threads.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        No threads to graph yet.
      </div>
    );
  }
  // simple radial-ish layout — root in the center, children fan out
  const radius = 140;
  const cx = 220;
  const cy = 180;
  const positioned = threads.map((t, i) => {
    const angle = (i / threads.length) * 2 * Math.PI - Math.PI / 2;
    return {
      thread: t,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  return (
    <div className="relative w-full h-[380px] rounded-lg border border-border bg-secondary/20 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 440 360">
        {/* edges from center to each thread */}
        {positioned.map(({ thread, x, y }) => (
          <path
            key={`edge-${thread.id}`}
            d={`M ${cx} ${cy} Q ${(cx + x) / 2} ${(cy + y) / 2 - 20} ${x} ${y}`}
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray={thread.parentId ? "4 4" : undefined}
          />
        ))}
        {/* center node = workspace */}
        <circle cx={cx} cy={cy} r="22" fill="hsl(var(--primary))" />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="text-[10px] fill-primary-foreground"
          style={{ fontWeight: 600 }}
        >
          WS
        </text>
      </svg>

      {/* thread node buttons */}
      {positioned.map(({ thread, x, y }) => {
        const isBranched = !!thread.parentId;
        return (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg border bg-background shadow-sm hover:shadow-md transition-all text-left max-w-[160px]",
              isBranched ? "border-violet-300" : "border-border"
            )}
            style={{ left: `${(x / 440) * 100}%`, top: `${(y / 360) * 100}%` }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              {isBranched ? (
                <GitBranch className="w-3 h-3 text-violet-500" />
              ) : (
                <MessageSquare className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="text-[10px] text-muted-foreground">Thread</span>
            </div>
            <div className="text-xs font-medium text-foreground truncate">
              {thread.title}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AssetCard({
  title,
  icon: Icon,
  tone,
  items,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "sky" | "violet";
  items: string[];
  empty: string;
}) {
  const toneMap = {
    sky: "text-sky-600 bg-sky-50 border-sky-200",
    violet: "text-violet-600 bg-violet-50 border-violet-200",
  };
  return (
    <div className="bg-background rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("w-4 h-4", tone === "sky" ? "text-sky-600" : "text-violet-600")} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded border",
                toneMap[tone]
              )}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCard({ threads }: { threads: Chat[] }) {
  const recent = [...threads]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 4);
  return (
    <div className="bg-background rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
      </div>
      {recent.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No activity yet</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((t) => (
            <li key={t.id} className="flex items-start gap-2 text-xs">
              <Sparkles className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate">{t.title}</div>
                <div className="text-muted-foreground">
                  Updated {formatRelative(t.updatedAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CollaboratorsCard({ count }: { count: number }) {
  return (
    <div className="bg-background rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Collaborators</h3>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-muted border-2 border-background"
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{count} people</span>
      </div>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
