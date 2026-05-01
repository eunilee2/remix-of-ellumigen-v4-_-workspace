import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Info, Filter, X, Search } from "lucide-react";
import type { BranchNodeCategory } from "@/types/chat";
import { cn } from "@/lib/utils";
import { CONTRIBUTORS, TEAMS, getContributorForId } from "@/lib/contributors";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const BRANCH_COLUMN_OFFSET = 320;
const BRANCH_CURVE_RADIUS = 40;
const MERGE_BEND_RADIUS = 40;

function formatTimeAgo(date?: Date): string {
  if (!date) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export interface MapNode {
  id: string;
  label: string;
  description: string;
  category: BranchNodeCategory;
  parentId?: string;
  children: string[];
  isMain?: boolean;
  branchLabel?: string;
  isBranch?: boolean;
  branchId?: string;
  timestamp?: Date;
  merged?: boolean;
}

interface ConversationMapProps {
  title: string;
  subtitle?: string;
  nodes: MapNode[];
  activeNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
  onAddBranch?: (parentNodeId: string) => void;
  onBringToMain?: () => void;
  onReturnToMain?: () => void;
  onClose: () => void;
  isOnBranch?: boolean;
}

interface MergeConnector {
  id: string;
  path: string;
}

const CATEGORY_STYLES: Record<BranchNodeCategory, { bg: string; text: string; label: string }> = {
  hypothesis: { bg: "bg-emerald-100", text: "text-emerald-700", label: "HYPOTHESIS" },
  data: { bg: "bg-amber-100", text: "text-amber-700", label: "DATA" },
  analysis: { bg: "bg-red-100", text: "text-red-700", label: "ANALYSIS" },
  exploration: { bg: "bg-violet-100", text: "text-violet-700", label: "EXPLORATION" },
};

function isMergedBranch(node: Pick<MapNode, "branchLabel" | "merged">): boolean {
  return node.branchLabel === "merged" || !!node.merged;
}

function getMergeAnchorId(node: Pick<MapNode, "branchId" | "id">): string {
  return node.branchId || node.id;
}

/** Count the depth (number of nodes) in a branch chain */
function getBranchDepth(node: MapNode, nodeMap: Record<string, MapNode>): number {
  let depth = 1;
  const children = node.children.map((id) => nodeMap[id]).filter(Boolean);
  const mainChild = children.find((c) => !c.isBranch);
  if (mainChild) {
    depth += getBranchDepth(mainChild, nodeMap);
  }
  return depth;
}

function measureMergeConnectors(container: HTMLDivElement): {
  connectors: MergeConnector[];
  branchGaps: Record<string, number>;
  width: number;
  height: number;
} {
  const containerRect = container.getBoundingClientRect();
  const targetElements = Array.from(container.querySelectorAll<HTMLElement>("[data-merge-target]"));
  const branchElements = Array.from(container.querySelectorAll<HTMLElement>("[data-branch-subtree-parent]"));
  const targetMap = new Map(
    targetElements.flatMap((element) => {
      const mergeId = element.dataset.mergeTarget;
      return mergeId ? [[mergeId, element] as const] : [];
    })
  );
  const branchGaps = Array.from(container.querySelectorAll<HTMLElement>("[data-main-slot]"))
    .reduce<Record<string, number>>((acc, element) => {
      const nodeId = element.dataset.mainSlot;
      if (!nodeId) return acc;

      const slotTop = element.getBoundingClientRect().top;
      const maxGap = branchElements.reduce((largestGap, branchElement) => {
        if (branchElement.dataset.branchSubtreeParent !== nodeId) return largestGap;
        const branchRect = branchElement.getBoundingClientRect();
        return Math.max(largestGap, branchRect.bottom - slotTop);
      }, 0);

      if (maxGap > 0) {
        acc[nodeId] = Math.ceil(maxGap);
      }

      return acc;
    }, {});

  const connectors: MergeConnector[] = [];
  let width = container.scrollWidth;
  let height = container.scrollHeight;

  for (const sourceElement of Array.from(container.querySelectorAll<HTMLElement>("[data-merge-source]"))) {
    const mergeId = sourceElement.dataset.mergeSource;
    if (!mergeId) continue;

    const targetElement = targetMap.get(mergeId);
    if (!targetElement) continue;

    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const startX = sourceRect.left - containerRect.left + sourceRect.width / 2;
    const startY = sourceRect.top - containerRect.top + sourceRect.height / 2;
    const endX = targetRect.left - containerRect.left + targetRect.width / 2;
    const endY = targetRect.top - containerRect.top + targetRect.height / 2;
    const bendRadius = Math.min(MERGE_BEND_RADIUS, Math.abs(startX - endX) / 2, Math.abs(endY - startY) / 2);

    // Mirror the branch-out curve: go down vertically from source, then curve horizontally into the main line
    connectors.push({
      id: mergeId,
      path: `M ${startX} ${startY} L ${startX} ${endY - bendRadius} Q ${startX} ${endY} ${startX - bendRadius} ${endY} L ${endX} ${endY}`,
    });

    width = Math.max(width, startX + 24, endX + 24);
    height = Math.max(height, startY + 24, endY + 24);
  }

  return {
    connectors,
    branchGaps,
    width: Math.ceil(width),
    height: Math.ceil(height),
  };
}

export function ConversationMap({
  title,
  subtitle,
  nodes,
  activeNodeId,
  onSelectNode,
  onAddBranch,
  onBringToMain,
  onReturnToMain,
  onClose,
  isOnBranch,
}: ConversationMapProps) {
  const rootNodes = nodes.filter((n) => !n.parentId);
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [mergeConnectors, setMergeConnectors] = useState<MergeConnector[]>([]);
  const [branchGaps, setBranchGaps] = useState<Record<string, number>>({});
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const [advancedMode, setAdvancedMode] = useState(false);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");

  useLayoutEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    let frame = 0;

    const updateConnectors = () => {
      const nextMeasurement = measureMergeConnectors(container);
      setMergeConnectors(nextMeasurement.connectors);
      setBranchGaps(nextMeasurement.branchGaps);
      setOverlaySize({ width: nextMeasurement.width, height: nextMeasurement.height });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateConnectors);
    };

    scheduleUpdate();

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(container);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [activeNodeId, nodes]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Friendly explainer + advanced toggle */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-muted/30">
        <div className="flex items-start gap-2 text-xs text-muted-foreground min-w-0">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p className="truncate">
            Each card is a checkpoint in your analysis. Branch off to try a variation, then{" "}
            <span className="font-medium text-foreground">combine insights</span> back when you're ready.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Author / team filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors",
                  teamFilter
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                title="Filter by team"
              >
                <Filter className="w-3.5 h-3.5" />
                {teamFilter ? `Team: ${teamFilter}` : "Filter by team"}
                {teamFilter && (
                  <X
                    className="w-3 h-3 ml-0.5 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTeamFilter(null);
                      setTeamSearch("");
                    }}
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/60">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    autoFocus
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Search teams..."
                    className="bg-transparent outline-none text-xs flex-1 placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {TEAMS.filter((t) =>
                  t.toLowerCase().includes(teamSearch.toLowerCase())
                ).map((team) => {
                  const members = CONTRIBUTORS.filter((c) => c.team === team);
                  const isActive = teamFilter === team;
                  return (
                    <button
                      key={team}
                      onClick={() => setTeamFilter(isActive ? null : team)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-secondary text-left",
                        isActive && "bg-secondary"
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground truncate">{team}</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {members.map((m) => m.name.split(" ")[0]).join(", ")}
                        </span>
                      </div>
                      <div className="flex -space-x-1 shrink-0">
                        {members.slice(0, 3).map((m) => (
                          <span
                            key={m.initials}
                            className="w-5 h-5 rounded-full border border-background flex items-center justify-center text-[9px] font-semibold text-white"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.initials}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
                {TEAMS.filter((t) =>
                  t.toLowerCase().includes(teamSearch.toLowerCase())
                ).length === 0 && (
                  <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                    No teams match "{teamSearch}"
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-primary"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
            />
            Version-control view
          </label>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-4 relative">
        <div
          ref={contentRef}
          className="relative flex flex-col items-center gap-0 min-w-fit"
          style={{ paddingRight: "400px" }}
        >
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={overlaySize.width || undefined}
            height={overlaySize.height || undefined}
            fill="none"
          >
            {mergeConnectors.map((connector) => (
              <path
                key={connector.id}
                d={connector.path}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                fill="none"
              />
            ))}
          </svg>

          {rootNodes.map((node) => (
            <NodeTree
              key={node.id}
              node={node}
              nodeMap={nodeMap}
              activeNodeId={activeNodeId}
              onSelectNode={onSelectNode}
              onAddBranch={onAddBranch}
              branchGapMap={branchGaps}
              advancedMode={advancedMode}
              teamFilter={teamFilter}
            />
          ))}
        </div>
        <Minimap scrollRef={scrollRef} contentRef={contentRef} activeNodeId={activeNodeId} />
      </div>
    </div>
  );
}

function Minimap({
  scrollRef,
  contentRef,
  activeNodeId,
}: {
  scrollRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  activeNodeId?: string;
}) {
  const MINIMAP_W = 180;
  const MINIMAP_H = 130;
  const [, force] = useState(0);
  const dragging = useRef(false);

  // Re-render on scroll/resize so the viewport rectangle tracks the user.
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    const rerender = () => force((n) => n + 1);
    scroller.addEventListener("scroll", rerender, { passive: true });
    const ro = new ResizeObserver(rerender);
    ro.observe(scroller);
    ro.observe(content);
    window.addEventListener("resize", rerender);
    return () => {
      scroller.removeEventListener("scroll", rerender);
      ro.disconnect();
      window.removeEventListener("resize", rerender);
    };
  }, [scrollRef, contentRef]);

  const scroller = scrollRef.current;
  const content = contentRef.current;
  if (!scroller || !content) {
    return (
      <div
        className="sticky bottom-3 left-3 z-20 rounded-lg border border-border bg-background/90 backdrop-blur-sm shadow-md pointer-events-none"
        style={{ width: MINIMAP_W, height: MINIMAP_H, marginTop: -MINIMAP_H - 12 }}
      />
    );
  }

  const contentW = Math.max(content.scrollWidth, scroller.clientWidth);
  const contentH = Math.max(content.scrollHeight, scroller.clientHeight);
  const scaleX = MINIMAP_W / contentW;
  const scaleY = MINIMAP_H / contentH;
  const scale = Math.min(scaleX, scaleY);
  const innerW = contentW * scale;
  const innerH = contentH * scale;

  const viewW = scroller.clientWidth * scale;
  const viewH = scroller.clientHeight * scale;
  const viewX = scroller.scrollLeft * scale;
  const viewY = scroller.scrollTop * scale;

  // Collect every node card to draw on the minimap.
  const cardEls = content.querySelectorAll<HTMLElement>("[data-map-node]");
  const contentRect = content.getBoundingClientRect();
  const cards = Array.from(cardEls).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      id: el.dataset.mapNode || "",
      x: (r.left - contentRect.left) * scale,
      y: (r.top - contentRect.top) * scale,
      w: r.width * scale,
      h: r.height * scale,
      active: el.dataset.mapNode === activeNodeId,
    };
  });

  const handlePointer = (clientX: number, clientY: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect();
    const localX = clientX - rect.left - innerW / 2 - (MINIMAP_W - innerW) / 2;
    const localY = clientY - rect.top - innerH / 2 - (MINIMAP_H - innerH) / 2;
    // Re-derive: convert pointer position inside the inner (innerW × innerH) area into content coords.
    const padX = (MINIMAP_W - innerW) / 2;
    const padY = (MINIMAP_H - innerH) / 2;
    const px = clientX - rect.left - padX;
    const py = clientY - rect.top - padY;
    const targetScrollLeft = px / scale - scroller.clientWidth / 2;
    const targetScrollTop = py / scale - scroller.clientHeight / 2;
    scroller.scrollTo({
      left: Math.max(0, Math.min(contentW - scroller.clientWidth, targetScrollLeft)),
      top: Math.max(0, Math.min(contentH - scroller.clientHeight, targetScrollTop)),
      behavior: "auto",
    });
    // silence unused warning
    void localX;
    void localY;
  };

  return (
    <div
      className="sticky bottom-3 left-3 z-20 rounded-lg border border-border bg-background/95 backdrop-blur-sm shadow-md select-none"
      style={{ width: MINIMAP_W, height: MINIMAP_H, marginTop: -MINIMAP_H - 12 }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        handlePointer(e.clientX, e.clientY, e.currentTarget);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        handlePointer(e.clientX, e.clientY, e.currentTarget);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      }}
      onPointerLeave={() => {
        dragging.current = false;
      }}
    >
      <div className="absolute top-1 left-2 text-[9px] font-medium uppercase tracking-wider text-muted-foreground pointer-events-none">
        Minimap
      </div>
      <div
        className="absolute inset-0 m-auto cursor-grab active:cursor-grabbing"
        style={{ width: innerW, height: innerH }}
      >
        {/* Scaled node thumbnails */}
        {cards.map((c) => (
          <div
            key={c.id}
            className={cn(
              "absolute rounded-[2px]",
              c.active ? "bg-primary" : "bg-foreground/30"
            )}
            style={{
              left: c.x,
              top: c.y,
              width: Math.max(c.w, 3),
              height: Math.max(c.h, 2),
            }}
          />
        ))}
        {/* Viewport rectangle */}
        <div
          className="absolute border-2 border-primary bg-primary/10 rounded-[2px] pointer-events-none"
          style={{
            left: viewX,
            top: viewY,
            width: Math.max(viewW, 6),
            height: Math.max(viewH, 6),
          }}
        />
      </div>
    </div>
  );
}

