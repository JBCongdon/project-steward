# Project Steward — Full Product Requirements Document

**Version:** 1.1 — complete product definition
**Status:** Draft
**Date:** 2026-08-05
**Changes in 1.1:** expanded provenance model (§21.1–21.7) · audit trust requirements (§12.1.1–12.1.6) · incident linkage (§14.6) · operational contracts (§25) · six new risks (R11–R16)

---

## 0. How to read this document

This specifies **everything worth building**, not a release cut. Sections §8–§17 define the full capability surface; §18 defines the order to build it in.

**On sequencing:** build order here is gated by *evidence*, not calendar. Implementation with coding agents is fast and is not the constraint. The constraints are: (a) detector precision, which requires labeled corpora to measure; (b) developer trust, which requires read-only mode to precede write mode regardless of how quickly the write path can be coded; (c) vendor-surface volatility, which is external. Gates in §18 are stated as "what must be true," not "how long it takes."

**On correctness:** where a claim is unverified, it says so inline. No invented library names, hook event names, config paths, or SDK methods appear anywhere in this document — those must be confirmed against current vendor documentation at build time.

---

## 1. Summary

Project Steward is a vendor-neutral project intelligence layer for AI-assisted engineering. It maintains a durable, evidence-backed model of what a software project intends, what it decided, what it actually built, and where those three disagree — and it serves task-scoped slices of that model to whichever coding agent is currently working.

**Positioning:** *Plan the work. Preserve the decisions. Detect the drift. Restore the project.*

**Three modes:**

| Mode | Command surface | Job |
|---|---|---|
| **Build** | `run`, `plan`, `context` | Turn a casual prompt into governed engineering work |
| **Maintain** | `reconcile`, `handoff`, `check` | Keep plans, decisions, docs, and code aligned as work happens |
| **Recover** | `audit`, `tidy`, `recover` | Repair an existing or off-track project |

Plus four capability layers the source concept did not include: **governance/CI** (§13), **project intelligence** (§14), **trust boundary & classification overlay** (§15), and **self-evaluation** (§17).

---

## 2. Problem

| # | Problem | Confidence it's real | Evidence status |
|---|---|---|---|
| P1 | Context re-explanation tax across agent sessions | High | Anecdotal + mechanically obvious; no verified study |
| P2 | Documentation drift, accelerating with agent velocity | High | Widely reported; unquantified |
| P3 | Architecturally significant decisions made inside agent sessions and never recorded | Medium | Plausible, not measured |
| P4 | Completion claims from agents are unverified — "done" means "the agent stopped" | High | Directly observable |
| P5 | Parallel agents/worktrees produce conflicting project state | Medium | Emerging; grows with agent concurrency |
| P6 | No one can answer "why is this like this" once the session that decided it is gone | High | Pre-existing problem, now worse |

I have no verified quantitative source sizing any of these. They are the product hypotheses; they should be measured in the first 20 install cohort, not asserted in external positioning.

---

## 3. Users

| Persona | Job to be done | Primary surface |
|---|---|---|
| Solo/small-team dev, multiple agents | Stop re-explaining the project every session | Context packet, handoff |
| Dev inheriting an unfamiliar repo | Know what's true before touching anything | `audit`, `explain`, onboarding brief |
| Tech lead, AI-accelerated team | Detect drift before it compounds; verify agent completion claims | `reconcile`, `check`, drift budget |
| Staff/principal engineer | Preserve architectural intent across many contributors and agents | ADR flow, assumption register |
| Platform/DevEx | Standardize agent workflow across teams | Policy engine, CI mode, multi-repo |
| Security/compliance engineer | Know where trust boundaries and data classifications actually are | Classification overlay (§15) |
| Engineering manager | See whether the project is converging or drifting | Drift trend, agent conformance |

---

## 4. Product principles

1. **Documentation is a consequence of meaningful work** — not a prerequisite ceremony, not an automatic transcript.
2. **Every claim carries provenance and confidence.** "I cannot find a use" ≠ "this is unused."
3. **Evidence gates completion.** An agent's claim that work is done is a hypothesis until artifacts support it.
4. **The repository is the source of truth.** The index is a derived cache, fully rebuildable.
5. **Never fabricate history.** Reconstructed decisions are labeled reconstructed, with unresolved questions attached.
6. **Git is the safety boundary.** Nothing mutating happens outside an isolated branch or worktree.
7. **Silence is a valid output.** No durable knowledge created → produce nothing.
8. **Reversibility is a first-class attribute** of every proposed change.

---

## 5. System architecture

```
        ┌───────────────────────────────────────────────────────────────┐
        │  Agents: Claude Code · Codex · Cursor · Copilot · Gemini · … │
        └──────┬──────────────────────────────────────────▲─────────────┘
               │ MCP tool calls / hooks / CLI wrapper     │ context packets
               ▼                                          │ execution briefs
   ┌────────────────────────────────────────────────────────────────────┐
   │                        STEWARD CORE                                 │
   │                                                                      │
   │  ┌────────────┐  ┌─────────────┐  ┌────────────┐  ┌──────────────┐ │
   │  │  INTENT    │  │   CONTEXT   │  │  EVIDENCE  │  │  DOC POLICY  │ │
   │  │ classifier │→ │  compiler   │  │  collector │→ │    engine    │ │
   │  └────────────┘  └─────────────┘  └────────────┘  └──────────────┘ │
   │         │               │                │                 │        │
   │         └───────────────┴────────┬───────┴─────────────────┘        │
   │                                  ▼                                   │
   │  ┌───────────────────────────────────────────────────────────────┐  │
   │  │            RECONCILER  (claim ⟷ evidence adjudication)         │  │
   │  └───────────────────────────────────────────────────────────────┘  │
   │                                  │                                   │
   │  ┌──────────┐  ┌──────────┐  ┌──▼───────┐  ┌──────────┐            │
   │  │  AUDIT   │  │   TIDY   │  │ RECOVER  │  │  CHECK   │  ← modes    │
   │  │ (read)   │  │ (write)  │  │(diagnose)│  │   (CI)   │            │
   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
   └───────────────────────────┬────────────────────────────────────────┘
                               │
        ┌──────────────────────┼───────────────────────┐
        ▼                      ▼                       ▼
┌───────────────┐   ┌────────────────────┐   ┌──────────────────┐
│  KNOWLEDGE    │   │    .project/       │   │   REPOSITORY     │
│    GRAPH      │◄──│  Markdown truth    │◄──│ git · src · tests│
│ SQLite → graph│   │  (human editable)  │   │ manifests · CI   │
└───────────────┘   └────────────────────┘   └──────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│  SAFETY: git worktree isolation · receipts · rollback      │
└────────────────────────────────────────────────────────────┘
```

