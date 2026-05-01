import { Database, FlaskConical, FolderOpen, Activity } from "lucide-react";

interface ContextStripProps {
  workspace: string;
  datasets: string[];
  method?: string | null;
  status?: "idle" | "running";
}

/**
 * Persistent inline context header — sits above the chat document
 * to reinforce that the user is in a research workspace, not a chatbot.
 */
export function ContextStrip({
  workspace,
  datasets,
  method,
  status = "idle",
}: ContextStripProps) {
  return (
    <div className="border-b border-border bg-secondary/30 px-6 py-2 shrink-0">
      <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {/* Workspace */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">{workspace}</span>
        </div>

        <Separator />

        {/* Datasets */}
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-muted-foreground">Dataset:</span>
          {datasets.length > 0 ? (
            <div className="flex items-center gap-1">
              {datasets.slice(0, 3).map((d) => (
                <span
                  key={d}
                  className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-medium border border-sky-200"
                >
                  @{d}
                </span>
              ))}
              {datasets.length > 3 && (
                <span className="text-muted-foreground">+{datasets.length - 3}</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground italic">none</span>
          )}
        </div>

        <Separator />

        {/* Method */}
        <div className="flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5 text-violet-600" />
          <span className="text-muted-foreground">Method:</span>
          {method ? (
            <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 font-medium border border-violet-200">
              /{method}
            </span>
          ) : (
            <span className="text-muted-foreground italic">none</span>
          )}
        </div>

        {/* Status indicator on the right */}
        <div className="ml-auto flex items-center gap-1.5">
          <Activity
            className={`w-3.5 h-3.5 ${
              status === "running" ? "text-amber-500 animate-pulse" : "text-emerald-500"
            }`}
          />
          <span className="text-muted-foreground">
            {status === "running" ? "Running analysis…" : "Idle"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Separator() {
  return <span className="text-border">·</span>;
}
