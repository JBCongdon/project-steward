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
| Detector | Read-only scanner that emits findings |
| Degraded run | Run with missing inputs or disabled coverage that cannot claim full cleanliness |
| ADR quality | Deterministic check that decision records include required state and review sections |