**Integration priority:** MCP first (only stable cross-vendor contract), instruction adapters second, CLI wrapper third, native hooks opportunistically. Rationale in §19.

---

## 6. Knowledge graph — the durable asset

The Markdown generator is trivially copyable. The asset is the accumulated, evidence-linked graph.

### Core chain

```
Prompt → Objective → Plan → Task → Change → Test → Claim → Evidence
                       │                                      │
                       └──── governed_by ──> Decision <───────┘
                                                │
                                                └──> Consequence
                                                └──> Assumption
```

### Entity types

| Entity | Key fields |
|---|---|
| `Objective` | intent, origin prompt, status, opened/closed commit |
| `Plan` | tasks, threshold reason, lifecycle state, owner |
| `Task` | description, expected evidence, actual evidence, status |
| `Decision` (ADR) | status, options, drivers, consequences, rollback, supersedes |
| `Assumption` | statement, validation status, validation method, review date |
| `Constraint` | statement, source, enforcement (advisory/CI-enforced), scope |
| `Component` | discovered vs. documented identity, boundaries, owners |
| `Change` | commit, files, diff summary, session, agent identity |
| `Test` | name, target, last result, coverage relationship |
| `Claim` | agent assertion, adjudication result, evidence set |
| `Evidence` | type, artifact reference, observed_at, baseline commit |
| `Session` | agent, start/end, ledger, handoff, receipts |
| `TrustBoundary` | crossing points, auth mechanism, data classification (§15) |

### Edge attributes (mandatory on every edge)

`source` ∈ {parsed, git-derived, agent-observed, inferred, user-asserted} · `confidence` ∈ {high, medium, low} · `observed_at` · `baseline_commit` · `superseded_by`

### Queries the graph must answer

- Which decisions govern this file / this change / this PR?
- What code implements ADR-0012, and does it still?
- Which plans are now inconsistent with the repository?
- Which assumptions have never been validated, and which are overdue?
- What changed without a recorded decision?
- What evidence proved this feature complete, and was it sufficient?
- What did we believe about authentication as of commit X? *(time-travel, §14.3)*
- Which components cross a trust boundary without a governing decision?
- If I change this file, what decisions, plans, tests, and docs are implicated? *(blast radius)*

### Storage path

SQLite with typed relationship tables initially — embeddable, zero-ops, fully rebuildable from repo + git. Graph backend (Dgraph or equivalent) becomes viable at multi-repo scale (§16). **The migration must be a swap behind a repository interface, designed for from the first commit.** Do not let SQLite semantics leak into the query layer.

---

## 7. Storage layout

```
.project/
├── project.md              # stable identity: purpose, users, boundaries, principles
├── architecture.md         # system map: components, flows, trust boundaries, ADR links
├── glossary.md             # canonical domain terms
├── status.md               # active objectives, in-progress, blockers, known-broken
├── policy.yaml             # documentation policy engine config (§13.1)
├── decisions/
│   ├── index.md
│   └── ADR-NNNN-*.md
├── plans/
│   ├── active/
│   ├── completed/
│   └── abandoned/
├── knowledge/
│   ├── constraints.md
│   ├── assumptions.md      # ← addition: validation register (§14.1)
│   ├── operations.md
│   └── security.md
├── sessions/
│   ├── handoff.md
│   └── ledger/             # per-session evidence ledgers
└── receipts/               # cleanup + reconcile receipts (§12.6)
```

`.steward/` (gitignored) holds the SQLite index, worktrees, and caches. Everything in `.project/` is committed and human-editable.

---

# BUILD MODE

## 8. Intent classification and documentation policy

### 8.1 Intent classifier

Every incoming prompt is classified before work starts:

| Dimension | Values |
|---|---|
| Kind | exploratory · corrective · additive · architectural · security-sensitive · operational · routine |
| Blast radius | single file · single component · cross-component · cross-service · infrastructure |
| Reversibility | trivial · moderate · hard |
| Definedness | sufficient · ambiguous · underspecified |

### 8.2 Documentation obligation matrix

| Prompt shape | Obligation |
|---|---|
| "Fix this typo" | None |
| "Add validation to this endpoint" | Lightweight task record; API behavior note if contract changes |
| "Replace Redis with NATS" | Proposed ADR **before** implementation |
| "Build authentication" | Specification + plan + security assumptions + tasks |
| "Refactor the payment service" | Retrieve governing ADRs and constraints before planning |
| "Finish this feature" | Full reconciliation: implementation, tests, plan status, open decisions |
| "Why did we use Keycloak?" | Answer from decision history with citations — no writes |

**This matrix is not hardcoded.** It is the default ruleset of the policy engine (§13.1), so teams can tune thresholds without forking. Hardcoding it makes the product's central judgment unauditable.

### 8.3 Plan threshold

A plan is created when work crosses a configurable threshold: multiple components · multiple files above N · hard reversibility · security/data/infra surface · unclear implementation sequence · explicit user request. Thresholds live in `policy.yaml`.

### 8.4 ADR threshold

