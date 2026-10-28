import { randomUUID } from "node:crypto";

function createNameToken() {
  const timeToken = Date.now().toString(36);
  const randomToken = randomUUID().replace(/-/g, "").slice(0, 12);
  return `${timeToken}-${randomToken}`;
}

// Unique, human-readable names keep specs isolated without world resets.
export function uniqueName(prefix, token = createNameToken()) {
  return `E2E ${prefix} ${token}`;
}
