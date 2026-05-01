import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { AppSidebar, type SidebarView } from "@/components/platform/AppSidebar";
import { TopBar } from "@/components/platform/TopBar";
import { ChatView, type MiniPanelType } from "@/components/platform/ChatView";
import { WorkspaceView } from "@/components/platform/WorkspaceView";
import { WorkspaceOverviewView } from "@/components/platform/WorkspaceOverviewView";
import { HistoryView } from "@/components/platform/HistoryView";
import { UseCasesView } from "@/components/platform/UseCasesView";
import { ArtifactsView } from "@/components/platform/ArtifactsView";
import { MethodsView } from "@/components/platform/MethodsView";
import { ConversationMap, type MapNode } from "@/components/platform/ConversationMap";
import { PanelHeader } from "@/components/platform/ModeTabs";
import { CombineInsightsDialog } from "@/components/platform/CombineInsightsDialog";
import { RelatedThreadsPanel } from "@/components/platform/chat/RelatedThreadsPanel";
import { useChatStore } from "@/stores/chatStore";
import { buildBranchTreeFromMessages, branchTreeToMapNodes } from "@/lib/branchTreeBuilder";
import { getWorkspaceForChat, getWorkspaceIdForChat } from "@/lib/workspaces";
import type { InterfaceMode, TaskStep, ThoughtEntry, DataTableConfig } from "@/types/chat";

// ── Demo data ─────────────────────────────────────────────

const DEMO_PLAN = {
  title: "Proposed Response Plan",
  subtitle: "Review before generation",
  approach: [
    "Load TCGA RNA-seq expression data",
    "Filter samples by TP53 mutation status (wildtype vs mutant)",
    "Perform differential expression analysis using DESeq2",
    "Apply FDR correction (p-value threshold: 0.05)",
    "Generate volcano plot and heatmap visualizations",
  ],
  dataSources: ["@TCGA-BRCA", "@TCGA-LUAD expression matrices"],
  estimatedLength: "~800 words",
  statisticalDepth: "Advanced",
};

const EXECUTION_STEPS: TaskStep[] = [
  { id: "s1", label: "Loading TCGA RNA-seq expression data", status: "pending" },
  { id: "s2", label: "Filtering samples by TP53 mutation status", status: "pending" },
  { id: "s3", label: "Running differential expression analysis (DESeq2)", status: "pending" },
  { id: "s4", label: "Applying FDR correction", status: "pending" },
  { id: "s5", label: "Generating visualizations", status: "pending" },
  { id: "s6", label: "Synthesizing results", status: "pending" },
];

const THOUGHT_ENTRIES: ThoughtEntry[] = [
  { text: "Connecting to TCGA data repository...", type: "normal" },
  { text: "Found 1,098 samples in TCGA-BRCA dataset", type: "normal" },
  { text: "Found 515 samples in TCGA-LUAD dataset", type: "normal" },
  { text: "Total expression matrix: 1,613 samples × 20,531 genes", type: "success" },
  { text: "Querying mutation annotation files for TP53 status...", type: "normal" },
  { text: "Identified 487 TP53 wildtype samples", type: "normal" },
  { text: "Identified 412 TP53 mutant samples", type: "normal" },
  { text: "Stratifying samples into comparison groups", type: "success" },
  { text: "Initializing DESeq2 pipeline with default parameters", type: "normal" },
  { text: "Estimating size factors across samples...", type: "normal" },
  { text: "Estimating dispersion for 20,531 genes...", type: "normal" },
  { text: "Fitting negative binomial GLM", type: "normal" },
  { text: "Wald test complete — 3,847 significant genes (padj < 0.05)", type: "success" },
  { text: "Applying Benjamini-Hochberg FDR correction...", type: "normal" },
  { text: "2,194 genes pass FDR threshold", type: "success" },
  { text: "Rendering volcano plot with log2FC vs -log10(p-value)...", type: "normal" },
  { text: "Generating hierarchical clustering heatmap...", type: "normal" },
  { text: "Visualizations rendered successfully", type: "success" },
  { text: "Compiling final analysis summary...", type: "highlight" },
];

