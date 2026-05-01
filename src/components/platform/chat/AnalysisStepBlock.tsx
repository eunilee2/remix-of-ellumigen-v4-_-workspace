import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Database,
  FlaskConical,
  BarChart3,
  Lightbulb,
  GitBranch,
  Sparkles,
  Bookmark,
} from "lucide-react";

type SectionKey = "dataset" | "method" | "result" | "interpretation";

interface AnalysisStepBlockProps {
  stepNumber: number;
  title: string;
  status?: "running" | "complete";
  datasets?: string[];
  method?: string | null;
  result?: ReactNode;
  interpretation?: ReactNode;
  onRefine?: () => void;
  onBranch?: () => void;
  onSaveAsMethod?: () => void;
}

const SECTION_META: Record<
  SectionKey,
  { label: string; icon: typeof Database; accent: string }
> = {
  dataset: { label: "Dataset", icon: Database, accent: "text-sky-600 bg-sky-50 border-sky-200" },
  method: { label: "Method Applied", icon: FlaskConical, accent: "text-violet-600 bg-violet-50 border-violet-200" },
  result: { label: "Result", icon: BarChart3, accent: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  interpretation: { label: "Interpretation", icon: Lightbulb, accent: "text-amber-600 bg-amber-50 border-amber-200" },
};

/**
 * Document-style step block — replaces the assistant bubble paradigm.
 * Each analysis response is a numbered, collapsible step with labeled sections.
 */
export function AnalysisStepBlock({
  stepNumber,
  title,
  status = "complete",
  datasets,
  method,
  result,
  interpretation,
  onRefine,
  onBranch,
  onSaveAsMethod,
}: AnalysisStepBlockProps) {
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    dataset: false,
    method: false,
    result: false,
    interpretation: false,
  });
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const toggle = (k: SectionKey) =>
    setCollapsed((c) => ({ ...c, [k]: !c[k] }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-lg border border-border bg-background shadow-sm"
    >
      {/* Step header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => setHeaderCollapsed((v) => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <StepBadge n={stepNumber} status={status} />
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Step {stepNumber}
              {status === "running" && (
                <span className="ml-2 text-amber-600 normal-case tracking-normal">
                  · running
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              headerCollapsed ? "-rotate-90" : ""
            }`}
          />
        </button>
      </header>

      {!headerCollapsed && (
        <div className="divide-y divide-border">
          {/* Dataset */}
          {datasets && datasets.length > 0 && (
            <Section
              k="dataset"
              collapsed={collapsed.dataset}
              onToggle={() => toggle("dataset")}
            >
              <div className="flex flex-wrap gap-1.5">
                {datasets.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200"
                  >
                    @{d}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Method */}
          {method && (
            <Section
              k="method"
              collapsed={collapsed.method}
              onToggle={() => toggle("method")}
            >
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 border border-violet-200">
                /{method}
              </span>
            </Section>
          )}

          {/* Result */}
          {result && (
            <Section
              k="result"
              collapsed={collapsed.result}
              onToggle={() => toggle("result")}
            >
              <div className="space-y-3">{result}</div>
            </Section>
          )}

          {/* Interpretation */}
          {interpretation && (
            <Section
              k="interpretation"
              collapsed={collapsed.interpretation}
              onToggle={() => toggle("interpretation")}
            >
              <div className="text-sm text-foreground leading-relaxed">
                {interpretation}
              </div>
            </Section>
          )}

          {/* Interactive footer */}
          <footer className="flex items-center gap-1 px-4 py-2 bg-secondary/20">
            <ActionButton icon={Sparkles} label="Refine this step" onClick={onRefine} />
            <ActionButton icon={GitBranch} label="Branch from here" onClick={onBranch} />
            <ActionButton icon={Bookmark} label="Save as method" onClick={onSaveAsMethod} />
          </footer>
        </div>
      )}
    </motion.section>
  );
}

function Section({
  k,
  collapsed,
  onToggle,
  children,
}: {
  k: SectionKey;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const meta = SECTION_META[k];
  const Icon = meta.icon;
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-secondary/30 transition-colors"
      >
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded border ${meta.accent}`}
        >
          <Icon className="w-3 h-3" />
        </span>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {meta.label}
        </span>
        <ChevronDown
          className={`ml-auto w-3.5 h-3.5 text-muted-foreground transition-transform ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      </button>
      {!collapsed && <div className="px-4 pb-3 pt-0">{children}</div>}
    </div>
  );
}

function StepBadge({ n, status }: { n: number; status: "running" | "complete" }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
          status === "running"
            ? "border-amber-400 text-amber-700 bg-amber-50"
            : "border-emerald-400 text-emerald-700 bg-emerald-50"
        }`}
      >
        {n}
      </div>
      {status === "running" && (
        <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-50" />
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Database;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
