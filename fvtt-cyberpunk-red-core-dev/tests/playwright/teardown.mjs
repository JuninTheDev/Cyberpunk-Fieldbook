import {
  clearRunState,
  readSession,
  removeWorld,
} from "../../tools/playwright/config/harness-config.mjs";
import { stopFoundry } from "../../tools/playwright/server/foundry-server.mjs";

export default async function globalTeardown() {
  const session = readSession();
  await stopFoundry({ pid: session?.pid });

  if (session?.ephemeral && session.worldId) {
    await removeWorld(session.dataPath, session.worldId);
  }
  clearRunState();
}
