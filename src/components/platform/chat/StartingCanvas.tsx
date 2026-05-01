import { motion } from "framer-motion";
import {
  Upload,
  History,
  Sparkles,
  Layers,
  GitCompare,
  Boxes,
  Microscope,
  ArrowRight,
} from "lucide-react";

interface StartingCanvasProps {
  onSend: (prompt: string) => void;
  onUpload?: () => void;
  onResumeWorkflow?: () => void;
  workspace?: string;
}

const QUICK_ACTIONS = [
  {
    id: "upload",
    icon: Upload,
    title: "Upload dataset",
    description: "Bring in CSV, TSV or H5AD files to start analyzing",
    accent: "sky",
    prompt: "I'd like to upload a new dataset to begin analysis.",
  },
  {
    id: "resume",
    icon: History,
    title: "Start from previous workflow",
    description: "Continue where you left off in a prior analysis",
    accent: "violet",
    prompt: "Resume my last workflow and summarize where I left off.",
  },
  {
    id: "sample",
    icon: Sparkles,
    title: "Explore sample analysis",
    description: "Walk through a guided tour using @TCGA-BRCA",
    accent: "amber",
    prompt: "Walk me through a sample analysis using @TCGA-BRCA.",
  },
] as const;

const TEMPLATES = [
  {
    id: "compare",
    icon: GitCompare,
    title: "Compare datasets",
    description: "Differential expression across two cohorts",
    prompt: "Compare two datasets and run differential expression analysis.",
  },
  {
    id: "cluster",
    icon: Boxes,
    title: "Run clustering",
    description: "Group samples by expression similarity",
    prompt: "Run /clustering on @TCGA-BRCA and visualize the clusters.",
  },
  {
    id: "pathway",
    icon: Layers,
    title: "Pathway enrichment",
    description: "GO, KEGG, Reactome on a gene list",
    prompt: "Run /pathway-enrichment on the top differentially expressed genes.",
  },
  {
    id: "explore",
    icon: Microscope,
    title: "Exploratory analysis",
    description: "Distribution, outliers, and quality metrics",
    prompt: "Run an exploratory analysis on the active dataset and flag outliers.",
  },
] as const;

const ACCENT: Record<string, string> = {
  sky: "border-sky-200 hover:border-sky-400 hover:bg-sky-50/60 text-sky-700",
  violet: "border-violet-200 hover:border-violet-400 hover:bg-violet-50/60 text-violet-700",
  amber: "border-amber-200 hover:border-amber-400 hover:bg-amber-50/60 text-amber-700",
};

/**
 * Guided starting canvas — replaces the empty chat input with a
 * lab-notebook style entry point: clear actions + templates + onboarding cues.
 */
export function StartingCanvas({
  onSend,
  onUpload,
  onResumeWorkflow,
  workspace = "Genomics Workspace",
}: StartingCanvasProps) {
  const handleAction = (id: string, prompt: string) => {
    if (id === "upload" && onUpload) return onUpload();
    if (id === "resume" && onResumeWorkflow) return onResumeWorkflow();
    onSend(prompt);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header — onboarding cue */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            New analysis · {workspace}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            What would you like to investigate?
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a starting action below, choose a template, or describe your goal in
            plain language. Every step you take becomes part of an editable workflow.
          </p>
        </motion.div>

        {/* Suggested starting actions */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Start with
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.25 }}
                  onClick={() => handleAction(a.id, a.prompt)}
                  className={`group text-left rounded-lg border bg-background p-4 transition-all ${ACCENT[a.accent]}`}
                >
                  <Icon className="w-5 h-5 mb-3" />
                  <div className="text-sm font-semibold text-foreground mb-1">
                    {a.title}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {a.description}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Begin
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Pre-built templates */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + 0.04 * i, duration: 0.25 }}
                  onClick={() => onSend(t.prompt)}
                  className="flex items-start gap-3 rounded-md border border-border bg-background p-3 text-left hover:border-foreground/30 hover:bg-secondary/40 transition-colors"
                >
                  <div className="mt-0.5 p-1.5 rounded bg-secondary">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {t.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.description}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Light onboarding hint */}
        <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Tip:</span> use{" "}
          <span className="px-1 py-0.5 rounded bg-sky-100 text-sky-800 font-medium">@</span>{" "}
          to reference a dataset and{" "}
          <span className="px-1 py-0.5 rounded bg-violet-100 text-violet-800 font-medium">/</span>{" "}
          to call a method anywhere in your message.
        </div>
      </div>
    </div>
  );
}
