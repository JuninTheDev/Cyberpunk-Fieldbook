import fs from "fs-extra";
import path from "node:path";
import { SYSTEM_NAME, worldDir } from "../config/harness-config.mjs";

export function worldsRoot(dataPath) {
  return path.join(dataPath, "Data", "worlds");
}

export function validateWorldSystem(world, source = "world.json") {
  if (world?.system !== SYSTEM_NAME) {
    throw new Error(
      `${source} is for system '${world?.system ?? "<missing>"}', expected '${SYSTEM_NAME}'.`,
    );
  }
}

export function validateWorldPackageId(worldId, source = "world id") {
  if (typeof worldId !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(worldId)) {
    throw new Error(
      `${source} '${worldId ?? "<missing>"}' is not a safe Foundry package id.`,
    );
  }
}

export function readWorld(dataPath, worldId) {
  const file = path.join(worldDir(dataPath, worldId), "world.json");
  if (!fs.existsSync(file)) {
    throw new Error(`World '${worldId}' does not exist at ${file}.`);
  }
  const world = fs.readJSONSync(file);
  validateWorldSystem(world, file);
  return { ...world, id: world.id ?? worldId, folder: worldId, path: file };
}

export function listWorlds(dataPath) {
  const root = worldsRoot(dataPath);
  if (!fs.existsSync(root)) return [];

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const file = path.join(root, entry.name, "world.json");
      if (!fs.existsSync(file)) return [];
      try {
        const world = fs.readJSONSync(file);
        if (world?.system !== SYSTEM_NAME) return [];
        return [
          {
            id: world.id ?? entry.name,
            folder: entry.name,
            title: world.title ?? world.id ?? entry.name,
            path: file,
            system: world.system,
          },
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function formatAvailableWorlds(worlds) {
  if (worlds.length === 0) return "No CPR worlds were found.";
  return worlds.map((world) => `  - ${world.id} (${world.title})`).join("\n");
}

export function resolveWorld(dataPath, worldId) {
  if (!worldId) throw new Error("Missing world id.");
  const worlds = listWorlds(dataPath);
  const world = worlds.find(
    (candidate) => candidate.id === worldId || candidate.folder === worldId,
  );
  if (!world) {
    throw new Error(
      `Could not find CPR world '${worldId}' in ${worldsRoot(dataPath)}.\n` +
        `Available CPR worlds:\n${formatAvailableWorlds(worlds)}`,
    );
  }
  return world;
}
