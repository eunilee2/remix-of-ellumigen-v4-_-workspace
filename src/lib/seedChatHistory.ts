import type { ChatMessage } from "@/types/chat";

/**
 * Pre-seeded chat history for the 5 demo chats so users land on a populated
 * workspace instead of empty threads. Each entry is paired user ↔ assistant.
 *
 * Timestamps are reconstructed from a base offset (days ago) so messages feel
 * historically ordered relative to the chat's createdAt.
 */

interface SeedMessage {
  role: "user" | "assistant";
  content: string;
  contextTags?: string[];
}

interface ChatSeed {
  chatId: string;
  /** Base age of the chat in days; messages walk forward from there. */
  daysAgo: number;
  messages: SeedMessage[];
}

const SEEDS: ChatSeed[] = [
  // ───────────────────────────────────────────── 1. TCGA-BRCA outcomes
  {
    chatId: "1",
    daysAgo: 1,
    messages: [
      {
        role: "user",
        content:
          "I'd like to look at survival outcomes in TCGA-BRCA stratified by molecular subtype. What's the right starting point?",
        contextTags: ["@TCGA-BRCA"],
      },
      {
        role: "assistant",
        content:
          "Great starting point. For TCGA-BRCA we typically stratify by **PAM50 subtype** (Luminal A, Luminal B, HER2-enriched, Basal-like, Normal-like) and use **overall survival (OS)** plus **disease-free interval (DFI)** as outcomes.\n\nHere's what I'd propose:\n\n1. Pull clinical + PAM50 calls from the TCGA-BRCA harmonized release (n ≈ 1,098)\n2. Filter to primary tumors with non-missing OS time\n3. Fit Kaplan–Meier curves per subtype and a Cox model adjusted for stage and age\n\nWant me to run that?",
      },
      {
        role: "user",
        content: "Yes, run it. Also show me the median survival per subtype.",
      },
      {
        role: "assistant",
        content:
          "Done. After filtering I had **1,082 patients** with usable OS data.\n\n**Median OS by PAM50 subtype:**\n- Luminal A: not reached (10-yr OS ≈ 85%)\n- Luminal B: 12.4 yrs\n- HER2-enriched: 9.1 yrs\n- Basal-like: 10.6 yrs\n- Normal-like: not reached\n\nLog-rank p < 0.001 across groups. In the Cox model adjusted for stage and age at diagnosis, **Basal-like** (HR 1.84, 95% CI 1.21–2.79) and **HER2-enriched** (HR 1.62, 95% CI 1.02–2.58) showed significantly worse outcomes versus Luminal A.",
      },
      {
        role: "user",
        content: "Interesting. Can we layer TP53 mutation status on top of subtype?",
      },
      {
        role: "assistant",
        content:
          "Yes — TP53 status is a strong modifier here. Within the Basal-like group, ~80% are TP53-mutant, so the signal is mostly driven by them. In Luminal A, TP53 mutation is rarer (~12%) but those patients have notably worse OS than TP53-wildtype Luminal A (HR 2.11, p = 0.003).\n\nWould you like me to generate a faceted KM plot (subtype × TP53 status) and bookmark it as a key finding?",
      },
    ],
  },
  // ───────────────────────────────────────────── 2. RNA-seq Analysis
  {
    chatId: "2",
    daysAgo: 2,
    messages: [
      {
        role: "user",
        content:
          "I have a fresh bulk RNA-seq dataset, 24 samples, tumor vs adjacent normal. What's a clean DE workflow?",
      },
      {
        role: "assistant",
        content:
          "For 24 samples with paired tumor/normal, a clean workflow:\n\n1. **QC**: FastQC → MultiQC, drop samples with <70% mapped reads\n2. **Alignment + counts**: STAR + featureCounts (or salmon → tximport)\n3. **DE**: DESeq2 with `~ patient + condition` to control for paired design\n4. **Multiple testing**: Benjamini–Hochberg FDR < 0.05, |log2FC| > 1\n5. **Sanity checks**: PCA on rlog-transformed counts, sample-sample heatmap\n\nDo you want me to draft a script template, or run it on uploaded counts?",
      },
      {
        role: "user",
        content:
          "Draft the script template for now. Use DESeq2 and assume the count matrix is already imported as `counts` and the colData has `patient` and `condition`.",
      },
      {
        role: "assistant",
        content:
          "Here's the template:\n\n```r\nlibrary(DESeq2)\n\ndds <- DESeqDataSetFromMatrix(\n  countData = counts,\n  colData   = colData,\n  design    = ~ patient + condition\n)\n\n# Pre-filter low-count genes\ndds <- dds[rowSums(counts(dds)) >= 10, ]\n\n# Run DE\ndds <- DESeq(dds)\nres <- results(dds, contrast = c(\"condition\", \"tumor\", \"normal\"),\n               alpha = 0.05)\n\n# Shrink LFC for ranking / volcano plots\nresLFC <- lfcShrink(dds, coef = \"condition_tumor_vs_normal\",\n                    type = \"apeglm\")\n\n# Sig genes\nsig <- subset(as.data.frame(resLFC),\n              padj < 0.05 & abs(log2FoldChange) > 1)\n```\n\nThe paired `~ patient + condition` design absorbs patient-level variance, which usually doubles the number of significant genes versus an unpaired model on this sample size.",
      },
      {
        role: "user",
        content: "Perfect. After DE, what's the best way to summarize biological themes?",
      },
      {
        role: "assistant",
        content:
          "Two complementary views work well:\n\n- **GSEA** on the *full ranked list* (by `stat` from DESeq2) against MSigDB Hallmark + Reactome — captures coordinated shifts even when individual genes aren't significant.\n- **Over-representation analysis** (clusterProfiler `enrichGO`) on the strict-significant gene set — sharper, more interpretable themes.\n\nReport the top 10 hallmark pathways from each and look for overlap. Want me to chain this onto the DE step?",
      },
    ],
  },
  // ───────────────────────────────────────────── 3. Gene enrichment
  {
    chatId: "3",
    daysAgo: 3,
    messages: [
      {
        role: "user",
        content:
          "I have a list of 312 genes upregulated after a CRISPR screen for drug resistance. What enrichment analyses make sense?",
      },
      {
        role: "assistant",
        content:
          "For 312 genes from a resistance screen I'd run three things in parallel:\n\n1. **GO Biological Process** (clusterProfiler `enrichGO`) — broad functional themes\n2. **Reactome / KEGG pathways** — actionable, drug-target-friendly\n3. **MSigDB Hallmark gene sets** via GSEA if you have the full ranked list (not just top 312)\n\nUse a proper background — *all genes assayed in the screen*, not the genome — otherwise you'll inflate immune/metabolism hits.\n\nDo you want to share the gene list or upload the ranked screen output?",
      },
      {
        role: "user",
        content:
          "Here's the list (assume it's loaded). Run GO BP and Reactome with the screen library as background.",
      },
      {
        role: "assistant",
        content:
          "Results came back clean:\n\n**Top GO BP terms (FDR < 0.05):**\n1. DNA damage response, signal transduction by p53 class mediator\n2. Regulation of apoptotic signaling pathway\n3. Cellular response to oxidative stress\n4. Drug metabolic process\n5. ATP-binding cassette transporter activity\n\n**Top Reactome pathways:**\n1. ABC transporters in lipid homeostasis\n2. Cellular senescence\n3. p53-dependent G1 DNA damage response\n4. Detoxification of ROS\n\nThe theme is consistent: **DNA damage response + drug efflux**, which is a textbook resistance signature. *ABCB1* (MDR1) is in the leading edge of two of those pathways — worth flagging.",
      },
      {
        role: "user",
        content: "Can you bookmark ABCB1 and the senescence finding for the methods writeup?",
      },
      {
        role: "assistant",
        content:
          "Bookmarked both under **Key Findings**. I also pinned the Reactome enrichment table to artifacts so you can drop it directly into a methods/results section.",
      },
    ],
  },
  // ───────────────────────────────────────────── 4. TP53 Mutation Impact Analysis
  {
    chatId: "4",
    daysAgo: 4,
    messages: [
      {
        role: "user",
        content:
          "I want to analyze the downstream impact of TP53 missense mutations across TCGA pan-cancer. Specifically: do hotspot mutations (R175H, R248Q, R273H) have different transcriptomic effects than non-hotspot missense?",
        contextTags: ["@TCGA-PanCancer"],
      },
      {
        role: "assistant",
        content:
          "Good question — this gets at **gain-of-function vs loss-of-function** TP53 biology. My proposed approach:\n\n1. Stratify TCGA samples (n ≈ 10,500) into: TP53-WT, TP53-null (truncating/frameshift), TP53-hotspot missense (R175H/R248Q/R273H/R248W/R282W), TP53-other missense\n2. For each cancer type with ≥30 hotspot samples, run DE between hotspot and null\n3. Look for genes uniquely up in hotspots — candidate GOF effectors\n4. Cross-reference against published GOF signatures (Mantovani et al., Freed-Pastor et al.)\n\nWant me to start with BRCA, LUAD, and COAD where hotspot counts are highest?",
      },
      {
        role: "user",
        content: "Yes, start there. I'm especially curious about chromatin/epigenetic regulators.",
      },
      {
        role: "assistant",
        content:
          "Across BRCA + LUAD + COAD, comparing hotspot missense vs null TP53:\n\n**Consistently up in hotspot (FDR < 0.05 in ≥2 cancers):**\n- *MLL1/KMT2A* (histone methyltransferase) — log2FC +0.8 to +1.4\n- *MOZ/KAT6A* (histone acetyltransferase)\n- *EZH2* — modest but consistent (+0.5)\n- *CHD1*, *CHD7* (chromatin remodelers)\n\nThis matches the Pfister/Prives model: mutant p53 hijacks chromatin machinery to drive an aberrant transcriptional program. The MLL1/MOZ axis was specifically called out in Zhu et al. 2015 — your data recapitulates it.\n\n**Caveat:** sample sizes for non-hotspot missense are uneven; I'd be cautious comparing those directly.",
      },
      {
        role: "user",
        content: "Can we check if the MLL1 upregulation correlates with worse survival in those same patients?",
      },
      {
        role: "assistant",
        content:
          "Yes. In TP53-hotspot patients (BRCA + LUAD + COAD pooled, n = 487), high *MLL1* expression (top tertile) was associated with **worse OS** (HR 1.51, 95% CI 1.12–2.04, p = 0.007), adjusted for stage and cancer type. The same trend was *not* significant in TP53-null patients (HR 1.08, p = 0.61), which is consistent with MLL1 being part of the GOF program specifically.",
      },
    ],
  },
  // ───────────────────────────────────────────── 5. BRCA1 Functional Annotation
  {
    chatId: "5",
    daysAgo: 5,
    messages: [
      {
        role: "user",
        content:
          "I'm building a functional annotation profile for BRCA1. I want domain structure, key interactors, and the major variant classes. Where do we start?",
      },
      {
        role: "assistant",
        content:
          "Let's structure it in three layers:\n\n**1. Domain architecture (N→C):**\n- RING domain (aa 1–109) — E3 ligase, heterodimerizes with BARD1\n- Coiled-coil + BRCT repeats (aa 1646–1859) — phospho-peptide binding, recruits ABRAXAS / BRIP1 / CtIP\n\n**2. Core complexes:**\n- BRCA1-A (with ABRAXAS, RAP80) — DSB recognition\n- BRCA1-B (with BRIP1) — replication stress response\n- BRCA1-C (with CtIP) — end resection, HR commitment\n\n**3. Variant classes:**\n- Pathogenic: truncating in BRCT or RING, missense disrupting Zn coordination\n- VUS: largely missense outside structured domains\n- Benign: synonymous, non-conserved missense\n\nWant me to pull ClinVar variant counts per domain?",
      },
      {
        role: "user",
        content: "Yes, and overlay the variant density on the domain map.",
      },
      {
        role: "assistant",
        content:
          "Pulled ClinVar (release 2024-09):\n\n- **Pathogenic/Likely pathogenic**: 4,287 variants — strongly enriched in RING (density 38/100 aa) and BRCT (density 31/100 aa) regions\n- **VUS**: 2,914 variants — distributed roughly uniformly across the protein, slightly depleted in RING/BRCT\n- **Benign/Likely benign**: 612 variants\n\nThe density contrast between RING/BRCT and the central unstructured region is the cleanest visual argument that **structured domains tolerate fewer changes**. I've prepared a lollipop plot you can drop in.",
      },
      {
        role: "user",
        content: "Great. One more — can you list the top 5 BRCA1 missense VUS that are most likely re-classifiable based on functional assay coverage?",
      },
      {
        role: "assistant",
        content:
          "Cross-referencing ClinVar VUS against the Findlay et al. 2018 saturation genome editing dataset and the Starita lab BRCT functional scores:\n\n1. **R1699Q** — BRCT, functional assay = damaging, ClinVar conflicting → strong candidate for *Likely Pathogenic*\n2. **M1775R** — BRCT, peptide-binding loss confirmed → *Likely Pathogenic*\n3. **C61G** — RING, abolishes E3 activity → *Likely Pathogenic*\n4. **S1715N** — BRCT, functional but borderline → likely *Benign*\n5. **V1736A** — BRCT, retains function across two assays → likely *Benign*\n\nAll five have ≥2 independent functional readouts, which is the bar for ACMG PS3/BS3 evidence.",
      },
    ],
  },
];

/**
 * Build seeded ChatMessage[] for a given chat id, with deterministic ids
 * and timestamps walking forward from the chat's age.
 */
export function buildSeededMessages(chatId: string): ChatMessage[] {
  const seed = SEEDS.find((s) => s.chatId === chatId);
  if (!seed) return [];

  const baseTime = Date.now() - seed.daysAgo * 86_400_000;
  // Spread messages across ~2 hours within that day
  const spacingMs = (2 * 60 * 60 * 1000) / Math.max(seed.messages.length - 1, 1);

  return seed.messages.map((m, idx) => ({
    id: `seed-${chatId}-${idx}`,
    role: m.role,
    content: m.content,
    timestamp: new Date(baseTime + idx * spacingMs),
    contextTags: m.contextTags,
  }));
}

/** All chat ids that have seed data. */
export const SEEDED_CHAT_IDS = SEEDS.map((s) => s.chatId);
