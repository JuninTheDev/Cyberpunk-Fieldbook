import { chromium } from "@playwright/test";
import {
  clearRunState,
  newWorldId,
  removeWorld,
  resolveHarnessConfig,
  writeSession,
} from "../config/harness-config.mjs";
import { importWorldArchive } from "../session/archive-import.mjs";
import { resolveWorld } from "../session/worlds.mjs";
import { startFoundry, stopFoundry } from "../server/foundry-server.mjs";
import {
  driveSetup,
  joinAsGM,
  launchExistingWorld,
  resetWorldUserPasswords,
} from "../setup/foundry-setup.mjs";

function createSession({
  config,
  child,
  worldId,
  worldFolder,
  mode,
  serveMode = mode,
  ephemeral,
  archivePath,
  browser,
  page,
}) {
  const session = {
    config,
    worldId,
    worldFolder,
    mode: serveMode,
    metadata: {
      worldId,
      worldFolder,
      dataPath: config.dataPath,
      pid: child.pid,
      port: config.port,
      mode: serveMode,
      dataPathMode: config.dataPathMode,
      ephemeral,
      archivePath,
    },
    pid: child.pid,
    ephemeral,
    archivePath,
    browser,
    page,
    async stop() {
      await page?.close().catch(() => {});
      await browser?.close().catch(() => {});
      await stopFoundry(child);
      if (ephemeral) await removeWorld(config.dataPath, worldId);
      clearRunState();
    },
  };
  writeSession(session);
  return session;
}

async function launchWorld({
  mode,
  dataPathMode,
  silent = false,
  keepBrowser = false,
} = {}) {
  const config = resolveHarnessConfig({ mode, dataPathMode });
  const worldId = newWorldId();
  const { child } = await startFoundry({ config, mode, silent });
  let browser;
  let page;
  let session;
  try {
    browser = await chromium.launch(
      mode === "test" ? { args: ["--no-sandbox"] } : undefined,
    );
    page = await browser.newPage(
      mode === "test" ? { viewport: { width: 1920, height: 1080 } } : undefined,
    );
    await driveSetup(page, { config, worldId });
    if (mode === "test") {
      await joinAsGM(page, config);
    }
    session = createSession({
      config,
      child,
      worldId,
      mode,
      serveMode: mode === "live" ? "fresh" : mode,
      ephemeral: true,
      browser: keepBrowser ? browser : undefined,
      page: keepBrowser ? page : undefined,
    });
    if (!keepBrowser) {
      await browser.close();
      browser = undefined;
      page = undefined;
    }
    return session;
  } catch (error) {
    await page?.close().catch(() => {});
    await browser?.close().catch(() => {});
    await stopFoundry(child).catch(() => {});
    clearRunState();
    await removeWorld(config.dataPath, worldId).catch(() => {});
    throw error;
  }
}

export function launchLiveWorld(options = {}) {
  return launchWorld({
    ...options,
    mode: "live",
    dataPathMode: "configured",
    keepBrowser: true,
  });
}

async function launchBughuntWorld({
  worldId,
  archivePath,
  force = false,
  silent = false,
} = {}) {
  const config = resolveHarnessConfig({
    mode: "live",
    dataPathMode: "configured",
  });
  let archiveInfo;
  const resolvedWorld = archivePath
    ? {
        id: (archiveInfo = await importWorldArchive({
          archivePath,
          dataPath: config.dataPath,
          force,
        })).worldId,
        folder: archiveInfo.folder,
      }
    : resolveWorld(config.dataPath, worldId);
  const resolvedWorldId = resolvedWorld.id;
  const setupPackageId = resolvedWorld.folder;

  const { child } = await startFoundry({ config, mode: "live", silent });
  let browser;
  let page;
  try {
    browser = await chromium.launch();
    page = await browser.newPage();
    await resetWorldUserPasswords(page, {
      config,
      worldId: setupPackageId,
    });
    await launchExistingWorld(page, { config, worldId: setupPackageId });
    return createSession({
      config,
      child,
      worldId: resolvedWorldId,
      worldFolder: setupPackageId,
      mode: "live",
      serveMode: archivePath ? "archive" : "world",
      ephemeral: false,
      archivePath: archiveInfo?.archivePath,
      browser,
      page,
    });
  } catch (error) {
    await page?.close().catch(() => {});
    await browser?.close().catch(() => {});
    await stopFoundry(child).catch(() => {});
    clearRunState();
    throw error;
  }
}

async function buildCurrentCode() {
  const { spawnSync } = await import("node:child_process");
  const build = spawnSync("npx gulp build", { shell: true, encoding: "utf8" });
  if (build.status !== 0) {
    process.stderr.write(`${build.stdout ?? ""}${build.stderr ?? ""}`);
    process.exit(build.status ?? 1);
  }
}

export async function buildAndLaunchLiveWorld(options = {}) {
  await buildCurrentCode();
  if (options.worldId || options.archivePath)
    return launchBughuntWorld(options);
  return launchLiveWorld(options);
}

export function launchTestWorld(options = {}) {
  return launchWorld({ ...options, mode: "test", dataPathMode: "isolated" });
}

export async function buildAndLaunchTestWorld(options = {}) {
  await buildCurrentCode();
  return launchTestWorld(options);
}
