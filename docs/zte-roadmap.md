# ZTE Roadmap: Zero Touch Engineering

A phased plan to move from human-in-the-loop to fully autonomous pipeline execution. Each phase builds trust through evidence before removing the human from a specific part of the loop.

## Principle

```
Z1: "I can trust the tests"
Z2: "I know what the agent misses"
Z3: "The agent no longer misses those things"
Z4: "If it's wrong, I can undo it"
Z5: "It's right often enough for simple work"
Z6: "It's right often enough for all work"
```

Each phase is gated by the previous one -- you don't move forward until you have the evidence.

---

## Z1: Validation Floor

**Goal:** Make the test gate trustworthy so you can actually rely on it.

**Issues:**
- Add meaningful unit tests across API and dashboard (coverage threshold >= 70%)
- Add e2e tests (Cypress/Playwright) -- dashboard loads, signal table renders, CRUD works
- Wire coverage + e2e into the `/test` command so the pipeline enforces them

**Exit criteria:** When the pipeline says "tests passed," you believe it.

---

## Z2: Calibration (10 Attended Runs)

**Goal:** Run the product roadmap (Phase 2-3 issues) through attended pipeline. Generate data.

**Issues:**
- Run 10 issues through `./scripts/sdlc.sh` with human review on every PR
- Log what the human caught that the agent missed in `app_docs/zte_calibration.md`
- Track KPIs -- streak, plan size, diff size, attempts

**Exit criteria:** You know exactly where the pipeline is weak. Calibration log has 10+ entries with documented deltas.

---

## Z3: Harden Review

**Goal:** Patch the gaps Z2 revealed so the agent reviewer catches what you catch.

**Issues:**
- Add checks for the specific patterns you caught in calibration
- Add architectural boundary enforcement (no cross-app imports, shared types go through libs)
- Add diff sanity checks (flag outsized changes for small issues)
- Add adversarial second review pass

**Exit criteria:** Re-run 5 attended issues. If human catches nothing new, the review gate is solid.

---

## Z4: Safety Net

**Goal:** Make bad merges recoverable so ZTE failures are cheap.

**Issues:**
- Add `scripts/rollback.sh <adw-id>` to revert a ZTE merge
- Add post-merge smoke test (build + test on main, auto-revert on failure)

**Exit criteria:** The cost of a wrong ZTE merge is a quick rollback, not a broken main.

---

## Z5: Graduated ZTE

**Goal:** Remove human from code review for issue types where the pipeline has proven reliable.

**Issues:**
- Define tiers: `trivial` (docs, config, chores), `standard` (single-service CRUD), `complex` (multi-service, new patterns)
- Enable ZTE for trivial tier only
- Weekly spot-check of 1-2 ZTE merges
- Expand tiers as success rate holds >= 95% over 10+ runs

**Exit criteria:** Trivial issues land via ZTE with no regressions for 10 consecutive runs.

---

## Z6: Full ZTE

**Goal:** ZTE is the default. Human reviews only on anomalies.

**Issues:**
- Enable ZTE for all proven tiers
- Auto-escalate to human review on novel patterns (new deps, new file types, large diffs)
- Auto-generate issues from roadmap bullets

**Exit criteria:** You comment `adw_zte` and walk away. Human reviews are the exception, not the rule.

---

## Relationship to Product Roadmap

The ZTE roadmap runs in parallel with the product roadmap (`docs/roadmap.md`). Product issues (Phases 2-10) provide the real work that calibrates and proves the pipeline:

| ZTE Phase | Runs alongside | Why |
|-----------|---------------|-----|
| Z1 | Before Phase 2 | Build the test floor before real features land |
| Z2 | Phase 2-3 | Storage + market data issues are calibration material |
| Z3 | Phase 3-4 | Harden review using calibration data |
| Z4 | Phase 4-5 | Safety net before complex agent work |
| Z5 | Phase 5-7 | Trivial issues go ZTE, complex stay attended |
| Z6 | Phase 8-10 | Full ZTE for the expansion phases |
