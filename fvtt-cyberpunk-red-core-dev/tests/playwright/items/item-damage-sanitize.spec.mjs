import { test, expect } from "@playwright/test";
import { gotoReadyWorld } from "../../../tools/playwright/session/world.mjs";
import { createItemViaUI } from "../../../tools/playwright/ui/items.mjs";
import { uniqueName } from "../../../tools/playwright/ui/names.mjs";

/*
 * The `dmg`/`ab`/`cd` markers are built from an item's own crit / ablation settings, and `red` conflicts
 * with the auto-appended `dmg`, so none may be hand-entered into a damage field. The sanitize-item-damage
 * hook strips them (while keeping every other modifier) on update — for EVERY attackable item type
 * (`system.damage`) and for ammo overrides (`system.overrides.damage.value`). These specs drive the
 * update through the real `preUpdateItem` path and read the stored value back.
 */

// Create through the directory UI, then update/read the field under test.
async function updateField(page, type, field, input) {
  const id = await createItemViaUI(page, {
    type,
    name: uniqueName(`sanitest-${type}`),
  });
  return page.evaluate(
    async ({ id, field, input }) => {
      const item = game.items.get(id);
      await item.update({ [field]: input });
      return foundry.utils.getProperty(item, field);
    },
    { id, field, input },
  );
}

test.beforeEach(async ({ page }) => {
  await gotoReadyWorld(page);
});

test("strips dmg/ab/cd/red from the Damage field of every attackable item type, keeping other modifiers", async ({
  page: game,
}) => {
  const types = await game.evaluate(() =>
    Object.keys(CONFIG.Item.dataModels).filter((t) =>
      (CONFIG.Item.dataModels[t].mixins ?? []).includes("attackable"),
    ),
  );
  const stored = [];
  for (const type of types) {
    const damage = await updateField(
      game,
      type,
      "system.damage",
      "3d6kh2dmg5ab0cd10red",
    );
    stored.push({ type, damage });
  }
  const results = { types, stored };

  // Guard against the predicate silently matching nothing (which would make the test vacuously pass).
  expect(results.types.length).toBeGreaterThan(0);
  for (const r of results.stored) {
    expect(r.damage, `attackable type "${r.type}"`).toBe("3d6kh2");
  }
});

test("strips the markers from an ammo damage override", async ({
  page: game,
}) => {
  expect(
    await updateField(
      game,
      "ammo",
      "system.overrides.damage.value",
      "2d6dmg5ab0cd10red",
    ),
  ).toBe("2d6");
});

test("still fires updateItem when the cleaned value equals the stored one (so the sheet re-renders)", async ({
  page: game,
}) => {
  // Appending a marker to an already-clean formula cleans back to the stored value, so the update
  // would be a no-op that Foundry skips — leaving the raw text in the sheet field until it is
  // reopened. The hook forces the write (`options.diff = false`) so updateItem fires and the sheet
  // re-renders with the sanitised value. Guard that the write is still forced.
  const id = await createItemViaUI(game, {
    type: "weapon",
    name: uniqueName("sanitest-noop"),
  });
  const result = await game.evaluate(async (id) => {
    const item = game.items.get(id);
    await item.update({ "system.damage": "3d6kh2" });
    let fired = false;
    const hookId = Hooks.on("updateItem", (doc) => {
      if (doc.id === item.id) fired = true;
    });
    try {
      await item.update({ "system.damage": "3d6kh2red" });
      return { fired, stored: item.system.damage };
    } finally {
      Hooks.off("updateItem", hookId);
    }
  }, id);
  expect(result.stored).toBe("3d6kh2");
  expect(result.fired).toBe(true);
});

test("leaves a marker-free damage formula untouched", async ({
  page: game,
}) => {
  expect(await updateField(game, "weapon", "system.damage", "3d6kh2")).toBe(
    "3d6kh2",
  );
  expect(
    await updateField(game, "weapon", "system.damage", "2d6 + @stats.body"),
  ).toBe("2d6 + @stats.body");
  expect(
    await updateField(game, "ammo", "system.overrides.damage.value", "2d6 + 2"),
  ).toBe("2d6 + 2");
});
