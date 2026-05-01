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

  const chatContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-200/60 via-sky-100/30 to-background">
      {isEmptyMainChat || isMergedBranchEmpty || isActiveBranchEmpty ? (
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
              ) : isActiveBranchEmpty ? (
                <>
                  <h1 className="text-3xl font-semibold text-foreground">Continue this exploration</h1>
                  <p className="text-muted-foreground text-sm">
                    Try a variation of your analysis here without affecting the main thread.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-semibold text-foreground">Start exploring</h1>
                  <p className="text-muted-foreground text-sm">Ask me questions about your data and generate research hypotheses</p>
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
            {!branchContext?.isOnBranch && <SuggestionChips onSelect={handleSend} />}
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-6 pb-12">
              <AnimatePresence initial={false}>
                {chat.messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
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
                  className="flex items-center gap-3 py-4"
                >
                  <img src={ellumigenLogo} alt="Processing" className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-sm text-muted-foreground ml-2">Processing analysis...</span>
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

function MessageBubble({
  message,
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
  const assistantActions = (
    <div className="flex items-center gap-1 mt-3 -ml-1">
      <button className="p-1 rounded hover:bg-secondary transition-colors">
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <button className="p-1 rounded hover:bg-secondary transition-colors">
        <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <button className="p-1 rounded hover:bg-secondary transition-colors">
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
            <button
              onClick={onBranch}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Explore another direction</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}
    >
      {!isUser && (
        <img src={ellumigenLogo} alt="Ellumigen" className="w-8 h-8 rounded-full shrink-0 mt-1 object-cover" />
      )}

      <div className={`max-w-[85%]`}>
        {isUser ? (
          <div>
            <div className="bg-background text-foreground rounded-2xl rounded-br-md px-4 py-3 border border-border">
              <p className="text-sm" dangerouslySetInnerHTML={{
                __html: message.content.replace(
                  /\/([\w-]+)/g,
                  '<span class="text-violet-600 font-medium">/$1</span>'
                ),
              }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ) : metaType === "plan" && message.metadata?.plan ? (
          <div className="w-full">
            <ProposedPlan
              plan={message.metadata.plan}
              onApprove={() => onApprovePlan?.()}
              onReject={() => onRejectPlan?.()}
              onEdit={() => {}}
            />
            {assistantActions}
          </div>
        ) : metaType === "executing" ? (
          <div className="w-full">
            {message.metadata?.thoughtProcess && message.metadata.thoughtProcess.length > 0 && (
              <ThoughtProcess
                entries={message.metadata.thoughtProcess}
                isLive={message.metadata.executionSteps?.some(s => s.status === "running")}
              />
            )}
            {message.metadata?.executionSteps && (
              <TaskExecution
                steps={message.metadata.executionSteps}
                completedCount={message.metadata.executionSteps.filter(s => s.status === "complete").length}
                totalCount={message.metadata.executionSteps.length}
              />
            )}
            {assistantActions}
          </div>
        ) : metaType === "data-table" && message.metadata?.dataTable ? (
          <div className="w-full">
            {message.content && (
              <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground mb-4">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
            <DataTable
              columns={message.metadata.dataTable.columns}
              data={message.metadata.dataTable.data}
            />
            {assistantActions}
          </div>
        ) : metaType === "visualizations" ? (
          <div className="w-full space-y-4">
            {message.content && (
              <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
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
            {assistantActions}
          </div>
        ) : (
          <div>
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
            {assistantActions}
          </div>
        )}
      </div>

      {isUser && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-1"
          style={{ backgroundColor: contributor?.color ?? "hsl(var(--muted))" }}
          title={contributor ? `${contributor.name} · ${contributor.team}` : undefined}
        >
          {contributor?.initials ?? "U"}
        </div>
      )}
    </motion.div>
  );
}
