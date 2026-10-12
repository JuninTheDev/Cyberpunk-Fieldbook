import { parseServeArgs, serveUsage } from "./serve-args.mjs";
import { buildAndLaunchLiveWorld } from "../flows/foundry-flows.mjs";

let args;
try {
  args = parseServeArgs(process.argv.slice(2));
} catch (error) {
  console.error(`${error.message}\n\n${serveUsage()}`);
  process.exit(1);
}

const session = await buildAndLaunchLiveWorld({
  worldId: args.world,
  archivePath: args.archive,
  force: args.force,
});

console.log(`\nFoundry is up at ${session.config.url}`);
console.log(`Game URL: ${session.config.url}/game`);
console.log(`World: ${session.worldId} (${session.mode})`);
console.log(
  "Drive it live (e.g. via the Playwright MCP). Press Ctrl-C to stop.\n",
);

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await session.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
