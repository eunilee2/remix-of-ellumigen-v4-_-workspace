import { Share2, Map, Sparkles, ArrowLeft, Settings } from "lucide-react";

interface TopBarProps {
  chatTitle?: string;
  chatSubtitle?: string;
  isLoading?: boolean;
  lastMessageTime?: string;
  branchContext?: {
    isOnBranch: boolean;
    branchTitle: string;
    parentTitle: string;
    isMerged?: boolean;
  };
  onOpenConversationMap?: () => void;
  onCloseConversationMap?: () => void;
  onBringToMain?: () => void; // keep prop name for backwards-compat; triggers Combine flow
  onReturnToMain?: () => void;
  showConversationMap?: boolean;
}

export function TopBar({
  chatTitle,
  chatSubtitle,
  isLoading,
  lastMessageTime,
  branchContext,
  onOpenConversationMap,
  onCloseConversationMap,
  onBringToMain,
  onReturnToMain,
  showConversationMap,
}: TopBarProps) {
  const isOnBranch = branchContext?.isOnBranch;

  return (
    <div className="flex flex-col border-b border-border bg-background">
      {/* Branch context bar */}
      {isOnBranch && (
        <div className="flex items-center justify-between px-5 py-2.5 bg-muted/50 border-b border-border">
          <span className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: branchContext?.isMerged ? "#9333ea" : "#a78bfa" }}
              aria-hidden
            />
            {branchContext?.isMerged ? (
              <>Saved to <span className="font-medium text-foreground">{branchContext?.parentTitle}</span> · <span className="italic">{branchContext?.branchTitle}</span></>
            ) : (
              <>Exploring a variation: <span className="font-medium text-foreground">{branchContext?.branchTitle}</span> · branched from <span className="italic">{branchContext?.parentTitle}</span></>
            )}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {!branchContext?.isMerged && (
              <button
                onClick={onBringToMain}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                title="Combine the insights from this exploration into the main thread"
              >
                <Sparkles className="w-3 h-3" />
                Combine insights
              </button>
            )}
            <button
              onClick={onReturnToMain}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to main thread
            </button>
          </div>
        </div>
      )}

      {/* Main top bar */}
      <header className="flex items-center justify-between px-5 py-3">
        <div className="flex flex-col min-w-0">
          <span className="text-base font-semibold text-foreground truncate">
            {chatTitle || "Chat"}
          </span>
          {chatSubtitle && (
            <span className="text-xs text-blue-500">{chatSubtitle}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          {isLoading ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-border text-orange-500">
              <Settings className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
              Currently Running
            </span>
          ) : lastMessageTime ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
              {lastMessageTime}
            </span>
          ) : null}
          <button
            onClick={showConversationMap ? onCloseConversationMap : onOpenConversationMap}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              showConversationMap
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Map
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </header>
    </div>
  );
}