const FINAL_RESPONSE = `## Differential Expression Analysis Results

Based on the **@TCGA-BRCA** and **@TCGA-LUAD** expression matrices, here are the key findings from the TP53 wildtype vs mutant comparison:

### Key Statistics
- **Total samples analyzed**: 1,613 (899 TP53 wildtype, 714 TP53 mutant)
- **Significant DEGs**: 2,194 genes (FDR < 0.05)
- **Upregulated in mutant**: 1,247 genes
- **Downregulated in mutant**: 947 genes

### Top Differentially Expressed Genes
| Gene | log2FC | Adjusted p-value | Direction |
|------|--------|-------------------|-----------|
| MDM2 | 3.42 | 1.2×10⁻¹⁵ | Up |
| CDKN1A | -2.87 | 3.4×10⁻¹² | Down |
| BAX | 2.15 | 7.8×10⁻¹¹ | Up |
| BCL2 | -1.93 | 2.1×10⁻⁹ | Down |

### Pathway Enrichment
The top enriched pathways in TP53 mutant samples include:
1. **p53 signaling pathway** (p = 4.2×10⁻¹²)
2. **Apoptosis regulation** (p = 1.8×10⁻⁹)
3. **Cell cycle checkpoint** (p = 3.5×10⁻⁸)
4. **DNA damage response** (p = 7.1×10⁻⁷)

The volcano plot and heatmap visualizations are available in the Artifacts tab.`;

const DEMO_TABLE: DataTableConfig = {
  columns: [
    { key: "disease", label: "Disease" },
    { key: "sample_count", label: "Sample_count" },
  ],
  data: [
    { disease: "melanoma", sample_count: 48 },
    { disease: "normal", sample_count: 171 },
    { disease: "breast cancer", sample_count: 83 },
    { disease: "adenocarcinoma", sample_count: 73 },
    { disease: "copd", sample_count: 98 },
    { disease: "acute monocytic leukemia", sample_count: 45 },
    { disease: "colorectal carcinoma", sample_count: 161 },
  ],
};

const FIRST_EXCHANGE_RESPONSE = `Based on the **@TCGA-BRCA** dataset, I've performed a comprehensive survival analysis across molecular subtypes using the **/statistical-analysis** methods.

The analysis reveals significant differences in overall survival between Luminal A, Luminal B, HER2-enriched, and Basal-like subtypes (log-rank p < 0.001). Luminal A patients demonstrate the most favorable outcomes with a median survival of 15.2 years, while Basal-like subtype shows reduced survival at 8.7 years.`;




// ── Component ─────────────────────────────────────────────

