import AdmZip from "adm-zip";
import fs from "fs-extra";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { RUN_STATE_DIR, worldDir } from "../config/harness-config.mjs";
import { validateWorldPackageId, validateWorldSystem } from "./worlds.mjs";

function assertInside(parent, child) {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Archive contains an unsafe path: ${child}`);
  }
}

function safeExtract(zip, destination) {
  for (const entry of zip.getEntries()) {
    const target = path.resolve(destination, entry.entryName);
    assertInside(destination, target);
  }
  zip.extractAllTo(destination, true);
}

function relativeParts(file, root) {
  return path.relative(root, file).split(path.sep);
}

function findWorldJsonFiles(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name === "world.json")
        found.push(fullPath);
    }
  };
  walk(root);
  return found;
}

function validateLayout(extractDir, worldJsonPath, world) {
  const parts = relativeParts(worldJsonPath, extractDir);
  if (parts.length === 1) {
    const worldId = world.id;
    validateWorldPackageId(worldId, "Archive world id");
    return { sourceWorldDir: extractDir, folder: worldId };
  }
  if (parts.length === 2) {
    const [folder] = parts;
    const worldId = world.id ?? folder;
    validateWorldPackageId(folder, "Archive folder");
    validateWorldPackageId(worldId, "Archive world id");
    return { sourceWorldDir: path.join(extractDir, folder), folder };
  }
  throw new Error(
    "Archive must contain world.json at the root or inside one top-level folder.",
  );
}

async function moveRootWorld(sourceDir, destinationDir) {
  fs.ensureDirSync(destinationDir);
  for (const entry of fs.readdirSync(sourceDir)) {
    await fs.move(
      path.join(sourceDir, entry),
      path.join(destinationDir, entry),
    );
  }
}

export async function importWorldArchive({
  archivePath,
  dataPath,
  force = false,
}) {
  if (!archivePath) throw new Error("Missing archive path.");
  const sourceArchive = path.resolve(archivePath);
  if (!fs.existsSync(sourceArchive)) {
    throw new Error(`Archive does not exist: ${sourceArchive}`);
  }

  fs.ensureDirSync(RUN_STATE_DIR);
  const tempRoot = await mkdtemp(path.join(RUN_STATE_DIR, "archive-"));
  const extractDir = path.join(tempRoot, "extract");
  fs.ensureDirSync(extractDir);

  try {
    safeExtract(new AdmZip(sourceArchive), extractDir);
    const worldJsonFiles = findWorldJsonFiles(extractDir);
    if (worldJsonFiles.length !== 1) {
      throw new Error(
        `Archive must contain exactly one world.json; found ${worldJsonFiles.length}.`,
      );
    }

    const world = fs.readJSONSync(worldJsonFiles[0]);
    validateWorldSystem(world, sourceArchive);
    const { sourceWorldDir, folder } = validateLayout(
      extractDir,
      worldJsonFiles[0],
      world,
    );
    const worldId = world.id ?? folder;
    validateWorldPackageId(worldId, "Archive world id");
    const destinationDir = worldDir(dataPath, folder);
    if (fs.existsSync(destinationDir)) {
      if (!force) {
        throw new Error(`World destination already exists: ${destinationDir}`);
      }
      await rm(destinationDir, { recursive: true, force: true });
    }

    fs.ensureDirSync(path.dirname(destinationDir));
    if (sourceWorldDir === extractDir)
      await moveRootWorld(sourceWorldDir, destinationDir);
    else await fs.move(sourceWorldDir, destinationDir);

    await rm(tempRoot, { recursive: true, force: true });
    return {
      worldId,
      folder,
      title: world.title ?? worldId,
      destinationDir,
      archivePath: sourceArchive,
    };
  } catch (error) {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
