import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { GitBranch, Copy, ThumbsUp, ThumbsDown, Layout, FileCode, X, Maximize2, Minimize2, ChevronDown, ChevronUp } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import type { Chat, ChatMessage, BookmarkCollection } from "@/types/chat";
import { ChatInput } from "./ChatInput";
import { ContextTags } from "./chat/ContextTags";
import { ProposedPlan } from "./chat/ProposedPlan";
import { SuggestionChips } from "./SuggestionChips";
import { TaskExecution } from "./chat/TaskExecution";
import { ThoughtProcess } from "./chat/ThoughtProcess";
import { ContextControlHelp } from "./chat/ContextControlHelp";
import { DataTable } from "./chat/DataTable";
import { VolcanoPlot } from "./chat/VolcanoPlot";
import { HeatmapChart } from "./chat/HeatmapChart";
import { DraggableVisualization } from "./chat/DraggableVisualization";
import { BookmarkPopover } from "./chat/BookmarkPopover";
import { FreeformView } from "./FreeformView";
import { NotebookView } from "./NotebookView";
import ellumigenLogo from "@/assets/EllumigenLogo.png";
import { getContributorForId } from "@/lib/contributors";
import { ContextStrip } from "./chat/ContextStrip";
import { StartingCanvas } from "./chat/StartingCanvas";
import { AnalysisStepBlock } from "./chat/AnalysisStepBlock";

// Derive persistent context (datasets + active method) from the chat messages.
function deriveChatContext(messages: ChatMessage[] | undefined) {
  const datasets = new Set<string>();
  let method: string | null = null;
  if (!messages) return { datasets: [] as string[], method };
  for (const m of messages) {
    (m.metadata?.contextUsed ?? []).forEach((c) => {
      if (c.startsWith("/")) method = c.slice(1);
      else if (/^[A-Z]/.test(c)) datasets.add(c);
      else method = c;
    });
    const dsMatches = m.content.match(/@[\w-]+/g);
    dsMatches?.forEach((d) => datasets.add(d.slice(1)));
    const mtMatches = m.content.match(/\/[\w-]+/g);
    if (mtMatches && mtMatches.length > 0) method = mtMatches[mtMatches.length - 1].slice(1);
  }
  return { datasets: Array.from(datasets), method };
}

export type MiniPanelType = "canvas" | "code" | null;

interface ChatViewProps {
  chat: Chat | null;
  onSendMessage: (message: string) => void;
  onBranch?: (messageId: string) => void;
  onBookmark?: (messageId: string) => void;
  onToggleBookmarkCollection?: (messageId: string, collectionId: string) => void;
  onCreateBookmarkCollection?: (name: string) => void;
  getCollectionIdsForMessage?: (messageId: string) => string[];
  bookmarkCollections?: BookmarkCollection[];
  onApprovePlan?: (messageId: string) => void;
  onRejectPlan?: (messageId: string) => void;
  isLoading?: boolean;
  showContextHelp?: boolean;
  onToggleContextHelp?: (show: boolean) => void;
  miniPanel: MiniPanelType;
  onToggleMiniPanel: (panel: "canvas" | "code") => void;
  isNewChat?: boolean;
  branchContext?: {
    isOnBranch: boolean;
    branchTitle: string;
    isMerged?: boolean;
  };
}

