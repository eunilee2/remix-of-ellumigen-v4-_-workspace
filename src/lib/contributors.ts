// Shared contributor (collaborator) lookup so the chat bubbles and the
// conversation/branching map show the same person for a given message.

export interface Contributor {
  initials: string;
  name: string;
  color: string; // hex
  team: string;
}

// Pool of fictional teammates spread across a few research teams.
export const CONTRIBUTORS: Contributor[] = [
  { initials: "AV", name: "Ava Vargas",   color: "#2563eb", team: "Genomics" },
  { initials: "MK", name: "Marcus Kim",   color: "#9333ea", team: "Bioinformatics" },
  { initials: "SR", name: "Sara Rao",     color: "#059669", team: "Genomics" },
  { initials: "JL", name: "Jordan Liu",   color: "#dc2626", team: "Clinical Research" },
  { initials: "EN", name: "Elena Novak",  color: "#d97706", team: "Bioinformatics" },
  { initials: "PT", name: "Priya Thomas", color: "#0891b2", team: "Clinical Research" },
];

export const TEAMS = Array.from(new Set(CONTRIBUTORS.map((c) => c.team)));

/** Deterministic contributor for a stable id (e.g. message id / node id). */
export function getContributorForId(id: string): Contributor {
  if (!id) return CONTRIBUTORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) >>> 0;
  }
  return CONTRIBUTORS[hash % CONTRIBUTORS.length];
}
