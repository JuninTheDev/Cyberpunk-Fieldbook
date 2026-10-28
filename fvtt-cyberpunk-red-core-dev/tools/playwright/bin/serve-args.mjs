export function parseServeArgs(argv) {
  const options = { mode: "fresh", force: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--world" || arg === "--archive") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}.`);
      }
      if (options.world || options.archive) {
        throw new Error("--world and --archive are mutually exclusive.");
      }
      if (arg === "--world") {
        options.mode = "world";
        options.world = value;
      } else {
        options.mode = "archive";
        options.archive = value;
      }
      index += 1;
    } else {
      throw new Error(`Unknown argument '${arg}'.`);
    }
  }

  if (options.force && options.mode !== "archive") {
    throw new Error("--force may only be used with --archive.");
  }

  return options;
}

export function serveUsage() {
  return [
    "Usage: npm run playwright:serve -- [--world <id> | --archive <zip>] [--force]",
    "",
    "No arguments creates a fresh ephemeral CPR world.",
    "--world launches an existing configured-data-path CPR world.",
    "--archive imports a world zip into the configured data path, then launches it.",
    "--force replaces an existing imported world when used with --archive.",
  ].join("\n");
}