export function ChatView({
  chat,
  onSendMessage,
  onBranch,
  onBookmark,
  onToggleBookmarkCollection,
  onCreateBookmarkCollection,
  getCollectionIdsForMessage,
  bookmarkCollections,
  onApprovePlan,
  onRejectPlan,
  isLoading,
  showContextHelp,
  onToggleContextHelp,
  miniPanel,
  onToggleMiniPanel,
  isNewChat,
  branchContext,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatInputCollapsed, setChatInputCollapsed] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.messages, chat?.messages.length]);

  const hasNoMessages = !chat || chat.messages.length === 0;
  const isEmptyMainChat = isNewChat && hasNoMessages;
  const isMergedBranchEmpty = !!branchContext?.isOnBranch && !!branchContext?.isMerged && hasNoMessages;
  const isActiveBranchEmpty = !!branchContext?.isOnBranch && !branchContext?.isMerged && hasNoMessages;

  const handleSend = (message: string) => {
    if (message.toLowerCase().includes("help")) {
      onToggleContextHelp?.(true);
    }
    onSendMessage(message);
  };

  // Reset fullscreen when mini panel closes
  useEffect(() => {
    if (!miniPanel) {
      setIsFullscreen(false);
      setChatInputCollapsed(false);
    }
  }, [miniPanel]);

  const miniPanelHeader = miniPanel && (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-secondary/30 shrink-0">
      <div className="flex items-center gap-1.5">
        {miniPanel === "canvas" ? (
          <Layout className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {miniPanel === "canvas" ? "Canvas" : "Code"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="p-1 rounded hover:bg-secondary transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={() => onToggleMiniPanel(miniPanel)}
          className="p-1 rounded hover:bg-secondary transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );

  const miniPanelContent = miniPanel && (
    <div className="flex h-full flex-col overflow-hidden">
      {miniPanel === "canvas" ? <FreeformView /> : <NotebookView />}
    </div>
  );

  // Fullscreen mode: only show mini panel
  if (isFullscreen && miniPanel) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-secondary/30 shrink-0">
          <div className="flex items-center gap-1.5">
            {miniPanel === "canvas" ? (
              <Layout className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {miniPanel === "canvas" ? "Canvas" : "Code"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-1 rounded hover:bg-secondary transition-colors"
              title="Exit fullscreen"
            >
              <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => onToggleMiniPanel(miniPanel)}
              className="p-1 rounded hover:bg-secondary transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {miniPanel === "canvas" ? <FreeformView /> : <NotebookView />}
        </div>
      </div>
    );
  }

  const { datasets, method } = deriveChatContext(chat?.messages);
  const runningStatus = chat?.messages.some(
    (m) => m.metadata?.type === "executing" &&
      m.metadata.executionSteps?.some((s) => s.status === "running")
  );

  // Step numbering: only "analysis" responses count as steps
  const stepIndexById = new Map<string, number>();
  let stepCounter = 0;
  chat?.messages.forEach((m) => {
    const t = m.metadata?.type;
    if (
      m.role === "assistant" &&
      (t === "plan" || t === "executing" || t === "data-table" || t === "visualizations")
    ) {
      stepCounter += 1;
      stepIndexById.set(m.id, stepCounter);
    }
  });

  const chatContent = (
    <div className="flex flex-col h-full bg-background">
      {/* Persistent context strip — only when chat has messages */}
      {!hasNoMessages && (
        <ContextStrip
          workspace={chat?.title ?? "Workspace"}
          datasets={datasets}
          method={method}
          status={runningStatus ? "running" : "idle"}
        />
      )}

      {isEmptyMainChat ? (
        <StartingCanvas onSend={handleSend} workspace={chat?.title ?? "New analysis"} />
      ) : isMergedBranchEmpty || isActiveBranchEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-6">
            <div className="text-center space-y-2">
              {isMergedBranchEmpty ? (
                <>
                  <h1 className="text-3xl font-semibold text-foreground">Insights saved to the main thread</h1>
                  <p className="text-muted-foreground text-sm">
                    The findings from this exploration have been added to your main analysis. To keep iterating on this variation, ask another question below.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-semibold text-foreground">Continue this exploration</h1>
                  <p className="text-muted-foreground text-sm">
                    Try a variation of your analysis here without affecting the main thread.
                  </p>
                </>
              )}
            </div>
            <div className="w-full">
              <ChatInput
                onSend={handleSend}
                disabled={isLoading}
                onHelpClick={() => onToggleContextHelp?.(true)}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-5 pb-12">
              <AnimatePresence initial={false}>
                {chat.messages.map((msg) => (
                  <DocumentEntry
                    key={msg.id}
                    message={msg}
                    stepNumber={stepIndexById.get(msg.id)}
                    onBranch={() => onBranch?.(msg.id)}
                    onBookmark={() => onBookmark?.(msg.id)}
                    onToggleBookmarkCollection={onToggleBookmarkCollection ? (colId: string) => onToggleBookmarkCollection(msg.id, colId) : undefined}
                    onCreateBookmarkCollection={onCreateBookmarkCollection}
                    activeCollectionIds={getCollectionIdsForMessage?.(msg.id) ?? []}
                    bookmarkCollections={bookmarkCollections ?? []}
                    onApprovePlan={() => onApprovePlan?.(msg.id)}
                    onRejectPlan={() => onRejectPlan?.(msg.id)}
                  />
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 py-4 pl-1"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-xs text-muted-foreground ml-2 uppercase tracking-wider font-medium">Running analysis…</span>
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {showContextHelp && (
                  <ContextControlHelp onClose={() => onToggleContextHelp?.(false)} />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Collapsible chat input */}
          {miniPanel && chatInputCollapsed ? (
            <div className="sticky bottom-0 bg-background border-t border-border px-6 py-1.5 flex justify-center">
              <button
                onClick={() => setChatInputCollapsed(false)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Show chat input
              </button>
            </div>
          ) : (
            <div className="sticky bottom-0 bg-background border-t border-border px-6 pb-4 pt-3">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <ChatInput
                      onSend={handleSend}
                      disabled={isLoading}
                      onHelpClick={() => onToggleContextHelp?.(true)}
                    />
                  </div>
                  {miniPanel && (
                    <button
                      onClick={() => setChatInputCollapsed(true)}
                      className="mt-2 p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                      title="Collapse chat input"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (miniPanel) {
    return (
      <div className="flex flex-col h-full">
        <MiniPanelButtons miniPanel={miniPanel} onToggle={onToggleMiniPanel} />
        <ResizablePanelGroup direction="vertical" className="flex-1">
          <ResizablePanel defaultSize={65} minSize={20}>
            {chatContent}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={35} minSize={15}>
            <div className="flex flex-col h-full">
              {miniPanelHeader}
              {miniPanelContent}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MiniPanelButtons miniPanel={miniPanel} onToggle={onToggleMiniPanel} />
      {chatContent}
    </div>
  );
}

function MiniPanelButtons({
  miniPanel,
  onToggle,
}: {
  miniPanel: MiniPanelType;
  onToggle: (panel: "canvas" | "code") => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1 px-3 py-1.5 border-b border-border bg-secondary/20 shrink-0">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle("canvas")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                miniPanel === "canvas"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              Canvas
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Open Canvas workspace</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle("code")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                miniPanel === "code"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Code
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Open Code editor</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function DocumentEntry({
  message,
  stepNumber,
  onBranch,
  onBookmark,
  onToggleBookmarkCollection,
  onCreateBookmarkCollection,
  activeCollectionIds,
  bookmarkCollections,
  onApprovePlan,
  onRejectPlan,
}: {
  message: ChatMessage;
  stepNumber?: number;
  onBranch: () => void;
  onBookmark: () => void;
  onToggleBookmarkCollection?: (collectionId: string) => void;
  onCreateBookmarkCollection?: (name: string) => void;
  activeCollectionIds: string[];
  bookmarkCollections: BookmarkCollection[];
  onApprovePlan?: () => void;
  onRejectPlan?: () => void;
}) {
  const isUser = message.role === "user";
  const metaType = message.metadata?.type;
  const contributor = isUser ? getContributorForId(message.id) : null;

  const inlineActions = (
    <div className="flex items-center gap-1 mt-2">
      <button className="p-1 rounded hover:bg-secondary transition-colors" title="Copy">
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <button className="p-1 rounded hover:bg-secondary transition-colors" title="Helpful">
        <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <button className="p-1 rounded hover:bg-secondary transition-colors" title="Not helpful">
        <ThumbsDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <BookmarkPopover
        isBookmarked={!!message.bookmarked}
        activeCollectionIds={activeCollectionIds}
        collections={bookmarkCollections}
        onToggleCollection={(colId) => onToggleBookmarkCollection?.(colId)}
        onCreateCollection={(name) => onCreateBookmarkCollection?.(name)}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onBranch} className="p-1 rounded hover:bg-secondary transition-colors">
              <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top"><p>Explore another direction</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  // ===== USER PROMPT — rendered as a "researcher note", single column, no bubble =====
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="border-l-2 border-foreground/30 pl-4 py-1"
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
            style={{ backgroundColor: contributor?.color ?? "hsl(var(--muted))" }}
            title={contributor ? `${contributor.name} · ${contributor.team}` : undefined}
          >
            {contributor?.initials ?? "U"}
          </div>
          <span className="text-xs font-medium text-foreground">
            {contributor?.name ?? "You"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            asked · {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p
          className="text-sm text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: message.content
              .replace(/\/([\w-]+)/g, '<span class="text-violet-600 font-medium">/$1</span>')
              .replace(/@([\w-]+)/g, '<span class="text-sky-600 font-medium">@$1</span>'),
          }}
        />
      </motion.div>
    );
  }

  // ===== ANALYSIS RESPONSES — wrapped in AnalysisStepBlock (numbered, sectioned) =====
  const isAnalysis =
    metaType === "plan" ||
    metaType === "executing" ||
    metaType === "data-table" ||
    metaType === "visualizations";

  if (isAnalysis && stepNumber) {
    const datasets = (message.metadata?.contextUsed ?? []).filter((c) => /^[A-Z]/.test(c));
    const methodTag = (message.metadata?.contextUsed ?? []).find((c) => !/^[A-Z]/.test(c));
    const isRunning =
      metaType === "executing" &&
      message.metadata?.executionSteps?.some((s) => s.status === "running");

    let title = "Analysis step";
    let resultNode: React.ReactNode = null;
    let interpretationNode: React.ReactNode = null;

    if (metaType === "plan" && message.metadata?.plan) {
      title = message.metadata.plan.title ?? "Proposed plan";
      resultNode = (
        <ProposedPlan
          plan={message.metadata.plan}
          onApprove={() => onApprovePlan?.()}
          onReject={() => onRejectPlan?.()}
          onEdit={() => {}}
        />
      );
    } else if (metaType === "executing") {
      title = "Executing analysis";
      resultNode = (
        <>
          {message.metadata?.executionSteps && (
            <TaskExecution
              steps={message.metadata.executionSteps}
              completedCount={message.metadata.executionSteps.filter(s => s.status === "complete").length}
              totalCount={message.metadata.executionSteps.length}
            />
          )}
          {message.metadata?.thoughtProcess && message.metadata.thoughtProcess.length > 0 && (
            <ThoughtProcess
              entries={message.metadata.thoughtProcess}
              isLive={isRunning}
            />
          )}
        </>
      );
    } else if (metaType === "data-table" && message.metadata?.dataTable) {
      title = "Tabular result";
      resultNode = (
        <DataTable
          columns={message.metadata.dataTable.columns}
          data={message.metadata.dataTable.data}
        />
      );
      if (message.content) {
        interpretationNode = (
          <div className="prose prose-sm max-w-none text-foreground prose-p:text-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        );
      }
    } else if (metaType === "visualizations") {
      title = "Visualization & findings";
      resultNode = (
        <div className="space-y-3">
          {message.metadata?.dataTable && (
            <DraggableVisualization type="datatable" title="Data Table">
              <DataTable
                columns={message.metadata.dataTable.columns}
                data={message.metadata.dataTable.data}
              />
            </DraggableVisualization>
          )}
          {message.metadata?.showVolcano && (
            <DraggableVisualization type="volcano" title="Volcano Plot">
              <VolcanoPlot />
            </DraggableVisualization>
          )}
          {message.metadata?.showHeatmap && (
            <DraggableVisualization type="heatmap" title="Expression Heatmap">
              <HeatmapChart />
            </DraggableVisualization>
          )}
        </div>
      );
      if (message.content) {
        interpretationNode = (
          <div className="prose prose-sm max-w-none text-foreground prose-p:text-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        );
      }
    }

    return (
      <AnalysisStepBlock
        stepNumber={stepNumber}
        title={title}
        status={isRunning ? "running" : "complete"}
        datasets={datasets}
        method={methodTag ?? null}
        result={resultNode}
        interpretation={interpretationNode}
        onRefine={onBookmark}
        onBranch={onBranch}
        onSaveAsMethod={onBookmark}
      />
    );
  }

  // ===== Plain assistant prose — document paragraph (no bubble, no avatar) =====
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="py-1"
    >
      {message.metadata?.contextUsed && message.metadata.contextUsed.length > 0 && (
        <ContextTags tags={message.metadata.contextUsed} variant="assistant" />
      )}
      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground">
        <ReactMarkdown
          components={{
            p: ({ children }) => {
              const processNode = (node: React.ReactNode): React.ReactNode => {
                if (typeof node === 'string') {
                  const parts = node.split(/(\/[\w-]+)/g);
                  if (parts.length === 1) return node;
                  return <>{parts.map((part, i) =>
                    /^\/[\w-]+$/.test(part)
                      ? <span key={i} className="text-violet-500 font-medium">{part}</span>
                      : part
                  )}</>;
                }
                return node;
              };
              const processed = Array.isArray(children) ? children.map(processNode) : processNode(children);
              return <p>{processed}</p>;
            },
          }}
        >{message.content}</ReactMarkdown>
      </div>
      {inlineActions}
    </motion.div>
  );
}

