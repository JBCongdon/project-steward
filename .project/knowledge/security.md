<!-- This file was created by Project Steward. Human edits are welcome. -->

# Security

- Treat `.project/` as committed and potentially public.
- Do not store secrets, credentials, customer data, or sensitive prompts in project records.
- Prompt/session capture is not implemented. Redaction policy must ship before any future write path persists agent session content.
- `.steward/` is gitignored and intended for rebuildable local cache state.
