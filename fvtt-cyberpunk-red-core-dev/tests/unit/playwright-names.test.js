import { describe, expect, it } from "vitest";

import { uniqueName } from "../../tools/playwright/ui/names.mjs";

describe("playwright uniqueName", () => {
  it("accepts an explicit token for stable names", () => {
    expect(uniqueName("char", "seed-token")).toBe("E2E char seed-token");
  });

  it("generates readable names with a collision-resistant token", () => {
    const name = uniqueName("gear");

    expect(name).toMatch(/^E2E gear [0-9a-z]+-[0-9a-f]{12}$/);
  });

  it("returns different generated names across calls", () => {
    expect(uniqueName("scope")).not.toBe(uniqueName("scope"));
  });
});
