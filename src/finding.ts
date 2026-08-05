import { findingId, stableHash } from "./hash.js";
import type { Finding } from "./types.js";

type FindingInput = Omit<Finding, "id" | "fingerprint" | "status">;

export function createFinding(input: FindingInput): Finding {
  const fingerprint = stableHash({
    detectorId: input.detectorId,
    title: input.title,
    location: input.location,
    message: input.message,
    evidence: input.evidence
  });

  return {
    ...input,
    fingerprint,
    id: findingId(fingerprint),
    status: "new"
  };
}
