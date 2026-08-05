import { createHash } from "node:crypto";

export function stableHash(input: unknown): string {
  const serialized =
    typeof input === "string" ? input : JSON.stringify(sortObject(input));
  return createHash("sha256").update(serialized).digest("hex");
}

export function findingId(fingerprint: string): string {
  return `STW-${fingerprint.slice(0, 10).toUpperCase()}`;
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortObject(nested)])
    );
  }

  return value;
}