export default function Index() {
  const store = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>("workspace");
  const [showContextHelp, setShowContextHelp] = useState(false);
  const [miniPanel, setMiniPanel] = useState<MiniPanelType>(null);
  const [showConversationMap, setShowConversationMap] = useState(false);
  const [activeMapNodeId, setActiveMapNodeId] = useState<string>("mn4");
  const [showCombineDialog, setShowCombineDialog] = useState(false);

  // Auto-open canvas panel when dragging a visualization
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("application/ellumigen-viz")) {
        setMiniPanel("canvas");
      }
    };
    window.addEventListener("dragover", handleDragOver);
    return () => window.removeEventListener("dragover", handleDragOver);
  }, []);

  const toggleMiniPanel = useCallback((panel: "canvas" | "code") => {
    setMiniPanel((prev) => (prev === panel ? null : panel));
  }, []);

  // Refs for managing the execution animation
  const executionTimers = useRef<NodeJS.Timeout[]>([]);

  // No pre-population — chat starts blank

  // No rename needed — demo chat already named "TCGA-BRCA outcomes"

  // ── Shared execution animation ──
  const animateExecution = useCallback(
    (chatId: string, messageId: string) => {
      executionTimers.current.forEach(clearTimeout);
      executionTimers.current = [];

      const stepDurations = [1500, 2000, 2500, 1800, 2200, 1500];
      let elapsed = 0;
      let thoughtIndex = 0;
      const thoughtsPerStep = [3, 4, 5, 2, 2, 1];

      EXECUTION_STEPS.forEach((step, i) => {
        const startTimer = setTimeout(() => {
          store.updateExecutionStep(chatId, messageId, step.id, "running");
        }, elapsed);
        executionTimers.current.push(startTimer);

        const thoughtCount = thoughtsPerStep[i] || 1;
        for (let t = 0; t < thoughtCount && thoughtIndex < THOUGHT_ENTRIES.length; t++) {
          const thoughtDelay = elapsed + (stepDurations[i] / (thoughtCount + 1)) * (t + 1);
          const entryIdx = thoughtIndex;
          const timer = setTimeout(() => {
            store.addThoughtEntry(chatId, messageId, THOUGHT_ENTRIES[entryIdx]);
          }, thoughtDelay);
          executionTimers.current.push(timer);
          thoughtIndex++;
        }

        elapsed += stepDurations[i];
        const completeTimer = setTimeout(() => {
          store.updateExecutionStep(chatId, messageId, step.id, "complete", `${(stepDurations[i] / 1000).toFixed(1)}s`);
        }, elapsed);
        executionTimers.current.push(completeTimer);
      });

      while (thoughtIndex < THOUGHT_ENTRIES.length) {
        const entryIdx = thoughtIndex;
        const delay = elapsed + 200 * thoughtIndex;
        const timer = setTimeout(() => {
          store.addThoughtEntry(chatId, messageId, THOUGHT_ENTRIES[entryIdx]);
        }, delay);
        executionTimers.current.push(timer);
        thoughtIndex++;
      }

      const finalTimer = setTimeout(() => {
        store.addMessage(chatId, {
          role: "assistant",
          content: FINAL_RESPONSE,
          metadata: {
            contextUsed: ["TCGA-BRCA", "TCGA-LUAD"],
          },
        });
      }, elapsed + 1000);
      executionTimers.current.push(finalTimer);
    },
    [store]
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      let chatId = store.activeChatId;
      if (!chatId) {
        const newChat = store.createChat();
        chatId = newChat.id;
      }

      const chat = store.chats.find((c) => c.id === chatId);
      const isTcgaDemo = chat?.title === "TCGA-BRCA outcomes";

      store.addMessage(chatId, { role: "user", content }, store.activeBranchId);
      setIsLoading(true);

      // Check for graph/table/visualization keywords FIRST (applies to all chats)
      const isGraphRequest = /graph|chart|plot|visuali|table|dataset|findings|outliers|heatmap|volcano/i.test(content);
      const hasDatasetAndSkill = /@TCGA-BRCA/i.test(content) && /\/statistical-analysis/i.test(content);
      const hasAnalyze = /analyze/i.test(content);

      if (isGraphRequest) {
        setTimeout(() => {
          store.addMessage(chatId!, {
            role: "assistant",
            content: "Here's the dataset overview along with the volcano plot and expression heatmap for the top differentially expressed genes:",
            metadata: {
              type: "visualizations",
              dataTable: DEMO_TABLE,
              showVolcano: true,
              showHeatmap: true,
            },
          }, store.activeBranchId);
          setIsLoading(false);
        }, 1200);
      } else if (hasAnalyze) {
        // "Analyze" triggers the Reasoning/Plan workflow in any chat
        setTimeout(() => {
          store.addMessage(chatId!, {
            role: "assistant",
            content: "",
            metadata: { type: "plan", plan: DEMO_PLAN },
          }, store.activeBranchId);
          setIsLoading(false);
        }, 1200);
      } else if (hasDatasetAndSkill) {
        setTimeout(() => {
          store.addMessage(chatId!, {
            role: "assistant",
            content: FIRST_EXCHANGE_RESPONSE,
            metadata: {
              contextUsed: ["TCGA-BRCA", "statistical-analysis"],
            },
          }, store.activeBranchId);
          setIsLoading(false);
        }, 1200);
    } else {
        // Build conversation history for AI, including the latest user message
        const chatMessages = store.chats.find((c) => c.id === chatId)?.messages || [];
        const history = [
          ...chatMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content },
        ];

        const fetchAIResponse = async () => {
          try {
            const resp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ messages: history }),
              }
            );
            if (!resp.ok) throw new Error("AI request failed");
            const data = await resp.json();
            store.addMessage(chatId!, {
              role: "assistant",
              content: data.content || "I couldn't generate a response. Please try again.",
            }, store.activeBranchId);
          } catch (err) {
            console.error("AI chat error:", err);
            store.addMessage(chatId!, {
              role: "assistant",
              content: "Sorry, I encountered an error generating a response. Please try again.",
            }, store.activeBranchId);
          } finally {
            setIsLoading(false);
          }
        };
        fetchAIResponse();
      }
    },
    [store, animateExecution]
  );

  const handleApprovePlan = useCallback(
    (messageId: string) => {
      if (!store.activeChatId) return;
      store.updateMessageMetadata(store.activeChatId, messageId, {
        type: "executing",
        executionSteps: EXECUTION_STEPS.map((s) => ({ ...s })),
        thoughtProcess: [],
      });
      animateExecution(store.activeChatId, messageId);
    },
    [store, animateExecution]
  );

  const handleRejectPlan = useCallback(
    (messageId: string) => {
      if (!store.activeChatId) return;
      // Remove the plan message
      store.removeMessage(store.activeChatId, messageId);
    },
    [store]
  );

  const handleBranch = useCallback(
    (messageId: string) => {
      if (store.activeChatId) {
        store.branchChat(store.activeChatId, messageId);
      }
    },
    [store]
  );

  const handleBookmark = useCallback(
    (messageId: string) => {
      if (store.activeChatId) {
        store.toggleBookmark(store.activeChatId, messageId);
      }
    },
    [store]
  );

  const handleSelectChat = useCallback(
    (id: string) => {
      store.setActiveChatId(id);
      setActiveView("chat");
    },
    [store]
  );

  const handleNewChat = useCallback(() => {
    store.createChat();
    setActiveView("chat");
  }, [store]);

  const handleStartExample = useCallback(
    (chatTitle: string, userMessage: string, assistantMessage: string) => {
      store.createChat({
        title: chatTitle,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: assistantMessage },
        ],
      });
      setActiveView("chat");
    },
    [store]
  );

  const handleOpenConversationMap = useCallback(() => {
    setShowConversationMap(true);
  }, []);

  const handleBringToMain = useCallback(() => {
    // Open the friendly "Combine insights" confirmation dialog
    // instead of merging immediately. The actual merge happens on confirm.
    if (store.activeChatId && store.activeBranchId) {
      setShowCombineDialog(true);
    }
  }, [store.activeChatId, store.activeBranchId]);

  const handleConfirmCombine = useCallback(() => {
    if (store.activeChatId && store.activeBranchId) {
      store.mergeBranch(store.activeChatId, store.activeBranchId);
    }
    setShowCombineDialog(false);
    setShowConversationMap(false);
  }, [store]);

  const handleReturnToMain = useCallback(() => {
    store.switchToBranch(null);
    setShowConversationMap(false);
  }, [store]);

  const mapNodes = useMemo(() => {
    if (!store.activeChat) return [];
    return branchTreeToMapNodes(buildBranchTreeFromMessages(store.activeChat.messages, store.activeChat.branches, isLoading, store.activeBranchId));
  }, [store.activeChat, isLoading, store.activeBranchId]);

  const handleSelectMapNode = useCallback((nodeId: string) => {
    setActiveMapNodeId(nodeId);
    // Find the map node to determine if it's a branch node
    const mapNode = mapNodes.find((n) => n.id === nodeId);
    if (mapNode?.branchId) {
      // It's a branch node — switch to that branch
      store.switchToBranch(mapNode.branchId);
    } else {
      // It's a main thread node — switch back to main
      store.switchToBranch(null);
    }
    setShowConversationMap(false);
  }, [mapNodes, store]);

  const handleAddMapBranch = useCallback((parentNodeId: string) => {
    // Find the node to determine context — navigate to the correct chat/branch to continue
    const mapNode = mapNodes.find((n) => n.id === parentNodeId);
    if (mapNode?.branchId) {
      store.switchToBranch(mapNode.branchId);
    } else {
      store.switchToBranch(null);
    }
    setShowConversationMap(false);
  }, [mapNodes, store]);

  const branchContext = activeView === "chat" && store.activeBranchId && store.activeBranch
    ? { isOnBranch: true, branchTitle: store.activeBranch.label, parentTitle: store.activeChat?.title || "", isMerged: !!store.activeBranch.merged }
    : undefined;

  // When on a branch, show only the branch's own messages (blank slate)
  const viewChat = useMemo(() => {
    if (!store.activeChat) return null;
    if (!store.activeBranchId || !store.activeBranch) return store.activeChat;
    return { ...store.activeChat, messages: [...store.activeBranch.messages] };
  }, [store.activeChat, store.activeBranchId, store.activeBranch]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        chats={store.chats}
        folders={store.folders}
        bookmarkedMessages={store.bookmarkedMessages}
        bookmarkCollections={store.bookmarkCollections}
        activeChatId={store.activeChatId}
        activeView={activeView}
        branchTreeNodes={activeView === "chat" && store.activeChat && store.activeChat.messages.length > 0 ? buildBranchTreeFromMessages(store.activeChat.messages, store.activeChat.branches, isLoading, store.activeBranchId) : undefined}
        onSelectChat={handleSelectChat}
        onSelectBranchNode={(nodeId) => { store.switchToBranch(null); }}
        onSelectBranch={(branchId) => store.switchToBranch(branchId)}
        onNewChat={handleNewChat}
        onViewChange={setActiveView}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeView === "chat" && (
          <TopBar
            chatTitle={store.activeChat?.title}
            chatSubtitle="Dataset name"
            isLoading={isLoading}
            lastMessageTime={(() => {
              const msgs = store.activeChat?.messages;
              if (!msgs || msgs.length === 0) return undefined;
              const last = msgs[msgs.length - 1];
              if (last.timestamp) {
                const diff = Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 60000);
                if (diff < 1) return "Just now";
                if (diff < 60) return `${diff} min ago`;
                if (diff < 1440) return `${Math.floor(diff / 60)} hrs ago`;
                return "Yesterday";
              }
              return "Just now";
            })()}
            branchContext={branchContext}
            onOpenConversationMap={handleOpenConversationMap}
            onCloseConversationMap={() => setShowConversationMap(false)}
            onBringToMain={handleBringToMain}
            onReturnToMain={handleReturnToMain}
            showConversationMap={showConversationMap}
          />
        )}

        {showConversationMap && activeView === "chat" && store.activeChat ? (
          <ConversationMap
            title={store.activeChat.title}
            subtitle=""
            nodes={mapNodes}
            activeNodeId={activeMapNodeId}
            onSelectNode={handleSelectMapNode}
            onAddBranch={handleAddMapBranch}
            onBringToMain={handleBringToMain}
            onReturnToMain={handleReturnToMain}
            onClose={() => setShowConversationMap(false)}
            isOnBranch={!!store.activeBranchId}
          />
        ) : activeView === "workspace" ? (
          <WorkspaceView onStartExample={handleStartExample} />
        ) : activeView === "history" ? (
          <HistoryView chats={store.chats} onSelectChat={handleSelectChat} />
        ) : activeView === "usecases" ? (
          <UseCasesView />
        ) : activeView === "artifacts" ? (
          <ArtifactsView />
        ) : activeView === "methods" ? (
          <MethodsView />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatView
              chat={viewChat}
              onSendMessage={handleSendMessage}
              onBranch={handleBranch}
              onBookmark={handleBookmark}
              onToggleBookmarkCollection={(messageId, colId) => {
                if (store.activeChatId) store.toggleBookmarkCollection(store.activeChatId, messageId, colId);
              }}
              onCreateBookmarkCollection={store.createBookmarkCollection}
              getCollectionIdsForMessage={store.getCollectionIdsForMessage}
              bookmarkCollections={store.bookmarkCollections}
              onApprovePlan={handleApprovePlan}
              onRejectPlan={handleRejectPlan}
              isLoading={isLoading}
              showContextHelp={showContextHelp}
              onToggleContextHelp={setShowContextHelp}
              miniPanel={miniPanel}
              onToggleMiniPanel={toggleMiniPanel}
              isNewChat={!store.activeBranchId}
              branchContext={branchContext}
            />
          </div>
        )}
      </div>

      <CombineInsightsDialog
        open={showCombineDialog}
        branch={store.activeBranch}
        parentTitle={store.activeChat?.title || "main thread"}
        onConfirm={handleConfirmCombine}
        onCancel={() => setShowCombineDialog(false)}
      />
    </div>
  );
}
