import path from "node:path";

const ADR_FILE_PATTERN = /^ADR-\d{4}-.+\.md$/;

export function isAdrPath(relativePath: string): boolean {
  return ADR_FILE_PATTERN.test(path.basename(relativePath));
}
