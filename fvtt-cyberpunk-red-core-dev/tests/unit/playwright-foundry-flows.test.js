import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  buildStatus: 0,
  joinAsGMCalls: [],
  joinAsFullGMCalls: [],
  driveSetupCalls: [],
  launchExistingWorldCalls: [],
  resetWorldUserPasswordsCalls: [],
  storageStateCalls: [],
  browserCloseCalls: 0,
  pageCloseCalls: 0,
  stopFoundryCalls: 0,
  removeWorldCalls: [],
  clearRunStateCalls: 0,
  sessions: [],
}));

vi.mock("@playwright/test", () => ({
  chromium: {
    launch: vi.fn(async () => ({
      newPage: async () => ({
        context: () => ({
          storageState: async ({ path }) => {
            state.storageStateCalls.push(path);
          },
        }),
        close: async () => {
          state.pageCloseCalls += 1;
        },
      }),
      close: async () => {
        state.browserCloseCalls += 1;
      },
    })),
  },
}));

vi.mock("../../tools/playwright/config/harness-config.mjs", () => ({
  clearRunState: () => {
    state.clearRunStateCalls += 1;
  },
  newWorldId: () => "fresh-world",
  removeWorld: async (dataPath, worldId) => {
    state.removeWorldCalls.push({ dataPath, worldId });
  },
  resolveHarnessConfig: () => ({
    url: "http://localhost:30001",
    dataPath: "/tmp/foundry-data",
    port: 30001,
    dataPathMode: "configured",
    storageState: "/tmp/gm.json",
  }),
  writeSession: (session) => {
    state.sessions.push(session);
  },
}));

vi.mock("../../tools/playwright/session/archive-import.mjs", () => ({
  importWorldArchive: async () => ({
    worldId: "archive-world",
    folder: "archive-world",
    archivePath: "/tmp/archive.zip",
  }),
}));

vi.mock("../../tools/playwright/session/worlds.mjs", () => ({
  resolveWorld: () => ({ id: "existing-world", folder: "existing-world" }),
}));

vi.mock("../../tools/playwright/server/foundry-server.mjs", () => ({
  startFoundry: async () => ({ child: { pid: 4242 } }),
  stopFoundry: async () => {
    state.stopFoundryCalls += 1;
  },
}));

vi.mock("../../tools/playwright/setup/foundry-setup.mjs", () => ({
  driveSetup: async (...args) => {
    state.driveSetupCalls.push(args);
  },
  joinAsFullGM: async (...args) => {
    state.joinAsFullGMCalls.push(args);
  },
  joinAsGM: async (...args) => {
    state.joinAsGMCalls.push(args);
  },
  launchExistingWorld: async (...args) => {
    state.launchExistingWorldCalls.push(args);
  },
  resetWorldUserPasswords: async (...args) => {
    state.resetWorldUserPasswordsCalls.push(args);
  },
}));

vi.mock("node:child_process", () => ({
  spawnSync: () => ({ status: state.buildStatus, stdout: "", stderr: "" }),
}));

const flows = await import("../../tools/playwright/flows/foundry-flows.mjs");

beforeEach(() => {
  state.buildStatus = 0;
  state.joinAsGMCalls = [];
  state.joinAsFullGMCalls = [];
  state.driveSetupCalls = [];
  state.launchExistingWorldCalls = [];
  state.resetWorldUserPasswordsCalls = [];
  state.storageStateCalls = [];
  state.browserCloseCalls = 0;
  state.pageCloseCalls = 0;
  state.stopFoundryCalls = 0;
  state.removeWorldCalls = [];
  state.clearRunStateCalls = 0;
  state.sessions = [];
});

describe("playwright serve live sessions", () => {
  it("leaves fresh live worlds at the login screen", async () => {
    const session = await flows.launchLiveWorld();

    expect(state.driveSetupCalls).toHaveLength(1);
    expect(state.joinAsGMCalls).toHaveLength(0);
    expect(state.browserCloseCalls).toBe(0);
    expect(state.pageCloseCalls).toBe(0);
    expect(session.mode).toBe("fresh");
  });

  it("keeps test worlds auto-logging in as GM", async () => {
    await flows.launchTestWorld();

    expect(state.joinAsGMCalls).toHaveLength(1);
  });

  it("leaves existing live worlds at the login screen", async () => {
    const session = await flows.buildAndLaunchLiveWorld({
      worldId: "night-city",
    });

    expect(state.resetWorldUserPasswordsCalls).toHaveLength(1);
    expect(state.launchExistingWorldCalls).toHaveLength(1);
    expect(state.joinAsFullGMCalls).toHaveLength(0);
    expect(state.storageStateCalls).toHaveLength(0);
    expect(session.mode).toBe("world");
    expect(state.browserCloseCalls).toBe(0);
    expect(state.pageCloseCalls).toBe(0);
  });
});
