<!-- This file was created by Project Steward. Human edits are welcome. -->

# Glossary

| Term | Meaning |
|---|---|
| Project record | Human-readable committed file under `.project/` |
| Steward index | Rebuildable local cache under `.steward/` |
| Finding | Evidence-backed statement that project state has drifted or coverage is missing |
| Baseline | Accepted set of existing findings used to gate only new drift |
| Baseline age | Number of days since the current audit baseline was accepted |
| Waiver | Time-limited suppression with owner, reason, and expiry |
| Waiver prune | Explicit removal of expired waivers from `.project/waivers.json` |
| Detector | Read-only scanner that emits findings |
| Degraded run | Run with missing inputs or disabled coverage that cannot claim full cleanliness |
| Policy configuration | `.project/policy.yaml`, which controls detectors, drift budgets, and thresholds |
| ADR quality | Deterministic check that decision records include required state and review sections |
| Plan lifecycle state | The relationship between a plan file's Status field and its active/completed/abandoned directory |