function NodeTree({
  node,
  nodeMap,
  activeNodeId,
  onSelectNode,
  onAddBranch,
  mergeSourceId,
  mergeTargetIds,
  branchGapMap,
  advancedMode,
  teamFilter,
}: {
  node: MapNode;
  nodeMap: Record<string, MapNode>;
  activeNodeId?: string;
  onSelectNode?: (id: string) => void;
  onAddBranch?: (parentId: string) => void;
  mergeSourceId?: string;
  mergeTargetIds?: string[];
  branchGapMap?: Record<string, number>;
  advancedMode?: boolean;
  teamFilter?: string | null;
}) {
  const children = node.children.map((id) => nodeMap[id]).filter(Boolean);
  const style = CATEGORY_STYLES[node.category];
  const isActive = node.id === activeNodeId;
  const mainChild = children.find((child) => !child.isBranch);
  const branchChildren = children.filter((child) => child.isBranch);
  const mergedBranches = mainChild ? branchChildren.filter(isMergedBranch) : [];
  const branchGap = branchGapMap?.[node.id] ?? 0;

  // Shared contributor lookup (matches the avatar shown next to the chat message).
  const contributor = getContributorForId(node.id);
  const { initials, color: avatarColor, name: contributorName, team: contributorTeam } = contributor;
  const matchesTeamFilter = !teamFilter || contributorTeam === teamFilter;
  const isHighlighted = !!teamFilter && matchesTeamFilter;
  const isDimmed = !!teamFilter && !matchesTeamFilter;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onSelectNode?.(node.id)}
          className={cn(
            "w-[280px] p-4 rounded-xl border text-left transition-all hover:shadow-md",
            isActive
              ? "border-primary shadow-md ring-2 ring-primary/20"
              : "border-border bg-background",
            isHighlighted && "ring-2 ring-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.15)] border-amber-400",
            isDimmed && "opacity-30 grayscale"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", style.bg, style.text)}>
              {style.label}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
              {node.timestamp ? formatTimeAgo(node.timestamp instanceof Date ? node.timestamp : new Date(node.timestamp)) : "just now"}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mt-2">{node.label}</h3>
          <p className="text-xs text-muted-foreground mt-1">{node.description}</p>
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/60">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white shrink-0"
              style={{ backgroundColor: avatarColor }}
              title={`${contributorName} · ${contributorTeam}`}
            >
              {initials}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {contributorName} · {contributorTeam}
            </span>
            <span
              className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"
              title="Recently active"
              aria-hidden
            />
          </div>
        </motion.button>
        {(mergeTargetIds || []).map((mergeTargetId) => (
          <span
            key={mergeTargetId}
            data-merge-target={mergeTargetId}
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border"
            aria-hidden="true"
          />
        ))}
      </div>

      {(mainChild || branchChildren.length > 0) && (
        <div className="relative flex flex-col items-center">
          <div className="w-px bg-border" style={{ height: branchChildren.length > 0 ? "24px" : "32px" }} />

          {branchChildren.length > 0 && (
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-border z-10 shrink-0" />

              <svg
                className="absolute pointer-events-none overflow-visible"
                style={{ left: "50%", top: "50%" }}
                width="1"
                height="1"
                fill="none"
              >
                {branchChildren.map((_, index) => {
                  const endX = (index + 1) * BRANCH_COLUMN_OFFSET;
                  return (
                    <g key={index}>
                      <path
                        d={`M 0 0 L ${endX - BRANCH_CURVE_RADIUS} 0 Q ${endX} 0 ${endX} ${BRANCH_CURVE_RADIUS}`}
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        fill="none"
                      />
                      <circle cx={endX} cy={BRANCH_CURVE_RADIUS} r="3.5" fill="hsl(var(--border))" />
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {branchChildren.length > 0 && mainChild && (
            <>
              <div className="w-px h-4 bg-border" />
              <div className="my-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground text-background font-medium">
                  {advancedMode ? "main" : "Main path"}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
            </>
          )}

          {branchChildren.length > 0 && mainChild && (
            <div data-main-slot={node.id} className="h-0 w-0" aria-hidden="true" />
          )}

          {mainChild && branchGap > 0 && (
            <div aria-hidden="true" className="w-px bg-border" style={{ height: `${branchGap}px` }} />
          )}

          {branchChildren.length > 0 && !mainChild && (
            <>
              <div className="w-px h-4 bg-border" />
              <button
                onClick={() => onAddBranch?.(node.id)}
                className="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center hover:bg-secondary hover:border-muted-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </>
          )}

          {mainChild && (
            <NodeTree
              node={mainChild}
              nodeMap={nodeMap}
              activeNodeId={activeNodeId}
              onSelectNode={onSelectNode}
              onAddBranch={onAddBranch}
              mergeTargetIds={mergedBranches.map((branchNode) => getMergeAnchorId(branchNode))}
              branchGapMap={branchGapMap}
              mergeSourceId={mergeSourceId}
              advancedMode={advancedMode}
              teamFilter={teamFilter}
            />
          )}

          {branchChildren.map((branch, index) => {
            const curveEndY = 24 + 6 + BRANCH_CURVE_RADIUS;
            const isMerged = isMergedBranch(branch);
            const mergeAnchorId = getMergeAnchorId(branch);
            const rawLabel = branch.branchLabel || `Path ${index + 1}`;
            const friendlyLabel = isMerged
              ? (advancedMode ? "merged" : "combined")
              : rawLabel.replace(/^Branch\b/i, advancedMode ? "Branch" : "Path");

            return (
              <div
                key={branch.id}
                className="absolute flex flex-col items-center"
                data-branch-subtree-parent={node.id}
                style={{
                  left: `calc(50% + ${(index + 1) * BRANCH_COLUMN_OFFSET}px)`,
                  top: `${curveEndY}px`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="w-px h-4 bg-border" />
                <div className="mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {friendlyLabel}
                  </span>
                </div>
                <div className="w-px h-4 bg-border" />
                <NodeTree
                  node={branch}
                  nodeMap={nodeMap}
                  activeNodeId={activeNodeId}
                  onSelectNode={onSelectNode}
                  onAddBranch={onAddBranch}
                  branchGapMap={branchGapMap}
                  mergeSourceId={isMerged && mainChild ? mergeAnchorId : undefined}
                  advancedMode={advancedMode}
                  teamFilter={teamFilter}
                />
              </div>
            );
          })}
        </div>
      )}

      {children.length === 0 && mergeSourceId && (
        <>
          <div className="w-px h-4 bg-border" />
          <span
            data-merge-source={mergeSourceId}
            className="block h-2 w-2 rounded-full bg-border"
            aria-hidden="true"
          />
        </>
      )}

      {children.length === 0 && !mergeSourceId && (
        <>
          <div className="w-px h-4 bg-border" />
          <button
            onClick={() => onAddBranch?.(node.id)}
            className="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center hover:bg-secondary hover:border-muted-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </>
      )}
    </div>
  );
}