An ADR is created when a decision is architecturally significant · expensive to reverse · chosen among meaningful alternatives · consequential for security, availability, data, dependency, or operations.

### 8.5 Proposed-ADR flow

```
Prompt implying enduring decision
        ↓
Steward drafts ADR: Status Proposed
   context · drivers · options · decision: PENDING
        ↓
Agent implements; steward observes evidence
        ↓
Reconciler fills: actual decision · alternatives rejected
   code references · performance evidence · consequences
   rollback instructions · superseded decisions
        ↓
ADR promoted to Accepted (human approval gate configurable)
```

The model never invents a clean retrospective narrative. Everything in the final ADR traces to an observed artifact or is explicitly marked as unresolved.

---

## 9. Context packet compilation *(highest-value single feature)*

Task-scoped brief, served over MCP and inspectable via CLI.

```yaml
objective: Add entitlement checks to object downloads.
relevant_components:
  - api/download_handler.go     # reason: owns the download route
  - authz/policy_client.go      # reason: existing authz call site
governing_decisions:
  - ADR-0007: Centralize entitlement decisions   [high, parsed]
  - ADR-0011: Fail closed for classified resources [high, parsed]
constraints:
  - Do not persist bearer tokens                 [knowledge/security.md]
  - P95 authorization overhead below 50 ms       [ADR-0007]
  - Existing API response schema is fixed        [ADR-0004]
open_assumptions:
  - Policy service availability assumed 99.9% — never validated
required_evidence:
  - Unit tests: denied and permitted paths
  - Integration test against policy service
  - Failure-mode test: policy service unavailable
documentation_obligations:
  - Update authorization flow in architecture.md
  - No new ADR unless existing policy changes
excluded:
  summary: 34 documents, 211 files judged irrelevant
  nearest_misses: [authz/legacy_roles.go, ADR-0003]
```

**Requirements**

- Every inclusion states *why*. Every packet reports its exclusions in aggregate, with nearest misses — under-retrieval must be detectable, not silent.
- Hard, configurable token budget. Over budget → drop by relevance rank and say so.
- Deterministic given (task, commit, config).
- Retrieval feedback loop: record which supplied items the agent actually touched vs. ignored, and which files it touched that were *not* supplied. This is the self-improvement signal (§14.4) and the hardest thing for a competitor to replicate.

---

## 10. Execution brief

What the agent receives at task start: objective · context packet · plan step · required evidence · documentation obligations · prohibited actions (from constraints) · definition of done.

Explicitly *not* the whole `.project/` directory. Dumping documentation is the failure mode this feature exists to replace.

---

# MAINTAIN MODE

## 11. Session observation and reconciliation

### 11.1 Session ledger

While work happens, the steward observes and **accumulates without writing**: files changed · commands run · tests executed and results · dependencies added/removed · plan deviations · assumptions surfaced · work deferred · decisions implied · security/operational consequences.

Continuous document rewriting is prohibited. Candidates accumulate in the ledger.

### 11.2 Reconciliation

Triggered by a completion claim.

```
Implementation diff + Test results + Original objective + Existing records
                              ↓
                    Claim adjudication
                              ↓
   ┌──────────┬──────────────┬──────────────┬─────────────┐
   ▼          ▼              ▼              ▼             ▼
Update    Promote/create   Update       Record        Reject
plan          ADR        architecture  unresolved   completion
status                      map           work
```

**Completion rejection is a required capability.** When documentation and implementation disagree, or required evidence is absent, the reconciler says so and refuses to mark the work done. This is the single behavior that most distinguishes the product from a documentation generator.

Modes: `--dry-run` (proposal diff only) · `--interactive` · `--apply` (gated by policy).

### 11.3 Handoff generation

Continuation brief: current objective · what changed · test state · decisions introduced or pending · deferred work · next actions · open questions · known-broken areas. Written to `sessions/handoff.md`, retrievable by any agent at session start.

### 11.4 Blast-radius estimation *(addition)*

Before a change: which components, decisions, plans, tests, docs, and trust boundaries are implicated. Serves both the pre-work brief and the tidy risk model.

### 11.5 Concurrency *(addition — not in source concept)*

Parallel agents and worktrees are now normal and will corrupt shared project state if unmanaged.

- Per-session ledgers, merged at reconcile — never concurrent writes to `.project/`
- Advisory leases on plans and ADRs; conflicting concurrent edits surface as explicit conflicts
- Index writes are transactional; readers never block agents
- `steward sessions` lists active sessions and their held leases

---

# RECOVER MODE

## 12. Audit, tidy, recover

### 12.1 `steward audit` — read-only diagnosis

Changes nothing. Itemized findings across five domains: Architecture · Decisions · Plans · Documentation · Repository.

Full detector catalog in §20, with per-detector precision expectations. Every finding carries: evidence list · confidence band · potential impact · recommended action · reversibility · required approval level.

**On the composite health score:** the source concept proposed `61/100`. I recommend it be off by default and opt-in via `--score`. Composite scores shift the conversation from "is this finding correct" to "is the number fair," and they get gamed once anyone is measured on them. Itemized findings are the value. *This is a recommendation, not a hard requirement — if the score is a demo/adoption necessity, ship it opt-in with the weighting fully published.*

### 12.1.1 Baseline ratcheting *(addition — adoption-critical)*

The first audit on a legacy repo returns hundreds of findings and the team abandons the tool. This is the dominant failure mode for every static-analysis product and it is entirely avoidable.

```
steward audit --accept-baseline
  → 214 findings recorded as baseline at 71ac09e
  → gate now enforces: no NEW findings
  → backlog burned down voluntarily, or by category
```

- Baseline is committed and reviewable
- `check` (§13.2) gates only drift introduced *after* the baseline
- Backlog is addressable by category, severity, or path — never all-or-nothing
- Baseline age is itself reported, so it can't quietly become permanent amnesty

This is how linting got into legacy codebases. Without it, the audit is a one-time curiosity run.

### 12.1.2 Determinism boundary *(addition)*

