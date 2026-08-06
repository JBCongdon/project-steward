<!-- This file was created by Kairn. Human edits are welcome. -->

# Security

- Treat `.project/` as committed and potentially public.
- Do not store secrets, credentials, customer data, or sensitive prompts in project records.
- Passive prompt/session capture is not implemented. Redaction policy must ship before any future automatic capture persists agent session content.
- `.kairn/` is gitignored and may contain local index, session ledger, and retrieval feedback state.
