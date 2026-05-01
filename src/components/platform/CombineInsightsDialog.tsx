import { Sparkles, X } from "lucide-react";
import type { ChatBranch } from "@/types/chat";

interface CombineInsightsDialogProps {
  open: boolean;
  branch: ChatBranch | null;
  parentTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Friendly, non-technical replacement for "merge to main".
 * Shows a preview of what will be added to the shared workspace
 * before the user commits.
 */
export function CombineInsightsDialog({
  open,
  branch,
  parentTitle,
  onConfirm,
  onCancel,
}: CombineInsightsDialogProps) {
  if (!open || !branch) return null;

  const messageCount = branch.messages.length;
  const previewMessages = branch.messages.slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg bg-background border border-border rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Combine insights</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add the findings from <span className="italic">{branch.label}</span> to the
                main thread of <span className="font-medium text-foreground">{parentTitle}</span>.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[320px] overflow-y-auto">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">
            What will be added
          </div>
          {messageCount === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              This exploration doesn't have any messages yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {previewMessages.map((m) => (
                <li
                  key={m.id}
                  className="text-xs px-3 py-2 rounded-md bg-muted/60 border border-border/60"
                >
                  <span className="font-medium text-foreground">
                    {m.role === "user" ? "You" : "Ellumigen"}:
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {m.content.slice(0, 140)}
                    {m.content.length > 140 ? "…" : ""}
                  </span>
                </li>
              ))}
              {messageCount > 3 && (
                <li className="text-[11px] text-muted-foreground pl-1">
                  …and {messageCount - 3} more message{messageCount - 3 === 1 ? "" : "s"}
                </li>
              )}
            </ul>
          )}

          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
            This is reversible — your exploration stays available in the analysis paths
            sidebar so you can compare or duplicate it later.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors"
          >
            Keep exploring
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Add to shared workspace
          </button>
        </div>
      </div>
    </div>
  );
}
