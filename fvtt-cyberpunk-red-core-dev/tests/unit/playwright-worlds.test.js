import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import {
  listWorlds,
  resolveWorld,
} from "../../tools/playwright/session/worlds.mjs";

let tempDirs = [];

async function tempDir() {
  const dir = await mkdtemp(path.join(tmpdir(), "cpr-worlds-test-"));
  tempDirs.push(dir);
  return dir;
}

function writeWorld(dataPath, folder, world) {
  fs.outputJSONSync(
    path.join(dataPath, "Data/worlds", folder, "world.json"),
    world,
  );
}

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs = [];
});

describe("world helpers", () => {
  it("lists only Cyberpunk RED worlds", async () => {
    const dataPath = await tempDir();
    writeWorld(dataPath, "cpr", {
      id: "cpr",
      title: "Night City",
      system: "cyberpunk-red-core",
    });
    writeWorld(dataPath, "other", {
      id: "other",
      title: "Other",
      system: "dnd5e",
    });

    expect(listWorlds(dataPath)).toEqual([
      expect.objectContaining({ id: "cpr", title: "Night City" }),
    ]);
  });

  it("resolves by id or folder and reports available worlds", async () => {
    const dataPath = await tempDir();
    writeWorld(dataPath, "folder", {
      id: "world-id",
      title: "Named World",
      system: "cyberpunk-red-core",
    });

    expect(resolveWorld(dataPath, "world-id").folder).toBe("folder");
    expect(resolveWorld(dataPath, "folder").id).toBe("world-id");
    expect(() => resolveWorld(dataPath, "missing")).toThrow(
      /world-id.*Named World/s,
    );
  });
});
