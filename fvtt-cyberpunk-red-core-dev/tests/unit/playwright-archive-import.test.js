import AdmZip from "adm-zip";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

const TEST_TMP_ROOT = path.resolve(".playwright", "tmp");

import { importWorldArchive } from "../../tools/playwright/session/archive-import.mjs";

let tempDirs = [];

async function tempDir() {
  fs.ensureDirSync(TEST_TMP_ROOT);
  const dir = await mkdtemp(path.join(TEST_TMP_ROOT, "cpr-archive-test-"));
  tempDirs.push(dir);
  return dir;
}

function writeZip(zipPath, entries) {
  const zip = new AdmZip();
  for (const [entryName, content] of Object.entries(entries)) {
    zip.addFile(entryName, Buffer.from(content));
  }
  zip.writeZip(zipPath);
}

function writeUnsafeZip(zipPath) {
  const zip = new AdmZip();
  zip.addFile("world.json", Buffer.from(worldJson("unsafe")));
  zip.getEntries()[0].entryName = "../world.json";
  zip.writeZip(zipPath);
}

function worldJson(id, extra = {}) {
  return JSON.stringify({
    id,
    title: id,
    system: "cyberpunk-red-core",
    ...extra,
  });
}

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs = [];
});

describe("world archive import", () => {
  it("imports a root-level world.json archive", async () => {
    const root = await tempDir();
    const dataPath = path.join(root, "data");
    const archivePath = path.join(root, "world.zip");
    writeZip(archivePath, {
      "world.json": worldJson("root-world"),
      "data/settings.db": "",
    });

    const imported = await importWorldArchive({ archivePath, dataPath });

    expect(imported.worldId).toBe("root-world");
    expect(
      fs.existsSync(path.join(dataPath, "Data/worlds/root-world/world.json")),
    ).toBe(true);
  });

  it("imports a one-folder archive when folder matches id", async () => {
    const root = await tempDir();
    const dataPath = path.join(root, "data");
    const archivePath = path.join(root, "world.zip");
    writeZip(archivePath, {
      "folder-world/world.json": worldJson("folder-world"),
    });

    const imported = await importWorldArchive({ archivePath, dataPath });

    expect(imported.worldId).toBe("folder-world");
    expect(imported.folder).toBe("folder-world");
    expect(
      fs.existsSync(path.join(dataPath, "Data/worlds/folder-world/world.json")),
    ).toBe(true);
  });

  it("imports a one-folder archive when folder differs from id", async () => {
    const root = await tempDir();
    const dataPath = path.join(root, "data");
    const archivePath = path.join(root, "world.zip");
    writeZip(archivePath, {
      "archive-folder/world.json": worldJson("manifest-world"),
    });

    const imported = await importWorldArchive({ archivePath, dataPath });

    expect(imported.worldId).toBe("manifest-world");
    expect(imported.folder).toBe("archive-folder");
    expect(imported.destinationDir).toBe(
      path.join(dataPath, "Data/worlds/archive-folder"),
    );
    expect(
      fs.existsSync(
        path.join(dataPath, "Data/worlds/archive-folder/world.json"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(dataPath, "Data/worlds/manifest-world/world.json"),
      ),
    ).toBe(false);
  });

  it("rejects multiple world.json files", async () => {
    const root = await tempDir();
    const archivePath = path.join(root, "world.zip");
    writeZip(archivePath, {
      "one/world.json": worldJson("one"),
      "two/world.json": worldJson("two"),
    });

    await expect(
      importWorldArchive({ archivePath, dataPath: path.join(root, "data") }),
    ).rejects.toThrow(/exactly one world\.json/);
  });

  it("rejects destination conflicts unless forced", async () => {
    const root = await tempDir();
    const dataPath = path.join(root, "data");
    const conflict = path.join(root, "conflict.zip");
    const destinationDir = path.join(dataPath, "Data/worlds/taken");
    writeZip(conflict, {
      "world.json": worldJson("taken", { title: "Imported Taken" }),
      "data/settings.db": "new-settings",
    });
    fs.ensureDirSync(destinationDir);
    fs.writeJSONSync(path.join(destinationDir, "world.json"), {
      id: "taken",
      title: "Existing Taken",
      system: "cyberpunk-red-core",
    });
    fs.writeFileSync(path.join(destinationDir, "stale.txt"), "old");

    await expect(
      importWorldArchive({ archivePath: conflict, dataPath }),
    ).rejects.toThrow(/already exists/);

    const imported = await importWorldArchive({
      archivePath: conflict,
      dataPath,
      force: true,
    });

    expect(imported.worldId).toBe("taken");
    expect(fs.readJSONSync(path.join(destinationDir, "world.json")).title).toBe(
      "Imported Taken",
    );
    expect(fs.existsSync(path.join(destinationDir, "stale.txt"))).toBe(false);
  });

  it("rejects wrong system ids and unsafe paths", async () => {
    const root = await tempDir();
    const wrongSystem = path.join(root, "wrong-system.zip");
    writeZip(wrongSystem, {
      "world.json": worldJson("dnd", { system: "dnd5e" }),
    });

    await expect(
      importWorldArchive({
        archivePath: wrongSystem,
        dataPath: path.join(root, "data"),
      }),
    ).rejects.toThrow(/expected 'cyberpunk-red-core'/);

    const unsafe = path.join(root, "unsafe.zip");
    writeUnsafeZip(unsafe);
    await expect(
      importWorldArchive({
        archivePath: unsafe,
        dataPath: path.join(root, "data"),
      }),
    ).rejects.toThrow(/unsafe path/);
  });

  it("rejects world ids and folders that are unsafe package ids", async () => {
    const root = await tempDir();
    const traversal = path.join(root, "traversal.zip");
    writeZip(traversal, {
      "world.json": worldJson("../../escaped"),
    });

    await expect(
      importWorldArchive({
        archivePath: traversal,
        dataPath: path.join(root, "data"),
      }),
    ).rejects.toThrow(/safe Foundry package id/);

    const unsafeFolder = path.join(root, "unsafe-folder.zip");
    writeZip(unsafeFolder, {
      "Bad Folder/world.json": worldJson("Bad Folder"),
    });

    await expect(
      importWorldArchive({
        archivePath: unsafeFolder,
        dataPath: path.join(root, "data"),
      }),
    ).rejects.toThrow(/safe Foundry package id/);
  });
});
