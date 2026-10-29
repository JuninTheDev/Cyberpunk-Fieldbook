import { describe, expect, it } from "vitest";

import { parseServeArgs } from "../../tools/playwright/bin/serve-args.mjs";

describe("playwright:serve args", () => {
  it("defaults to fresh mode", () => {
    expect(parseServeArgs([])).toEqual({ mode: "fresh", force: false });
  });

  it("accepts an existing world id", () => {
    expect(parseServeArgs(["--world", "night-city"])).toEqual({
      mode: "world",
      world: "night-city",
      force: false,
    });
  });

  it("accepts an archive path", () => {
    expect(parseServeArgs(["--archive", "world.zip"])).toEqual({
      mode: "archive",
      archive: "world.zip",
      force: false,
    });
  });

  it("accepts --force with --archive", () => {
    expect(parseServeArgs(["--archive", "world.zip", "--force"])).toEqual({
      mode: "archive",
      archive: "world.zip",
      force: true,
    });
  });

  it("rejects mutually exclusive modes", () => {
    expect(() =>
      parseServeArgs(["--world", "a", "--archive", "b.zip"]),
    ).toThrow(/mutually exclusive/);
  });

  it("rejects missing, unknown, and invalid --force usage", () => {
    expect(() => parseServeArgs(["--world"])).toThrow(/Missing value/);
    expect(() => parseServeArgs(["--wat"])).toThrow(/Unknown argument/);
    expect(() => parseServeArgs(["--force"])).toThrow(
      /only be used with --archive/,
    );
    expect(() => parseServeArgs(["--world", "night-city", "--force"])).toThrow(
      /only be used with --archive/,
    );
  });
});