Detectors are split into two classes, labeled differently in all output:

| Class | Guarantee |
|---|---|
| **Deterministic** — path resolution, git correlation, manifest diffing, reachability | Same commit + same config + same version → **byte-identical findings** |
| **Model-assisted** — contradiction detection, semantic duplication, decision detection | Best-effort; may vary; always labeled |

A finding a user cannot reproduce is a finding they will not act on. Deterministic findings may gate CI by default; model-assisted findings are advisory unless explicitly promoted in policy.

### 12.1.3 Explain-the-finding

Every finding is interrogable: `steward explain finding <id>` shows the detector, the exact query or scan performed, the files examined, the evidence found, why that confidence band, and what would change the verdict. A finding whose reasoning is opaque gets ignored — and should be.

### 12.1.4 Governance coverage *(addition)*

Findings only describe the parts of the system you already document. Coverage describes the parts you don't.

```
Governed surface
  19 ADRs govern ~6% of components (14 of 231)
  Undocumented components with cross-service dependencies: 31
  Components handling authentication with no governing decision: 4
  Plans reference 12% of active source paths
```

"Twenty-seven findings inside the 6% you already documented" is far less actionable than knowing the 94% is unexamined. Coverage is the metric that reframes audit from nitpicking to risk.

### 12.1.5 Waivers with reason and expiry

Suppression is necessary; permanent blanket suppression rots. Waivers require a stated reason, an owner, and an expiry date. Expired waivers resurface. Waiver files are committed and reviewable, and `audit` reports waiver count and age as its own signal — a repo with 80 expired waivers is telling you something.

### 12.1.6 External evidence sources *(addition)*

Decisions overwhelmingly live in pull-request discussion and issue trackers, not commit messages. A repo-only tool reconstructs decisions from the weakest available signal.

Optional, opt-in adapters for PR discussion, review comments, and linked issues materially improve: retrospective ADR quality, decision-detection precision, and the reconstruction of *alternatives considered* — which is the field a code-only reconstruction can almost never fill.

**Caveats:** requires host adapters (vendor surfaces, §19 risk applies), carries the same data-sensitivity constraints as §14.4, and must degrade cleanly when unavailable (§25.1). But it is the difference between a retrospective ADR that's useful and one that's a shrug — and it's hard for a pure-repo competitor to match.

### 12.2 `steward tidy` — proposed remediation

Never rewrites immediately. Produces three categories:

```
SAFE AUTOMATIC              REVIEW REQUIRED              HUMAN DECISION
──────────────────────      ────────────────────────     ──────────────────────
consolidate duplicate       mark ADR-0007 superseded     is legacy SAML support
  setup instructions        create retrospective ADR       still intentional?
update stale file refs      merge conflicting deploy     canonical term: account,
archive completed plans       guides                       tenant, or organization?
regenerate doc indexes      remove suspected dead        resume abandoned
normalize internal links      payment adapter              migration plan?
```

Modes: `--plan-only` · `--interactive` · `--apply-safe`

### 12.3 Tidy submodes

| Submode | Detects |
|---|---|
| `tidy docs` | Stale instructions · broken links · duplicate explanations · conflicting statements · docs with no code · code with no docs · unreferenced ADRs/plans · hand-edited generated files |
| `tidy architecture` | Discovered vs. documented architecture divergence (§12.4) |
| `tidy decisions` | Architectural changes without ADRs · ADRs contradicted by code · implicitly superseded decisions · duplicate ADRs · unresolved proposals · ADRs missing consequences or rollback |
| `tidy plans` | Classifies: active · completed · abandoned · blocked · superseded · indeterminate — correlated against commits, PRs, changed files, and tests, **not checkboxes** |
| `tidy code` | Dead code · duplicate implementations · abandoned feature flags · unused dependencies · obsolete compatibility paths · inconsistent interfaces · mixed-responsibility modules · contextless TODOs · tests for removed behavior · missing tests for critical behavior |

`tidy code` defaults to proposals only, permanently. It produces a cleanup plan, never an autonomous repo-wide refactor.

### 12.4 Architecture reconstruction

Discovers current architecture from: source and imports · API definitions · infrastructure manifests · container definitions · database schemas · event topics · CI/CD configuration · runtime configuration. Diffs discovered against documented.

**Honest note:** this is the largest single engineering surface in the product and the least likely to work uniformly across polyglot repos. Recommend building it as a **per-source-adapter framework** where each source (imports, k8s manifests, OpenAPI, SQL schema, event config) is an independent, independently-testable extractor with its own confidence rating — rather than one monolithic reconstructor. Ship extractors as they reach precision targets; report partial coverage explicitly rather than implying completeness.

### 12.5 `steward recover` — off-track diagnosis

Answers five questions: intended objective · what was actually implemented · where implementation diverged · which assumptions or blockers caused it · smallest credible route back to coherence.

```
Original objective
  Replace service-local authorization with centralized policy decisions.
Current state
  4 services use the policy service.
  2 services still use local role checks.
  The batch processor bypasses both.
  Documentation claims migration is complete.
Likely divergence
  Migration stopped after synchronous APIs were converted.
  Background processing was never in the original plan.
Recovery options
  A. Complete centralization        effort: M  risk: M  recommended: yes
  B. Formalize the hybrid           effort: L  risk: H  recommended: no
  C. Roll back centralization       effort: H  risk: H  recommended: no
```

This is materially better than generic technical-debt detection because it reconstructs **intent vs. reality**, which requires the graph.

### 12.6 Safety model and receipts

```
Inspect → Classify → Collect evidence → Propose → Estimate blast radius
   → Apply selected → Test and validate → Reconcile docs → Receipt
```

Every mutating operation runs in an isolated git worktree/branch. Nothing lands on the main branch.

