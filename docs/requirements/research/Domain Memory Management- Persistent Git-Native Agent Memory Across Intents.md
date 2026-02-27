# Domain Memory Management: persistent, git-native agent memory across intents

This is a **P1 feature request** (status: In Progress, target Q1 2026) for VibeData's Studio Agent. The core problem: the agent has **zero memory between intents** — it re-discovers source quirks, regenerates the same validation fixes, and forgets business rule corrections every single time. The proposed solution is a **per-domain, git-native memory layer** that sits between ephemeral intent context and the curated Skills system, allowing knowledge to accumulate, persist, and eventually graduate into Skills. The design draws heavily from the [OneContext / Git Context Controller](https://arxiv.org/abs/2508.00031) paper, which demonstrated ~13% SWE-bench improvement by treating agent memory like git.

---

## The problem: agents forget everything between intents

The feature request documents five concrete symptoms. The agent re-discovers the same source quirks every intent, wasting **3–5 minutes per intent** on schema exploration it has already done. Validation failures repeat across intents — the same fix (e.g., `WHERE NOT IsDeleted` for Salesforce) gets regenerated from scratch each time, burning up to **5 remediation iterations**. Business rule corrections don't persist: a user corrects "revenue = invoice date, not ship date," and the agent forgets on the next intent. Successful model patterns (materialization strategies, incremental logic, join patterns) are reinvented rather than reused. And Skills are static — domain knowledge never grows organically from actual usage.

The document argues that VibeData's domain is *narrower and more repetitive* than general SWE tasks: the same sources (Salesforce, QuickBooks, databases) reappear across intents, the same transformation patterns recur, so **the ROI of memory is higher here than in general coding agents.**

---

## Four categories of memory, with different trust levels

The memory store organizes entries into four categories, each with its own commit policy:

**Validation Patterns** auto-commit without approval. These are technically verifiable facts the agent observed working — e.g., "Salesforce: always filter IsDeleted" or "QuickBooks: dates are UTC."

**Source Schema Knowledge** also auto-commits. Examples: "salesforce opportunity.Amount is nullable for open opps" or "join on AccountId not Account_Name."

**Successful Transformations** auto-commit as well: incremental-on-modified_date for large fact tables, view materialization for staging, etc.

**Business Rule Corrections** are the exception — they **require user approval** before becoming active. Examples: "Revenue recognized at invoice date," "discount applies pre-tax," "fiscal year starts April 1." The rationale is precise: low-risk/technical entries auto-commit because they're empirically verifiable (the agent saw them work), but business rules encode *domain semantics* the agent can't independently verify. A wrong rule in memory is worse than no rule at all.

---

## Memory lifecycle: from draft to promoted Skill

Each memory entry follows a four-stage lifecycle. It begins as **Draft** — extracted from intent context or manually added by a user. Auto-commit categories (validation patterns, schema knowledge, transformations) become Active immediately; business rules wait for user confirmation. Once **Active**, entries are available for agent retrieval and the system tracks their application count and success rate. After being applied **N+ times with consistently positive outcomes**, an entry reaches **Validated** status and becomes a candidate for promotion. Finally, entries can be **Promoted to Skill** via human review — at which point they're indistinguishable from hand-authored Skills in the UI.

Promotion criteria are explicit: applied **≥ 3 times**, success rate **≥ 90%**, and no conflicting memories. When thresholds are met, the entry surfaces in a promotion queue for user review. Promotion is always human-gated.

---

## How retrieval works: progressive, mandatory, multi-trigger

Memory retrieval is **mandatory at PLAN phase start** — the agent always queries domain memory when beginning a new intent. The retrieval strategy uses progressive retrieval inspired by OneContext: a broad index search, then selective load of relevant entries, then injection into context alongside Skills.

Three triggers invoke memory retrieval. The **PLAN phase start** (mandatory) loads source-related knowledge and past patterns. **Validation failure** triggers a search for known fix patterns matching the failure signature. **User correction** checks for conflicting existing memories.

Four new MCP tools support these operations: `memory_search` (search by category, source, keyword — returns ranked entries), `memory_commit` (write a new entry, auto-commit or pending approval), `memory_retrieve` (fetch full entry by ID for progressive drill-down), and `memory_feedback` (record success/failure outcome when a memory was applied).

The document illustrates the efficiency gain with a validation shortcut diagram. Without memory, a failure triggers hypothesis → fix → re-validate → fail → new hypothesis → fix → pass (**2+ iterations**). With memory: fail → memory match → apply known fix → pass (**1 iteration**).

---

## Git-native storage: markdown files in the dbt project repo

Memory lives **in git, inside the domain's dbt project repository** — not in Azure Blob. The document gives five reasons for this choice. VibeData is already git-native (intents map to branches, artifacts are committed, PRs drive deployment). Git provides **version history for free**. OneContext's core insight is git-structured memory, so storing it outside git would miss the point. Memory is **portable** — it travels with the repo on fork/clone/migrate. And memory changes are **reviewable** — they show up in PRs and diffs.

The storage format is **markdown on `main`**, explicitly not JSON — chosen for human readability, diffability, and direct editability. The agent uses existing `file_read` / `file_write` tools with `git_commit` to persist. The directory structure is:

```text
{domain_slug}/
  dbt_project/
  memory/
    index.md
    validation_patterns/
    source_schema/
    transformations/
    business_rules/
    _pending/              # Business rules awaiting approval
```

Memory commits are batched per intent and use a conventional `[memory]` prefix to reduce git noise.

---

## Agent behavior changes in PLAN and EXECUTE phases

In the **PLAN phase**, new mandatory steps are added after source discovery: the agent queries domain memory for source-related knowledge and past transformation patterns, and the plan explicitly references applicable memories.

In the **EXECUTE phase**, on validation failure the agent queries memory for known fix patterns. If a match is found, it applies the fix directly — skipping hypothesis generation entirely. After validation passes, the agent extracts and commits new memories. If the user made corrections, the agent proposes business rule entries for approval.

---

## Success metrics and risk mitigations

The target metrics are ambitious: average validation iterations per intent dropping from **~2.5 to <1.5**, PLAN phase time for repeat sources from **~5 min to <2 min**, repeat business rule corrections to **<1 per domain per quarter**, at least **5 memory entries promoted to Skills** per domain in the first 3 months, and **>90% first-attempt success** on known patterns.

Six risks are identified with mitigations. **Stale memories** (high severity) are handled by confidence decay over time, agent warnings, and user pruning. **Memory pollution** (medium) is controlled by auto-committing only verified patterns, requiring approval for business rules, and feedback tracking that auto-deactivates poor entries. **Context bloat** (medium) is managed via progressive retrieval, capped injection per intent, and ranking by relevance + confidence. **Conflicting memories** (medium) are caught by semantic overlap checks on commit and flagged for user resolution. **Multi-tenant isolation** (high) relies on per-domain, per-tenant git repo boundaries. **Git noise** (low) is addressed by batching commits and using the `[memory]` prefix.

---

## What's borrowed from OneContext — and what isn't

From OneContext, the design takes git-native structure, progressive retrieval, cross-session persistence, and action trace extraction. It explicitly does **not** take cross-agent sharing (VibeData has one agent type), raw conversation log storage (they already have chat history), CLI-based management (replaced by server-side MCP tools), or SQLite backend (replaced by git-native storage).

Four open questions remain: the right confidence scoring model (simple heuristic vs. LLM-judged relevance), how memory interacts with model switching (Opus vs. Haiku), whether memory commits to `main` should go through PR-like review or direct-commit, and the right cap on memories injected per intent.
