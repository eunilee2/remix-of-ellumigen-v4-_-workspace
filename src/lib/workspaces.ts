import type { Chat } from "@/types/chat";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  /** chat ids that belong to this workspace */
  threadIds: string[];
  datasets: string[];
  methods: string[];
  collaborators: number;
  updatedAt: Date;
}

/**
 * Threads in Ellumigen always belong to a workspace. Workspaces are derived
 * from a static map keyed on the demo chat ids, plus a fallback for any
 * user-created chats. This keeps the chat store untouched while letting the
 * UI present a workspace-first mental model.
 */
const STATIC_WORKSPACE_ASSIGNMENTS: Record<string, string> = {
  "1": "ws-cancer",
  "2": "ws-cancer",
  "3": "ws-enrichment",
  "4": "ws-cancer",
  "5": "ws-enrichment",
};

const WORKSPACE_DEFINITIONS: Record<
  string,
  Omit<Workspace, "threadIds" | "updatedAt">
> = {
  "ws-cancer": {
    id: "ws-cancer",
    name: "Cancer Study — TCGA Cohort A",
    description: "Differential expression and survival analyses across BRCA & LUAD cohorts.",
    datasets: ["TCGA-BRCA", "TCGA-LUAD"],
    methods: ["statistical-analysis", "survival-analysis"],
    collaborators: 4,
  },
  "ws-enrichment": {
    id: "ws-enrichment",
    name: "Pathway Enrichment Atlas",
    description: "Functional annotation and pathway enrichment exploration.",
    datasets: ["Reactome", "KEGG"],
    methods: ["enrichment", "annotation"],
    collaborators: 2,
  },
  "ws-default": {
    id: "ws-default",
    name: "Untitled Workspace",
    description: "Drafts and untitled explorations.",
    datasets: [],
    methods: [],
    collaborators: 1,
  },
};

export function getWorkspaceIdForChat(chatId: string): string {
  return STATIC_WORKSPACE_ASSIGNMENTS[chatId] ?? "ws-default";
}

export function buildWorkspaces(chats: Chat[]): Workspace[] {
  const map = new Map<string, Workspace>();
  // ensure all known workspaces exist even if empty
  Object.values(WORKSPACE_DEFINITIONS).forEach((def) => {
    map.set(def.id, { ...def, threadIds: [], updatedAt: new Date(0) });
  });

  for (const chat of chats) {
    const wsId = getWorkspaceIdForChat(chat.id);
    const ws = map.get(wsId) ?? {
      ...WORKSPACE_DEFINITIONS["ws-default"],
      threadIds: [],
      updatedAt: new Date(0),
    };
    ws.threadIds.push(chat.id);
    if (chat.updatedAt > ws.updatedAt) ws.updatedAt = chat.updatedAt;
    map.set(wsId, ws);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export function getWorkspaceForChat(
  chats: Chat[],
  chatId: string | null | undefined
): Workspace | null {
  if (!chatId) return null;
  const wsId = getWorkspaceIdForChat(chatId);
  return buildWorkspaces(chats).find((w) => w.id === wsId) ?? null;
}

/**
 * Find threads that share datasets or methods with the given chat — used to
 * surface "related threads" inside a chat so users can navigate laterally.
 */
export function getRelatedThreads(
  chats: Chat[],
  chatId: string | null
): { chat: Chat; reason: string }[] {
  if (!chatId) return [];
  const ws = getWorkspaceForChat(chats, chatId);
  if (!ws) return [];
  return chats
    .filter((c) => c.id !== chatId && ws.threadIds.includes(c.id))
    .map((c) => ({
      chat: c,
      reason: c.parentId === chatId ? "Branched from this thread" : "Same workspace",
    }));
}

/**
 * Resolve which thread (if any) a thread was branched from. Falls back to
 * `parentId` on the chat. Demo data doesn't yet wire these, but the UI is
 * ready when they exist.
 */
export function getParentThread(chats: Chat[], chat: Chat): Chat | null {
  if (!chat.parentId) return null;
  return chats.find((c) => c.id === chat.parentId) ?? null;
}