```yaml
cleanup:
  id: tidy-2026-08-05-01
  baseline_commit: 71ac09e
  worktree: .steward/worktrees/tidy-20260805
  findings: 27
  applied: {automatic: 12, reviewed: 6}
  deferred: 7
  rejected: 2
  tests: {passed: 186, failed: 0}
  documentation: {updated: 9, archived: 4}
  decisions: {retrospective_created: 2, superseded: 1}
  rollback: git branch -D steward/tidy-20260805
```

Receipts are committed to `.project/receipts/`. They make the agent's work auditable after the fact — which is what makes teams willing to let it write at all.

### 12.7 Retrospective records

Decisions discovered after the fact are never presented as if they were deliberate at the time:

```markdown
# ADR-0018: Centralize authorization in the policy service
Status: Accepted — Retrospectively documented
## Evidence
Introduced across commits 8f218c4 … d19a027.
## Reconstructed context
Earlier services performed local authorization. Implementation now routes
authorization decisions through the policy service.
## Confidence
Medium
## Unresolved questions
- Was fail-closed behavior intentionally designed?
- Is local authorization still supported for offline deployments?
```

The `## Unresolved questions` section is **mandatory** and may not be empty on a retrospective record. Provenance lives in the document, not only the index, so downstream agents can weight inferred decisions differently from human-authored ones.

---

# ADDITIONS BEYOND THE SOURCE CONCEPT

## 13. Governance and CI

### 13.1 Documentation policy engine

The judgment layer must be configuration, not code. `policy.yaml` defines: plan thresholds · ADR triggers · required evidence classes by change type · approval levels · protected paths · which detectors run · drift budget.

```yaml
adr_required_when:
  - touches: [auth/**, crypto/**]
  - adds_or_removes_dependency: true
  - crosses_components: 2
plan_required_when:
  - files_changed_above: 8
  - reversibility: hard
evidence_required:
  security_sensitive: [unit_test, failure_mode_test, integration_test]
approval:
  retrospective_adr: human
  tidy_code: human
drift_budget:
  high_confidence_findings_max: 0
  medium_confidence_findings_max: 15
```

Why this matters: without it, every disagreement with the product's judgment is a bug report or a fork. With it, disagreement is a config change. It is also the artifact that makes the product legible to a platform team evaluating standardization.

### 13.2 `steward check` — CI gate

Runs in CI on a PR. Emits machine-readable findings and, where supported, inline PR annotations. Fails the build when policy is violated: an ADR-requiring change landed without one, a completion claim lacks required evidence, drift budget exceeded, a constraint was violated.

This is the strongest candidate for the commercial layer (§21) and the mechanism that converts the product from an individual tool into a team standard.

### 13.3 Drift trend

Drift measured per-commit and tracked over time. A single audit is a snapshot; the derivative is the management-legible signal. "Is this project converging or diverging" is a question no existing tool answers.

---

## 14. Project intelligence

### 14.1 Assumption register *(addition)*

Assumptions are first-class entities with: statement · origin (which plan/ADR/session) · validation status (unvalidated · validated · invalidated) · validation method · review date.

Surfaces: "3 assumptions underpin ADR-0007; none have ever been validated." Unvalidated assumptions are the highest-yield, lowest-cost risk signal in most projects and nothing currently tracks them.

### 14.2 Decision expiry and review *(addition)*

Decisions carry optional review triggers: elapsed time, dependency version change, scale threshold crossed, or a superseding decision landing. Surfaces stale-by-context decisions rather than only code-contradicted ones. Prevents the ADR corpus from becoming a graveyard.

### 14.3 Time-travel queries *(addition)*

Git is already the substrate; the index just needs to be reconstructible at any commit. Enables: "what did we believe about auth in March," "which decision was in force when this bug was introduced," "show me the project state at the release tag." Directly serves incident review and post-mortems — an adjacent use case with real budget attached.

### 14.4 Retrieval feedback loop *(addition — the actual moat)*

For every context packet: what was supplied, what the agent actually read/edited, what it touched that wasn't supplied, and whether the task succeeded. That dataset improves relevance ranking over time and is not reproducible by a competitor who starts later. **Must be local-first with explicit opt-in for any aggregation** — this data is the user's codebase behavior and mishandling it kills adoption.

### 14.5 Agent conformance tracking *(addition)*

Per-agent: completion claims made, claims rejected at reconciliation, evidence quality, plan adherence, decision disclosure rate. Two uses: help a team choose agents empirically, and detect when a specific agent+task combination is unreliable. Framed as observability, not vendor comparison marketing.

### 14.6 Incident linkage *(addition)*

Connect incidents backward to the decision, constraint violation, or unvalidated assumption that enabled them.

```
INC-2026-0412  Authorization bypass in batch processing
  enabled_by:  ADR-0007 scope excluded background processing
  assumption:  "all authorization paths are synchronous" — never validated
  detected_by: audit finding #A-118, raised 63 days before the incident
  status:      finding was open and unwaived at time of incident
```

Two reasons this matters more than it looks. It closes the assumption-register loop with real consequences, which is what makes engineers actually maintain the register. And it produces the single most persuasive artifact the graph can generate — the one that attaches budget, because it converts "documentation drift" from a hygiene complaint into a traceable cause.

Requires only that incidents can be referenced by ID and date; the linkage is derived from the existing graph.

### 14.7 `steward explain` and `steward why`

`explain <path>` — which decisions, plans, constraints, and trust boundaries govern this file.
`why <path>:<line>` — decision-level blame: not who changed it, but which decision it exists to satisfy, with citations.

---

## 15. Trust boundary and classification overlay *(addition)*

Most drift that actually hurts is security and data-handling drift, and it is the drift least visible in a diff.

- Trust boundaries as first-class graph entities: where does untrusted input cross into trusted execution, and which decision governs each crossing
- Data classification tags on components and flows; detect classified data reaching an unclassified path
- Constraint enforcement: fail-closed requirements, token persistence prohibitions, encryption-at-rest boundaries — expressed as constraints, checked in CI
- ADR-to-control mapping (optional module): map decisions to a control framework so the ADR corpus does double duty as evidence

