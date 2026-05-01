import { Lock, Share2, ChevronDown, FileEdit, Globe, FileText, MessageSquare, Layout, BookOpen, MoreHorizontal, Bookmark, Users } from "lucide-react";

interface Project {
  id: string;
  title: string;
  dataset: string;
  collaborators: number;
  status?: { label: string; textColor: string; bgColor: string };
  updatedAt?: string;
  stats: { chats: number; notebooks: number; canvas: number };
}

const DEMO_PROJECTS: Project[] = [
  {
    id: "ws-cancer",
    title: "Cancer Study — TCGA Cohort A",
    dataset: "@TCGA-BRCA · @TCGA-LUAD",
    collaborators: 4,
    status: { label: "Currently Running", textColor: "text-orange-700", bgColor: "bg-orange-100" },
    stats: { chats: 3, notebooks: 1, canvas: 4 },
  },
  {
    id: "ws-enrichment",
    title: "Pathway Enrichment Atlas",
    dataset: "@Reactome · @KEGG",
    collaborators: 2,
    updatedAt: "20 min ago",
    stats: { chats: 2, notebooks: 1, canvas: 2 },
  },
];

interface ChatCard {
  id: string;
  title: string;
  dataset: string;
  status?: { label: string; textColor: string; bgColor: string };
  updatedAt?: string;
}

const DEMO_CHATS: ChatCard[] = [
  {
    id: "c1",
    title: "Differential Expression – Tumor vs Normal",
    dataset: "@Dataset-Name",
    status: { label: "Currently Running", textColor: "text-orange-700", bgColor: "bg-orange-100" },
  },
  {
    id: "c2",
    title: "Differential Expression – Tumor vs Normal",
    dataset: "@Dataset-Name",
    status: { label: "New Chat", textColor: "text-emerald-700", bgColor: "bg-emerald-100" },
  },
  {
    id: "c3",
    title: "Differential Expression – Tumor vs Normal",
    dataset: "@Dataset-Name",
    updatedAt: "20 min ago",
  },
  {
    id: "c4",
    title: "Differential Expression – Tumor vs Normal",
    dataset: "@Dataset-Name",
    updatedAt: "Yesterday",
  },
];

interface BookmarkItem {
  id: string;
  title: string;
  datasets: string;
  time: string;
}

const DEMO_BOOKMARKS: BookmarkItem[] = [
  { id: "b1", title: "Pan-Cancer RNA-seq Expression Atlas", datasets: "12 datasets", time: "2 hrs ago" },
  { id: "b2", title: "Pan-Cancer RNA-seq Expression Atlas", datasets: "12 datasets", time: "2 hrs ago" },
];

interface ExampleTemplate {
  id: string;
  text: string;
  chatTitle: string;
  userMessage: string;
  assistantMessage: string;
}

const EXAMPLE_TEMPLATES: ExampleTemplate[] = [
  {
    id: "e1",
    text: "Start a new computational biology workflow",
    chatTitle: "Computational Biology Workflow",
    userMessage: "I'd like to start a new computational biology workflow. Can you help me set up a pipeline for analyzing gene expression data?",
    assistantMessage: `## Getting Started with Your Workflow\n\nGreat choice! Here's a recommended workflow for gene expression analysis.`,
  },
  {
    id: "e2",
    text: "Perform PCA Analysis",
    chatTitle: "PCA & UMAP Analysis",
    userMessage: "Can you perform PCA and UMAP dimensionality reduction on a single-cell RNA-seq dataset?",
    assistantMessage: `## Dimensionality Reduction Analysis\n\nI'll walk you through PCA and UMAP analysis for single-cell clustering.`,
  },
];

interface WorkspaceViewProps {
  onStartExample?: (chatTitle: string, userMessage: string, assistantMessage: string) => void;
  onOpenWorkspace?: (workspaceId: string) => void;
}

export function WorkspaceView({ onStartExample, onOpenWorkspace }: WorkspaceViewProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-sky-200/60 via-sky-100/30 to-background">
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <div className="mb-4 xl:max-w-[calc(100%-19rem)]">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Your workspaces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A workspace is your project hub — it organizes the threads, datasets, and methods for one research question.
          </p>
        </div>

        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="bg-background rounded-2xl border border-border p-6 md:p-8">
              {/* Your Workspaces */}
              <section className="mb-10">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-foreground">Your Workspaces</h2>
                  <span className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-xs text-muted-foreground">{DEMO_PROJECTS.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Open a workspace to see all its analysis threads, datasets and methods in one place.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DEMO_PROJECTS.map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      onClick={() => onOpenWorkspace?.(project.id)}
                      className="text-left p-5 rounded-xl border border-border bg-background hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            {Array.from({ length: Math.min(project.collaborators, 3) }).map((_, i) => (
                              <div key={i} className="w-6 h-6 rounded-full bg-muted border-2 border-background" />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{project.collaborators} Collaborators</span>
                        </div>
                        {project.status ? (
                          <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md ${project.status.bgColor} ${project.status.textColor}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {project.status.label}
                          </span>
                        ) : project.updatedAt ? (
                          <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-md bg-muted">{project.updatedAt}</span>
                        ) : null}
                      </div>

                      <h3 className="text-base font-semibold text-foreground mb-0.5">{project.title}</h3>
                      <p className="text-sm mb-4 text-blue-500">{project.dataset}</p>

                      <div className="flex items-center gap-0 border-t border-border pt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {project.stats.chats} Threads
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1 border-l border-border pl-3">
                          <BookOpen className="w-3.5 h-3.5" />
                          {project.stats.notebooks} Notebooks
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1 border-l border-border pl-3">
                          <Layout className="w-3.5 h-3.5" />
                          {project.stats.canvas} Canvas
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Recent threads */}
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-foreground">Recent threads</h2>
                  <span className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-xs text-muted-foreground">{DEMO_CHATS.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Each thread is an exploration inside a workspace. Branch, switch, or save as a method without leaving context.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DEMO_CHATS.map((chat) => (
                    <div
                      key={chat.id}
                      className="text-left p-4 rounded-xl border border-border bg-background hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        {chat.status ? (
                          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md ${chat.status.bgColor} ${chat.status.textColor}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {chat.status.label}
                          </span>
                        ) : chat.updatedAt ? (
                          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-md bg-muted">{chat.updatedAt}</span>
                        ) : null}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{chat.title}</h3>
                      <p className="text-xs text-blue-500">{chat.dataset}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="hidden xl:block w-72 shrink-0 space-y-4">
            <div className="bg-background rounded-2xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground mb-3">Quickstart</h3>
              <div className="space-y-0 rounded-lg border border-border overflow-hidden">
                {EXAMPLE_TEMPLATES.map((example, i) => (
                  <button
                    key={example.id}
                    onClick={() => onStartExample?.(example.chatTitle, example.userMessage, example.assistantMessage)}
                    className={`flex items-start gap-2.5 w-full p-3 hover:bg-secondary/50 transition-colors text-left ${
                      i < EXAMPLE_TEMPLATES.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground leading-snug">{example.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-background rounded-2xl border border-border p-5">
              <h3 className="text-base font-semibold text-foreground mb-3">Bookmarks</h3>
              <div className="space-y-2">
                {DEMO_BOOKMARKS.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug truncate">{bm.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{bm.datasets} · {bm.time}</p>
                    </div>
                    <button className="p-1 rounded hover:bg-secondary transition-colors shrink-0">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
