import { useMemo, useState } from "react";
import {
  FlaskConical,
  Plus,
  Trash2,
  Search,
  Sparkles,
  GripVertical,
  Copy,
  Database,
  Wand2,
  Code2,
  Eye,
  Filter,
  Layers,
  GitCompare,
  Sigma,
  Workflow,
  ChevronDown,
  ChevronRight,
  Settings2,
  ArrowRight,
  Info,
  FileCode2,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  Download,
  Check,
  X,
  PanelBottomOpen,
  PanelBottomClose,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chatStore";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type ParamType = "slider" | "toggle" | "select" | "number" | "text";

interface StepParamSpec {
  key: string;
  label: string;
  type: ParamType;
  min?: number;
  max?: number;
  step?: number;
  default: number | string | boolean;
  options?: string[];
  help?: string;
}

interface StepDefinition {
  id: string;
  label: string;
  plain: string; // plain language description
  output: string; // what it produces
  category: "prep" | "transform" | "analyze" | "compare" | "visualize";
  icon: LucideIcon;
  params: StepParamSpec[];
}

interface WorkflowStep {
  uid: string; // instance id
  defId: string;
  paramValues: Record<string, number | string | boolean>;
  datasetIds: string[]; // attached datasets
}

interface DatasetCard {
  id: string;
  name: string;
  type: string;
  samples: number;
  color: string; // hsl token-friendly
}

// ────────────────────────────────────────────────────────────
// Sample data
// ────────────────────────────────────────────────────────────

const STEP_LIBRARY: StepDefinition[] = [
  {
    id: "normalize",
    label: "Normalize data",
    plain: "Scales values across samples so they're directly comparable.",
    output: "Normalized expression matrix",
    category: "prep",
    icon: Sigma,
    params: [
      {
        key: "method",
        label: "Normalization method",
        type: "select",
        default: "TPM",
        options: ["TPM", "FPKM", "DESeq2 size factors", "Quantile", "Log2 + median"],
        help: "How values are scaled across samples.",
      },
      { key: "log_transform", label: "Apply log2 transform", type: "toggle", default: true },
    ],
  },
  {
    id: "filter-outliers",
    label: "Filter outliers",
    plain: "Removes samples that look unusual compared to the rest.",
    output: "Cleaned dataset (outliers removed)",
    category: "prep",
    icon: Filter,
    params: [
      {
        key: "method",
        label: "Detection method",
        type: "select",
        default: "IQR",
        options: ["IQR", "Z-score", "PCA distance", "Isolation forest"],
      },
      { key: "threshold", label: "Threshold (std devs)", type: "slider", min: 1, max: 5, step: 0.1, default: 2.5 },
    ],
  },
  {
    id: "compare",
    label: "Compare datasets",
    plain: "Tests for differences between two groups of samples.",
    output: "Differential results (log2FC, p-values)",
    category: "compare",
    icon: GitCompare,
    params: [
      {
        key: "test",
        label: "Statistical test",
        type: "select",
        default: "DESeq2",
        options: ["DESeq2", "edgeR", "limma-voom", "Wilcoxon", "t-test"],
      },
      { key: "fdr", label: "FDR threshold", type: "slider", min: 0.01, max: 0.25, step: 0.01, default: 0.05 },
      { key: "min_lfc", label: "Min |log2FC|", type: "slider", min: 0, max: 4, step: 0.25, default: 1 },
    ],
  },
  {
    id: "cluster",
    label: "Run clustering",
    plain: "Groups samples or genes that behave similarly.",
    output: "Cluster assignments per sample",
    category: "analyze",
    icon: Layers,
    params: [
      {
        key: "algorithm",
        label: "Algorithm",
        type: "select",
        default: "Leiden",
        options: ["K-means", "Hierarchical", "Leiden", "Louvain"],
      },
      { key: "k", label: "Number of clusters (k)", type: "slider", min: 2, max: 20, step: 1, default: 6 },
      { key: "scale", label: "Scale features", type: "toggle", default: true },
    ],
  },
  {
    id: "enrich",
    label: "Pathway enrichment",
    plain: "Finds biological pathways over-represented in your gene list.",
    output: "Ranked pathway list with p-values",
    category: "analyze",
    icon: Workflow,
    params: [
      {
        key: "db",
        label: "Database",
        type: "select",
        default: "Reactome",
        options: ["GO", "KEGG", "Reactome", "Hallmark"],
      },
      { key: "padj", label: "Adjusted p threshold", type: "slider", min: 0.01, max: 0.25, step: 0.01, default: 0.05 },
    ],
  },
  {
    id: "reduce",
    label: "Reduce dimensions",
    plain: "Projects high-dimensional data into 2D for visualization.",
    output: "2D embedding (UMAP/PCA coordinates)",
    category: "transform",
    icon: Sigma,
    params: [
      {
        key: "method",
        label: "Method",
        type: "select",
        default: "UMAP",
        options: ["PCA", "UMAP", "t-SNE"],
      },
      { key: "neighbors", label: "Neighbors", type: "slider", min: 5, max: 100, step: 1, default: 15 },
    ],
  },
  {
    id: "visualize",
    label: "Plot results",
    plain: "Creates a chart from the output of the previous step.",
    output: "Interactive chart",
    category: "visualize",
    icon: Eye,
    params: [
      {
        key: "kind",
        label: "Chart type",
        type: "select",
        default: "Volcano plot",
        options: ["Volcano plot", "Heatmap", "Bar chart", "Scatter", "UMAP"],
      },
      { key: "label_top", label: "Label top N", type: "slider", min: 0, max: 50, step: 1, default: 10 },
    ],
  },
];

const SAMPLE_DATASETS: DatasetCard[] = [
  { id: "tcga-brca", name: "TCGA-BRCA", type: "RNA-seq", samples: 1098, color: "hsl(217 91% 60%)" },
  { id: "tcga-luad", name: "TCGA-LUAD", type: "RNA-seq", samples: 515, color: "hsl(160 64% 45%)" },
  { id: "gtex-breast", name: "GTEx Breast", type: "RNA-seq", samples: 459, color: "hsl(280 65% 60%)" },
  { id: "gse-12345", name: "GSE12345", type: "Microarray", samples: 84, color: "hsl(35 91% 55%)" },
];

const CATEGORY_STYLES: Record<StepDefinition["category"], { dot: string; chip: string; label: string }> = {
  prep: { dot: "bg-sky-500", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300", label: "Preparation" },
  transform: { dot: "bg-violet-500", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300", label: "Transform" },
  analyze: { dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", label: "Analyze" },
  compare: { dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300", label: "Compare" },
  visualize: { dot: "bg-rose-500", chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300", label: "Visualize" },
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function defaultsFor(def: StepDefinition): Record<string, number | string | boolean> {
  return Object.fromEntries(def.params.map((p) => [p.key, p.default]));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeStep(defId: string): WorkflowStep {
  const def = STEP_LIBRARY.find((d) => d.id === defId)!;
  return { uid: uid(), defId, paramValues: defaultsFor(def), datasetIds: [] };
}

// Very small natural-language → steps interpreter (demo).
function interpretPrompt(text: string): WorkflowStep[] {
  const t = text.toLowerCase();
  const steps: WorkflowStep[] = [];
  if (/(remove|without|filter).*(outlier)/.test(t)) steps.push(makeStep("filter-outliers"));
  if (/normali[sz]e/.test(t)) steps.push(makeStep("normalize"));
  if (/compare|vs\.?|versus|differential/.test(t)) steps.push(makeStep("compare"));
  if (/cluster/.test(t)) steps.push(makeStep("cluster"));
  if (/(enrich|pathway|gsea)/.test(t)) steps.push(makeStep("enrich"));
  if (/(umap|pca|t-?sne|reduce|embed)/.test(t)) steps.push(makeStep("reduce"));
  if (/(plot|chart|visuali|volcano|heatmap)/.test(t)) steps.push(makeStep("visualize"));
  return steps;
}

function generatePseudocode(steps: WorkflowStep[], dsLookup: Record<string, DatasetCard>): string {
  if (steps.length === 0) return "# Add steps to see generated code\n";
  const lines: string[] = ["# Auto-generated from your workflow", "import ellumigen as eg", ""];
  steps.forEach((s, i) => {
    const def = STEP_LIBRARY.find((d) => d.id === s.defId)!;
    const ds = s.datasetIds.map((id) => `"${dsLookup[id]?.name ?? id}"`).join(", ");
    const params = Object.entries(s.paramValues)
      .map(([k, v]) => `${k}=${typeof v === "string" ? `"${v}"` : v}`)
      .join(", ");
    const inputVar = i === 0 ? (ds ? `eg.load([${ds}])` : "input_data") : `step_${i}`;
    lines.push(`step_${i + 1} = eg.${s.defId.replace(/-/g, "_")}(${inputVar}${params ? ", " + params : ""})`);
  });
  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────
// Code View — multi-language generators
// Each generator returns an array of { stepUid?, text } so we can
// correlate code lines back to workflow steps.
// ────────────────────────────────────────────────────────────

export type CodeLanguage = "python" | "r" | "pseudocode" | "json";

export interface CodeLine {
  text: string;
  stepUid?: string;
}

function fmtVal(v: number | string | boolean, lang: CodeLanguage): string {
  if (typeof v === "string") {
    if (lang === "r") return `"${v}"`;
    return `"${v}"`;
  }
  if (typeof v === "boolean") {
    if (lang === "python" || lang === "pseudocode") return v ? "True" : "False";
    if (lang === "r") return v ? "TRUE" : "FALSE";
    return String(v);
  }
  return String(v);
}

function generateCodeLines(
  steps: WorkflowStep[],
  dsLookup: Record<string, DatasetCard>,
  lang: CodeLanguage,
): CodeLine[] {
  if (steps.length === 0) {
    return [{ text: "# Add steps to see generated code" }];
  }

  if (lang === "json") {
    const obj = {
      workflow: steps.map((s, i) => {
        const def = STEP_LIBRARY.find((d) => d.id === s.defId)!;
        return {
          step: i + 1,
          id: def.id,
          label: def.label,
          datasets: s.datasetIds.map((id) => dsLookup[id]?.name ?? id),
          params: s.paramValues,
        };
      }),
    };
    return JSON.stringify(obj, null, 2)
      .split("\n")
      .map((text) => ({ text }));
  }

  const lines: CodeLine[] = [];

  if (lang === "python") {
    lines.push({ text: "# Auto-generated from your visual workflow" });
    lines.push({ text: "# Read-only — edits should be made in the Method Builder" });
    lines.push({ text: "import ellumigen as eg" });
    lines.push({ text: "" });
  } else if (lang === "r") {
    lines.push({ text: "# Auto-generated from your visual workflow" });
    lines.push({ text: "# Read-only — edits should be made in the Method Builder" });
    lines.push({ text: "library(ellumigen)" });
    lines.push({ text: "" });
  } else {
    lines.push({ text: "# Pseudocode representation of your workflow" });
    lines.push({ text: "" });
  }

  steps.forEach((s, i) => {
    const def = STEP_LIBRARY.find((d) => d.id === s.defId)!;
    const fn = s.defId.replace(/-/g, "_");
    const datasets = s.datasetIds.map((id) => dsLookup[id]?.name ?? id);
    const inputVar =
      i === 0
        ? datasets.length
          ? lang === "r"
            ? `eg_load(c(${datasets.map((d) => `"${d}"`).join(", ")}))`
            : `eg.load([${datasets.map((d) => `"${d}"`).join(", ")}])`
          : "input_data"
        : `step_${i}`;

    // Step header comment
    lines.push({ text: `# Step ${i + 1}: ${def.label} — ${def.plain}`, stepUid: s.uid });

    if (lang === "python") {
      const params = Object.entries(s.paramValues)
        .map(([k, v]) => `${k}=${fmtVal(v, lang)}`)
        .join(", ");
      lines.push({
        text: `step_${i + 1} = eg.${fn}(${inputVar}${params ? ", " + params : ""})`,
        stepUid: s.uid,
      });
    } else if (lang === "r") {
      const params = Object.entries(s.paramValues)
        .map(([k, v]) => `${k} = ${fmtVal(v, lang)}`)
        .join(", ");
      lines.push({
        text: `step_${i + 1} <- eg_${fn}(${inputVar}${params ? ", " + params : ""})`,
        stepUid: s.uid,
      });
    } else {
      // pseudocode
      lines.push({ text: `${def.label.toUpperCase()}:`, stepUid: s.uid });
      if (datasets.length) {
        lines.push({ text: `    input  ← ${datasets.join(", ")}`, stepUid: s.uid });
      } else if (i > 0) {
        lines.push({ text: `    input  ← output of step ${i}`, stepUid: s.uid });
      }
      Object.entries(s.paramValues).forEach(([k, v]) => {
        lines.push({ text: `    ${k} = ${fmtVal(v, lang)}`, stepUid: s.uid });
      });
      lines.push({ text: `    output → ${def.output}`, stepUid: s.uid });
    }
    lines.push({ text: "", stepUid: s.uid });
  });

  return lines;
}

function languageMeta(lang: CodeLanguage) {
  switch (lang) {
    case "python":
      return { label: "Python", filename: "workflow.py", mime: "text/x-python" };
    case "r":
      return { label: "R", filename: "workflow.R", mime: "text/x-r" };
    case "pseudocode":
      return { label: "Pseudocode", filename: "workflow.txt", mime: "text/plain" };
    case "json":
      return { label: "JSON", filename: "workflow.json", mime: "application/json" };
  }
}

// ────────────────────────────────────────────────────────────
// Main view
// ────────────────────────────────────────────────────────────

export function MethodsView() {
  const { chats, activeChatId } = useChatStore();

  const [steps, setSteps] = useState<WorkflowStep[]>([
    { ...makeStep("filter-outliers"), datasetIds: ["tcga-brca"] },
    makeStep("normalize"),
    makeStep("compare"),
  ]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [linkedChatId, setLinkedChatId] = useState<string | undefined>(activeChatId ?? chats[0]?.id);
  const [draggingDefId, setDraggingDefId] = useState<string | null>(null);
  const [draggingDatasetId, setDraggingDatasetId] = useState<string | null>(null);
  const [draggingStepUid, setDraggingStepUid] = useState<string | null>(null);
  const [dropOverIndex, setDropOverIndex] = useState<number | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [codeLang, setCodeLang] = useState<CodeLanguage>("python");
  const [highlightStepUid, setHighlightStepUid] = useState<string | null>(null);

  const datasetLookup = useMemo(
    () => Object.fromEntries(SAMPLE_DATASETS.map((d) => [d.id, d])) as Record<string, DatasetCard>,
    []
  );

  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return STEP_LIBRARY;
    return STEP_LIBRARY.filter(
      (s) => s.label.toLowerCase().includes(q) || s.plain.toLowerCase().includes(q)
    );
  }, [librarySearch]);

  // ── step ops ──
  const addStep = (defId: string, atIndex?: number) => {
    const next = makeStep(defId);
    setSteps((prev) => {
      if (atIndex == null) return [...prev, next];
      const copy = [...prev];
      copy.splice(atIndex, 0, next);
      return copy;
    });
  };
  const removeStep = (uid: string) => setSteps((p) => p.filter((s) => s.uid !== uid));
  const duplicateStep = (uid: string) =>
    setSteps((p) => {
      const i = p.findIndex((s) => s.uid === uid);
      if (i < 0) return p;
      const copy = [...p];
      copy.splice(i + 1, 0, { ...p[i], uid: Math.random().toString(36).slice(2, 10) });
      return copy;
    });
  const updateParam = (uid: string, key: string, value: number | string | boolean) =>
    setSteps((p) => p.map((s) => (s.uid === uid ? { ...s, paramValues: { ...s.paramValues, [key]: value } } : s)));
  const attachDataset = (stepUid: string, datasetId: string) =>
    setSteps((p) =>
      p.map((s) =>
        s.uid === stepUid && !s.datasetIds.includes(datasetId)
          ? { ...s, datasetIds: [...s.datasetIds, datasetId] }
          : s
      )
    );
  const detachDataset = (stepUid: string, datasetId: string) =>
    setSteps((p) =>
      p.map((s) => (s.uid === stepUid ? { ...s, datasetIds: s.datasetIds.filter((d) => d !== datasetId) } : s))
    );
  const moveStep = (fromUid: string, toIndex: number) => {
    setSteps((prev) => {
      const fromIdx = prev.findIndex((s) => s.uid === fromUid);
      if (fromIdx < 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIdx, 1);
      const insertAt = toIndex > fromIdx ? toIndex - 1 : toIndex;
      copy.splice(insertAt, 0, item);
      return copy;
    });
  };
  const duplicateWorkflow = () =>
    setSteps((p) => p.map((s) => ({ ...s, uid: Math.random().toString(36).slice(2, 10) })));

  const handleInterpret = () => {
    const generated = interpretPrompt(prompt);
    if (generated.length === 0) return;
    setSteps(generated);
    setPrompt("");
  };

  const linkedChat = chats.find((c) => c.id === linkedChatId);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex-1 overflow-hidden bg-background flex flex-col">
        {/* Header */}
        <header className="px-8 py-5 border-b border-border bg-card/50">
          <div className="max-w-[1400px] mx-auto flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Workflow className="w-5 h-5 text-foreground" />
                <h1 className="text-xl font-semibold text-foreground tracking-tight">Method Builder</h1>
                <Badge variant="secondary" className="ml-2 text-[10px] uppercase tracking-wider">
                  Visual workflow
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Build analyses by snapping steps together — no code required. Drag tools from the library,
                attach datasets, tune parameters with sliders.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background">
                <Code2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Code view</span>
                <Switch checked={advanced} onCheckedChange={setAdvanced} />
              </div>
              <Select value={linkedChatId} onValueChange={setLinkedChatId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Link to chat…" />
                </SelectTrigger>
                <SelectContent>
                  {chats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Natural-language assist */}
          <div className="max-w-[1400px] mx-auto mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInterpret()}
              placeholder='Describe what you want, e.g. "compare dataset A vs B without outliers"'
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
            />
            <Button size="sm" onClick={handleInterpret} disabled={!prompt.trim()}>
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
              Interpret
            </Button>
          </div>
        </header>

        {/* 3-column layout — side panels collapse to thin rails by default */}
        <div
          className="flex-1 overflow-hidden grid gap-0 transition-[grid-template-columns] duration-200"
          style={{
            gridTemplateColumns: `${leftOpen ? "280px" : "44px"} 1fr ${rightOpen ? "320px" : "44px"}`,
          }}
        >
          {/* ── Left: step library ── */}
          {!leftOpen ? (
            <aside className="border-r border-border bg-card/30 flex flex-col items-center py-3 gap-2 overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setLeftOpen(true)}
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p className="text-xs">Open step library</p></TooltipContent>
              </Tooltip>
              <div className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-2">
                Step library
              </div>
            </aside>
          ) : (
          <aside className="border-r border-border bg-card/30 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step library
                </h2>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLeftOpen(false)}>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search tools…"
                  className="pl-8 h-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredLibrary.map((def) => {
                const Icon = def.icon;
                const styles = CATEGORY_STYLES[def.category];
                return (
                  <Tooltip key={def.id}>
                    <TooltipTrigger asChild>
                      <button
                        draggable
                        onDragStart={() => setDraggingDefId(def.id)}
                        onDragEnd={() => setDraggingDefId(null)}
                        onClick={() => addStep(def.id)}
                        className={cn(
                          "w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-card text-left",
                          "hover:border-foreground/20 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing",
                          draggingDefId === def.id && "opacity-50"
                        )}
                      >
                        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", styles.chip)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground leading-tight">{def.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{def.plain}</div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px]">
                      <p className="text-xs">
                        <span className="font-semibold">{styles.label}.</span> {def.plain}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">→ {def.output}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {filteredLibrary.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No tools match.</p>
              )}
            </div>
          </aside>
          )}

          {/* ── Center: workflow canvas ── */}
          <section className="overflow-y-auto bg-background">
            <div className="max-w-[760px] mx-auto px-8 py-8">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">Your workflow</h2>
                  <Badge variant="outline" className="text-[10px]">
                    {steps.length} step{steps.length === 1 ? "" : "s"}
                  </Badge>
                  {linkedChat && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <FileCode2 className="w-3 h-3" /> {linkedChat.title}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">This workflow lives inside that chat's branch.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={duplicateWorkflow} disabled={steps.length === 0}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Duplicate
                  </Button>
                  <Button variant="outline" size="sm" disabled={steps.length === 0}>
                    <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                    Run workflow
                  </Button>
                </div>
              </div>

              {/* Empty state */}
              {steps.length === 0 && (
                <div
                  onDragOver={(e) => {
                    if (draggingDefId) e.preventDefault();
                  }}
                  onDrop={() => {
                    if (draggingDefId) {
                      addStep(draggingDefId);
                      setDraggingDefId(null);
                    }
                  }}
                  className="rounded-xl border-2 border-dashed border-border p-12 text-center"
                >
                  <Workflow className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">Start your workflow</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag a tool from the left, or describe what you want above.
                  </p>
                </div>
              )}

              {/* Steps */}
              <div className="relative">
                {/* drop zone before first */}
                {steps.length > 0 && (
                  <DropZone
                    active={dropOverIndex === 0 && (!!draggingDefId || !!draggingStepUid)}
                    onDragOver={(e) => {
                      if (draggingDefId || draggingStepUid) {
                        e.preventDefault();
                        setDropOverIndex(0);
                      }
                    }}
                    onDragLeave={() => setDropOverIndex(null)}
                    onDrop={() => {
                      if (draggingDefId) addStep(draggingDefId, 0);
                      else if (draggingStepUid) moveStep(draggingStepUid, 0);
                      setDraggingDefId(null);
                      setDraggingStepUid(null);
                      setDropOverIndex(null);
                    }}
                  />
                )}

                {steps.map((step, i) => {
                  const def = STEP_LIBRARY.find((d) => d.id === step.defId)!;
                  return (
                    <div key={step.uid}>
                      <StepBlock
                        step={step}
                        def={def}
                        index={i}
                        datasetLookup={datasetLookup}
                        draggingDatasetId={draggingDatasetId}
                        onParamChange={(k, v) => updateParam(step.uid, k, v)}
                        onRemove={() => removeStep(step.uid)}
                        onDuplicate={() => duplicateStep(step.uid)}
                        onAttachDataset={(id) => attachDataset(step.uid, id)}
                        onDetachDataset={(id) => detachDataset(step.uid, id)}
                        onDragStartStep={() => setDraggingStepUid(step.uid)}
                        onDragEndStep={() => setDraggingStepUid(null)}
                      />
                      {/* connector + drop zone */}
                      <div className="flex justify-center py-1.5">
                        <div className="w-px h-4 bg-border" />
                      </div>
                      <DropZone
                        active={dropOverIndex === i + 1 && (!!draggingDefId || !!draggingStepUid)}
                        onDragOver={(e) => {
                          if (draggingDefId || draggingStepUid) {
                            e.preventDefault();
                            setDropOverIndex(i + 1);
                          }
                        }}
                        onDragLeave={() => setDropOverIndex(null)}
                        onDrop={() => {
                          if (draggingDefId) addStep(draggingDefId, i + 1);
                          else if (draggingStepUid) moveStep(draggingStepUid, i + 1);
                          setDraggingDefId(null);
                          setDraggingStepUid(null);
                          setDropOverIndex(null);
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Code view (advanced) */}
              {advanced && (
                <div className="mt-6 rounded-lg border border-border bg-zinc-950 text-zinc-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-mono text-zinc-300">workflow.py</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Read-only preview</span>
                  </div>
                  <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto">
                    {generatePseudocode(steps, datasetLookup)}
                  </pre>
                </div>
              )}
            </div>
          </section>

          {/* ── Right: datasets ── */}
          {!rightOpen ? (
            <aside className="border-l border-border bg-card/30 flex flex-col items-center py-3 gap-2 overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setRightOpen(true)}
                  >
                    <PanelRightOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left"><p className="text-xs">Open datasets</p></TooltipContent>
              </Tooltip>
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="[writing-mode:vertical-rl] text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-1">
                Datasets
              </div>
            </aside>
          ) : (
          <aside className="border-l border-border bg-card/30 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Datasets
                </h2>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightOpen(false)}>
                  <PanelRightClose className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Drag a dataset onto any step to use it as input.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {SAMPLE_DATASETS.map((ds) => (
                <div
                  key={ds.id}
                  draggable
                  onDragStart={() => setDraggingDatasetId(ds.id)}
                  onDragEnd={() => setDraggingDatasetId(null)}
                  className={cn(
                    "rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing",
                    "hover:border-foreground/20 hover:shadow-sm transition-all",
                    draggingDatasetId === ds.id && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ds.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{ds.name}</span>
                    <GripVertical className="w-3 h-3 text-muted-foreground ml-auto" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                      {ds.type}
                    </Badge>
                    <span>{ds.samples.toLocaleString()} samples</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border">
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add dataset
              </Button>
            </div>
          </aside>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ────────────────────────────────────────────────────────────
// Step block
// ────────────────────────────────────────────────────────────

interface StepBlockProps {
  step: WorkflowStep;
  def: StepDefinition;
  index: number;
  datasetLookup: Record<string, DatasetCard>;
  draggingDatasetId: string | null;
  onParamChange: (key: string, value: number | string | boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onAttachDataset: (id: string) => void;
  onDetachDataset: (id: string) => void;
  onDragStartStep: () => void;
  onDragEndStep: () => void;
}

function StepBlock({
  step,
  def,
  index,
  datasetLookup,
  draggingDatasetId,
  onParamChange,
  onRemove,
  onDuplicate,
  onAttachDataset,
  onDetachDataset,
  onDragStartStep,
  onDragEndStep,
}: StepBlockProps) {
  const [open, setOpen] = useState(true);
  const [dropHover, setDropHover] = useState(false);
  const Icon = def.icon;
  const styles = CATEGORY_STYLES[def.category];

  return (
    <div
      draggable
      onDragStart={(e) => {
        // don't trigger when starting drag from a child element marked nodrag
        const target = e.target as HTMLElement;
        if (target.closest("[data-nodrag]")) {
          e.preventDefault();
          return;
        }
        onDragStartStep();
      }}
      onDragEnd={onDragEndStep}
      onDragOver={(e) => {
        if (draggingDatasetId) {
          e.preventDefault();
          setDropHover(true);
        }
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={() => {
        if (draggingDatasetId) {
          onAttachDataset(draggingDatasetId);
          setDropHover(false);
        }
      }}
      className={cn(
        "rounded-xl border bg-card shadow-sm overflow-hidden transition-all",
        dropHover ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
          <span>{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", styles.chip)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{def.label}</span>
            <span className={cn("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded", styles.chip)}>
              {styles.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{def.plain}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0" data-nodrag>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate this step</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove step</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Datasets row */}
      <div className="px-4 pb-2 flex items-center gap-2 flex-wrap" data-nodrag>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Input:</span>
        {step.datasetIds.length === 0 && (
          <span className="text-[11px] text-muted-foreground italic">
            {index === 0 ? "Drop a dataset here, or it'll use the previous step's output." : "Output of step " + index}
          </span>
        )}
        {step.datasetIds.map((id) => {
          const ds = datasetLookup[id];
          if (!ds) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-border bg-background"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ds.color }} />
              {ds.name}
              <button
                onClick={() => onDetachDataset(id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${ds.name}`}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>

      {/* Params */}
      {open && (
        <div className="px-4 pt-2 pb-3 border-t border-border bg-background/50" data-nodrag>
          <div className="flex items-center gap-1.5 mb-3">
            <Settings2 className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Parameters
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-3">
            {def.params.map((p) => (
              <ParamControl
                key={p.key}
                spec={p}
                value={step.paramValues[p.key]}
                onChange={(v) => onParamChange(p.key, v)}
              />
            ))}
          </div>
          {/* Output */}
          <div className="mt-3 pt-3 border-t border-dashed border-border flex items-center gap-2 text-[11px] text-muted-foreground">
            <ArrowRight className="w-3 h-3" />
            <span className="font-medium text-foreground">Produces:</span>
            <span>{def.output}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Param control
// ────────────────────────────────────────────────────────────

function ParamControl({
  spec,
  value,
  onChange,
}: {
  spec: StepParamSpec;
  value: number | string | boolean;
  onChange: (v: number | string | boolean) => void;
}) {
  const labelEl = (
    <div className="flex items-center gap-1">
      <span className="text-xs font-medium text-foreground">{spec.label}</span>
      {spec.help && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px]">
            <p className="text-xs">{spec.help}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  if (spec.type === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3 col-span-2">
        {labelEl}
        <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
      </div>
    );
  }

  if (spec.type === "slider") {
    const num = typeof value === "number" ? value : Number(spec.default);
    return (
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-1.5">
          {labelEl}
          <span className="text-xs font-mono tabular-nums text-foreground">{num}</span>
        </div>
        <Slider
          value={[num]}
          min={spec.min ?? 0}
          max={spec.max ?? 1}
          step={spec.step ?? 0.01}
          onValueChange={([v]) => onChange(v)}
        />
      </div>
    );
  }

  if (spec.type === "select") {
    return (
      <div className="col-span-1">
        <div className="mb-1">{labelEl}</div>
        <Select value={String(value)} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {spec.options?.map((o) => (
              <SelectItem key={o} value={o} className="text-xs">
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="col-span-1">
      <div className="mb-1">{labelEl}</div>
      <Input
        type={spec.type === "number" ? "number" : "text"}
        value={String(value)}
        onChange={(e) => onChange(spec.type === "number" ? Number(e.target.value) : e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Drop zone between steps
// ────────────────────────────────────────────────────────────

function DropZone({
  active,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  active: boolean;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "h-2 rounded-full transition-all",
        active ? "h-10 bg-primary/10 border-2 border-dashed border-primary my-2" : ""
      )}
    >
      {active && (
        <div className="h-full flex items-center justify-center text-[11px] text-primary font-medium">
          Drop here
        </div>
      )}
    </div>
  );
}