**Feasibility caveat:** full taint/dataflow analysis is a hard research problem and should not be promised. What is tractable is *declared* boundaries with *detected violations of declared invariants* — much narrower, much more reliable, still valuable. Do not let this become a security-scanning product; it is a drift-detection product with a security-aware model.

---

## 16. Multi-repo and system scope *(addition)*

Real systems span repositories; decisions do not respect repo boundaries.

- Stable entity identity across repos — **this is a data model decision that must be made before the first ADR is written, not retrofitted**
- Federated index: per-repo SQLite plus an optional aggregate
- Cross-repo queries: which services violate ADR-0007; which repos implement a deprecated contract
- Contract drift: API/event schema divergence between producer and consumer repos

This is where a graph backend earns its complexity and where the team/enterprise value concentrates.

---

## 17. Self-evaluation harness *(addition — non-negotiable)*

The product's entire claim is accuracy. Accuracy that isn't measured regresses silently.

- **Golden corpus:** curated repos with hand-labeled ground truth for each detector
- **Decision-detection labeling set:** ~200 hand-labeled commits across ~10 repos, with a naive-heuristic baseline (crosses >2 module boundaries · adds/removes dependency · touches auth/data/infra). If the sophisticated approach doesn't beat the baseline, ship the baseline and drop the moat framing — this is a real possible outcome and should be discovered early, not late
- **Packet benchmark:** hand-labeled must-include sets; measure recall and size
- **Regression gate in the product's own CI:** any detector precision drop blocks release
- Published methodology. A tool that tells you your project is drifting must be able to show its own error rate.

---

## 18. Build sequence (evidence-gated, not time-boxed)

```
S0  FOUNDATION ─────────────────────────────────────────────
    init · doctor · index · rebuild · storage layout
    graph interface abstraction · policy engine skeleton
    GATE: index fully rebuildable from repo alone

S1  READ-ONLY VALUE ────────────────────────────────────────
    audit (deterministic detectors) · explain · status
    baseline ratcheting · waivers · explain-the-finding
    governance coverage · degraded-mode contract
    evaluation harness + golden corpus
    GATE: zero false positives in high-confidence tier on corpus
    GATE: deterministic detectors byte-reproducible across runs
    GATE: no run path can report "clean" with unknown coverage

S2  CONTEXT ────────────────────────────────────────────────
    MCP server · packet compilation · execution brief
    retrieval feedback capture
    GATE: packet recall target met on labeled benchmark

S3  CONTINUITY ─────────────────────────────────────────────
    session ledger · handoff · reconcile --dry-run
    second agent adapter
    GATE: cross-agent handoff succeeds on a repo the demo author didn't write

S4  JUDGMENT ───────────────────────────────────────────────
    intent classifier · plan threshold · proposed-ADR flow
    decision detection (or heuristic fallback)
    GATE: decision-detection labeling study complete; result determines
          whether this ships as a moat or a heuristic

S5  WRITE PATH ─────────────────────────────────────────────
    worktree isolation · receipts · tidy --plan-only
    section-level authorship boundaries · redaction policy
    → tidy --apply-safe · reconcile --apply
    GATE: accepted-change ratio above threshold in dry-run cohort
          (trust is earned in sequence; this gate is empirical, not technical)
    GATE: authorship-boundary hashing shipped — no path can rewrite
          a human-edited region
    GATE: prompt/ledger redaction policy shipped and default-on

S6  REPAIR ─────────────────────────────────────────────────
    recover · tidy decisions/plans/docs · retrospective ADRs
    architecture extractors (per-source, shipped individually)

S7  GOVERNANCE ─────────────────────────────────────────────
    check (CI) · drift budget · drift trend · policy tuning

S8  INTELLIGENCE ───────────────────────────────────────────
    assumption register · decision expiry · time-travel
    agent conformance · retrieval ranking improvement

S9  SCALE ──────────────────────────────────────────────────
    multi-repo · graph backend · classification overlay
    additional agent adapters
```

**What is actually sequential and why:** S1 before S5 is a trust ordering, not an engineering one — the write path can be built at any time, but shipping it before read-only credibility exists is the failure mode that kills this category of tool. S4's gate is a measurement that takes calendar time to run regardless of implementation speed. Everything else can compress substantially with agent-assisted implementation.

---

## 19. Integration strategy

| Mechanism | Role | Stability |
|---|---|---|
| **MCP server** | Primary. Context retrieval, explain, status, handoff, reconcile | Best available cross-vendor contract |
| **Instruction adapters** | Tell each agent to call the steward | Vendor-controlled conventions; expect churn |
| **CLI wrapper** (`steward run <agent>`) | Fullest observation for agents with weak hook support | Brittle; fallback |
| **Native hooks** | Best UX where available | Vendor-internal; assume breakage |

Targets: Claude Code and Codex first (enough to prove the cross-agent seam), then Cursor, Copilot, Gemini.

> **Must verify at build time:** current MCP specification and version, each agent's MCP support level, hook event names, instruction-file conventions, and config paths. I have deliberately named none of these — my information is likely stale and wrong syntax in a PRD becomes wrong syntax in an implementation.

**Structural risk, stated plainly:** you are building on surfaces owned by vendors who are themselves expanding into project memory. Adapter maintenance is a permanent fixed cost, not an exception, and any single vendor can absorb the single-agent case. The durable position is the cross-vendor seam plus the accumulated graph — neither of which a single vendor is incentivized to build.

---

## 20. Detector catalog

