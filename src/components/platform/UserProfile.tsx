import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CURRENT_USER } from "@/lib/contributors";
import { Mail, FlaskConical, Users, GitBranch, Award, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

// Profile details for the current user persona (Elena Novak — Bioinformatics).
const PROFILE_DETAILS = {
  role: "Senior Bioinformatics Scientist",
  team: CURRENT_USER.team,
  org: "Ellumigen Research Lab",
  email: "elena.novak@ellumigen.bio",
  pronouns: "she/her",
  location: "Boston, MA",
  focusAreas: [
    "Single-cell RNA-seq",
    "Pathway enrichment",
    "Multi-omics integration",
    "Survival modeling",
  ],
  tools: ["DESeq2", "Seurat", "Scanpy", "GSEA", "Python / R"],
  stats: {
    explorations: 42,
    combinedInsights: 17,
    activeProjects: 5,
  },
};

interface UserProfileProps {
  collapsed?: boolean;
}

export function UserProfile({ collapsed }: UserProfileProps) {
  const [open, setOpen] = useState(false);
  const { initials, name, color } = CURRENT_USER;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2.5 w-full rounded-lg hover:bg-secondary transition-colors text-left",
            collapsed ? "justify-center p-1.5" : "px-2 py-2"
          )}
          aria-label="Open profile"
        >
          <span
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-background"
            style={{ backgroundColor: color }}
          >
            {initials}
          </span>
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground truncate">{name}</span>
              <span className="text-[11px] text-muted-foreground truncate">
                {PROFILE_DETAILS.role}
              </span>
            </div>
          )}
          {!collapsed && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0 overflow-hidden">
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 text-white"
          style={{
            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold ring-2 ring-white/40 bg-white/15 backdrop-blur-sm"
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                {name}
                <span className="text-[10px] font-normal opacity-80">
                  ({PROFILE_DETAILS.pronouns})
                </span>
              </div>
              <div className="text-xs opacity-90 truncate">{PROFILE_DETAILS.role}</div>
              <div className="text-[11px] opacity-80 truncate">
                {PROFILE_DETAILS.org} · {PROFILE_DETAILS.location}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <InfoRow icon={Users} label="Team">
            <span className="font-medium text-foreground">{PROFILE_DETAILS.team}</span>
          </InfoRow>
          <InfoRow icon={Mail} label="Email">
            <span className="text-foreground truncate">{PROFILE_DETAILS.email}</span>
          </InfoRow>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              <FlaskConical className="w-3 h-3" />
              Focus areas
            </div>
            <div className="flex flex-wrap gap-1">
              {PROFILE_DETAILS.focusAreas.map((f) => (
                <span
                  key={f}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              <Award className="w-3 h-3" />
              Toolkit
            </div>
            <div className="flex flex-wrap gap-1">
              {PROFILE_DETAILS.tools.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-border text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            <Stat label="Explorations" value={PROFILE_DETAILS.stats.explorations} />
            <Stat label="Combined" value={PROFILE_DETAILS.stats.combinedInsights} />
            <Stat label="Projects" value={PROFILE_DETAILS.stats.activeProjects} />
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border p-1.5 flex items-center gap-1">
          <button className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          <button className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <GitBranch className="w-3.5 h-3.5" />
            My paths
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-12 shrink-0">{label}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-base font-semibold text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}