| Detector | Method | Precision | Ship gate |
|---|---|---|---|
| Doc references nonexistent path | Path resolution | Very high | S1 |
| Broken internal link | Link resolution | Very high | S1 |
| ADR references deleted/renamed file | Path resolution + rename detection | High | S1 |
| Plan active, no related commits in N days | Git log vs. plan paths | High | S1 |
| Completed work still marked in progress | Task↔change correlation | High | S1 |
| README/CLI command mismatch | Command manifest comparison | Medium | S1, where manifest exists |
| Plan task checked, no corresponding change | Task↔evidence correlation | Medium | S1 |
| Duplicate setup instructions | Semantic similarity across docs | Medium | S6 |
| Conflicting statements across docs | Contradiction detection | Medium-low | S6, opt-in |
| Glossary term with competing synonyms | Identifier scan vs. glossary | Medium | S6, opt-in |
| Documented component no longer exists | Extractor vs. architecture.md | High | S6 per extractor |
| Undocumented component exists | Extractor vs. architecture.md | Medium | S6 per extractor |
| Architectural change without ADR | §17 study result | **Unknown** | S4, gated |
| ADR contradicted by implementation | Constraint check vs. code | Medium | S6 |
| Implicitly superseded ADR | Decision graph analysis | Medium | S6 |
| Unused dependency | Manifest vs. import graph | High (static langs) | S6 |
| Dead code | Reachability analysis | **Language-dependent** | S6, static langs only |
| Abandoned feature flag | Flag reference + config scan | Medium | S6 |
| Test for removed behavior | Test↔symbol resolution | Medium | S6 |
| Missing test for critical path | Coverage vs. constraint-tagged paths | Medium | S6 |

**Reachability caveat:** reflection, DI containers, string dispatch, decorators, plugin registries, and dynamic imports defeat static reachability. Precision is materially higher in statically-typed, statically-linked languages than in Python or JavaScript. Suppress low-precision detectors in dynamic languages rather than emitting hedged findings — a hedged wrong finding still costs the user an investigation.

---

## 21. Provenance and confidence

Every emitted or stored claim carries `source` · `confidence` (ordinal band) · `evidence` (concrete artifacts) · `reversibility` · `required approval`.

**Ordinal bands, not percentages.** The source concept's `Confidence: 84%` implies calibration the underlying evidence cannot support; the first user whose reflectively-loaded class gets flagged at 84% writes the blog post. Bands are defensible under scrutiny; decimals are not. If a numeric score is needed for UI ranking, keep it internal and never display it.

The system must always distinguish **"I cannot find a use"** from **"this is unused."**

### 21.1 Belief revision, not overwrite

When new evidence contradicts a stored claim, the claim is **superseded, not replaced**. The graph records the transition: what was believed, at which baseline, what contradicted it, and when.

```
Claim: "Authorization is centralized in the policy service"
  believed_from: 8f218c4   confidence: high    source: agent-observed
  contradicted_at: d19a027 by: batch_processor.go bypasses policy client
  status: superseded_by claim#4471
```

Post-mortems and incident reviews need the history of what the project *believed*, not only what it currently believes. Overwriting destroys the most valuable artifact the graph produces.

### 21.2 Confidence decay

Confidence is anchored to a baseline commit and **degrades as that baseline recedes** and as the files underpinning it change. Staleness is a property of *claims*, not of documents.

Decay inputs: commits elapsed since baseline · churn in the evidence files · whether governing decisions changed · whether the extractor that produced it has since been revised. A claim whose confidence decays below a policy threshold is surfaced for re-derivation rather than silently trusted.

### 21.3 Section-level authorship boundaries

Documents are rarely wholly human or wholly generated. Every generated region carries explicit boundary markers and a content hash of what was generated.

```markdown
<!-- steward:generated id=arch-authz-flow hash=3f2a91c source=extractor:imports -->
...generated content...
<!-- steward:end -->
```

**Hard rule:** if the hash does not match, a human edited it — the region is promoted to human-authored and `tidy` will never rewrite it, only flag divergence. Clobbering a paragraph someone wrote carefully is the single fastest way to lose a user permanently, and this is cheap insurance against it.

### 21.4 Negative provenance

"No ADR governs this file" is only meaningful if the search was competent. Absence claims record what was searched, with what index version, and what was not covered.

```
finding: no governing decision for payments/refund_engine.go
searched: decisions/ (19 ADRs), knowledge/constraints.md
not_covered: PR discussion, issue tracker, ADRs older than index rebuild
interpretation: absence of record — NOT evidence of absence of decision
```

This distinction is the difference between a useful gap report and a misleading one.

### 21.5 Evidence chain of custody

A passing test is not evidence unless it exercised the claimed path. Every evidence record carries: commit · environment · command · result · **and whether the claimed code path was actually executed**.

Green tests that touch none of the changed code are the most common form of false evidence in agent workflows, and a reconciler that accepts them is worse than no reconciler — it launders unverified work as verified. Path-coverage correlation is required for any evidence class marked `test`; where coverage data is unavailable, the evidence is downgraded and labeled `unverified-coverage`.

### 21.6 Model provenance and re-derivation

Every inferred claim records the model identity and version that produced it, plus the prompt/extractor version. Two uses: re-derive low-confidence claims when a better model is available, and **measure whether accuracy actually improved** rather than assuming it did.

### 21.7 Invariant: no self-citation

**The steward's own generated output is never weighted as independent evidence for a later inference.**

If a generated ADR feeds a later confidence calculation without a provenance discount, the system begins citing itself and confidence inflates on nothing. This is a hard invariant enforced in the data model — inference edges must discount or exclude any evidence whose `source` is `inferred`, transitively. Any query path that can produce a confidence increase from steward-generated content alone is a bug, and the self-evaluation harness (§17) must include a test for it.

---

## 22. Metrics

**Quality (gates releases):** detector precision by tier on golden corpus · packet recall on labeled benchmark · cross-agent handoff success rate · decision-detection F1 vs. naive baseline

**Trust (the real signal):** proposed changes accepted vs. rejected · completion claims rejected that were correctly rejected · repos where `audit` ran more than once · deterministic-finding reproduction rate (target: 100%) · human-edited regions clobbered (target: 0, hard failure)

**Coverage:** governed surface percentage · components with no governing decision · unvalidated assumption count and age · waiver count and expiry age · baseline age

**Adoption:** repos initialized · sessions where the agent invoked a context tool unprompted · `check` adopted in CI · multi-agent repos

**Anti-metrics — investigate if rising:** volume of documentation generated · findings per audit trending up while acceptance ratio trends down · time between audit run and any user action

---

## 23. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Decision detection may not beat a naive heuristic — the moat claim has no specified mechanism | Critical | §17 labeling study early; heuristic fallback is an acceptable product, just different positioning |
| R2 | Static analysis precision varies sharply by language | High | Declare supported languages; suppress rather than hedge |
| R3 | Platform vendors absorb the single-agent case | High | Compete on the cross-vendor seam and accumulated graph |
| R4 | Confidently wrong generated record poisons future agent sessions — worse than no documentation | High | Provenance in documents · mandatory unresolved-questions on retrospectives · dry-run first |
| R5 | Adapter breakage as vendors change surfaces | High | MCP-first; budget adapter maintenance as fixed cost |
| R6 | Architecture reconstruction underdelivers across polyglot repos | High | Per-source extractors with individual precision gates; report partial coverage honestly |
| R7 | Retrieval feedback data is sensitive codebase behavior | High | Local-first, explicit opt-in for any aggregation |
| R8 | Competitive landscape assumptions already stale (Spec Kit, agent rules systems, ADR tooling) | Medium | Re-verify before external positioning; do not publish the market-gap claim uncheck |
| R9 | Product becomes documentation spam — the exact thing it exists to prevent | Medium | Silence-is-valid principle · policy engine thresholds · anti-metrics |
| R10 | Concurrent agents corrupt project state | Medium | §11.5 leases and per-session ledgers, designed in from S0 |
| R11 | **First-run finding avalanche kills adoption on legacy repos** | High | §12.1.1 baseline ratcheting — must ship with `audit`, not after |
| R12 | Confidence inflation via self-citation — system cites its own generated records | High | §21.7 hard invariant + harness test |
| R13 | Tidy overwrites human-authored prose | High | §21.3 section-level authorship boundaries with content hashes |
| R14 | Degraded run reports "clean" and is believed | High | §25.1 — cleanliness unavailable when coverage is unknown |
| R15 | Captured prompts commit secrets or customer data to the repo | High | §25.2 redaction policy required before any write path ships |
| R16 | Green tests accepted as evidence for code they never executed | Medium | §21.5 path-coverage correlation; downgrade when unavailable |

---

## 24. Commercial model — needs a decision

Neither source document addresses this, and it shapes the data model *now*.

| Layer | Candidate | Shapes |
|---|---|---|
| OSS core | CLI, MCP server, audit, context, reconcile, local index | Everything |
| Team | `check` in CI, shared index, drift trend, policy distribution | Entity identity across repos and machines |
| Enterprise | Multi-repo graph, classification overlay, control mapping, conformance reporting | Graph backend, auth model |

The specific decision that cannot be deferred: **does entity identity need to be stable across repositories and machines?** If yes, it must be designed now. Retrofitting stable identity onto a per-repo SQLite schema is a rewrite.

---

## 25. Operational contracts

### 25.1 Degraded-mode behavior *(required — undefined degradation is where tools produce confident garbage)*

Every capability must declare its behavior when inputs are missing. The rule: **degrade to a labeled lower-confidence result or refuse — never silently produce a full-confidence result from partial data.**

| Condition | Required behavior |
|---|---|
| Shallow clone (CI default) | Git-correlation detectors disabled and reported as disabled, not silently skipped |
| No test suite / no coverage data | Evidence downgraded to `unverified-coverage`; completion claims cannot reach `verified` |
| Monorepo above size threshold | Scope-limited by path; report the scoped boundary in every finding |
| No git history (vendored, squashed) | Retrospective ADRs disabled; audit runs static detectors only |
| Index older than N commits | Findings labeled stale; `check` fails rather than reporting clean |
| Extractor unavailable for a language | Architecture coverage reported as partial with the gap named |
| External adapter (§12.1.6) unavailable | Absence claims explicitly note the uncovered source (§21.4) |

A "clean" result from a degraded run is the most dangerous output the product can produce. Cleanliness must be unavailable when coverage is unknown.

### 25.2 Prompt and content redaction

Originating prompts, session ledgers, and handoff briefs may contain secrets, credentials, customer data, or personal information — and this design commits them to the repository.

Required before any write path ships:
- Secret detection on all captured prompt and ledger content, with redaction placeholders that preserve structure
- Configurable capture policy: full prompt · summary only · classification only · none
- `.project/` content treated as committed-and-public by default in the threat model; anything sensitive belongs in the gitignored `.steward/` cache or nowhere
- Explicit documentation that session capture is on, and how to turn it off

This is a policy that must exist before the first incident, not after.

### 25.3 Interoperability

Findings should export into tooling teams already run rather than requiring a new UI.

- **SARIF export** for findings, to land in existing code-scanning interfaces
- JSON for everything, as the primary contract; human-readable output is a rendering of it
- Signed attestation for receipts is worth evaluating if the compliance path (§15) is pursued — **SLSA / in-toto** are the relevant reference points

> **Unverified:** I believe SARIF is the correct findings-interop format and that SLSA/in-toto are the right attestation references, but I am working from general familiarity rather than a checked specification. Verify both against current specs before designing against them.

---

## 26. Open questions

1. Commercial model and, specifically, cross-repo entity identity (§24) — blocks data model finalization
2. Primary language for first-class static analysis — determines R2 severity and demo quality
3. Is `architecture.md` generated, or validated-only, at first ship?
4. Health score: cut, or opt-in with published weighting?
5. Human approval defaults: which operations require explicit sign-off out of the box?
6. License and OSS governance model
7. Does the classification overlay (§15) belong in core, or is it an adjacent product with a different buyer?
