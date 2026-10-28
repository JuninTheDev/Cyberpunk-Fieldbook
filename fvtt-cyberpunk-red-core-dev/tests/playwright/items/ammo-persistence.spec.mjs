import { test, expect } from "@playwright/test";
import { gotoReadyWorld as gotoGame } from "../../../tools/playwright/session/world.mjs";
import { createActorViaUI } from "../../../tools/playwright/ui/actors.mjs";
import { dragItemToActorSheet } from "../../../tools/playwright/ui/embedded-items.mjs";
import { createItemViaUI } from "../../../tools/playwright/ui/items.mjs";
import { uniqueName } from "../../../tools/playwright/ui/index.mjs";
import { expectSheetRendered } from "../../../tools/playwright/ui/sheets.mjs";

/*
 * Regression test: an owned ammo item's amount changes must persist to the DB.
 *
 * `CPRAmmoItem._ammoDecrement`/`_ammoIncrement` used to mutate
 * `this.system.amount` in place and re-send the whole `system` object to
 * `updateEmbeddedDocuments`. Foundry diffed that against the already-mutated
 * source as an empty change, so nothing reached the DB. The in-memory document
 * still showed the new amount (the mutation stuck in RAM), so the sheet looked
 * right — but a fresh load re-read the unchanged persisted source and reset it
 * (observed as firing "reverting" a spent ammo stack). The fix persists a
 * targeted key: `this.update({ "system.amount": newValue })`.
 *
 * Because the buggy mutation survives in memory, an in-session re-read cannot see
 * the bug — only a real DB round-trip can. So this drives the model API directly
 * (`_ammoDecrement`/`_ammoIncrement`), then RELOADS the world and re-reads the
 * ammo fresh from the reloaded collection: the exact re-read-from-persisted-DB
 * path the bug corrupts. With the old empty-diff bug the reloaded amount is
 * unchanged (100) and these assertions fail; with the fix it reflects the change.
 * The reload here is a plain page reload, not the brittle in-app reload/fire UI.
 */

// Read an owned ammo item's amount fresh from the world collection.
function readAmount(game, actorId, ammoId) {
  return game.evaluate(
    ({ actorId, ammoId }) =>
      game.actors.get(actorId).items.get(ammoId).system.amount,
    { actorId, ammoId },
  );
}

test.describe("Owned ammo amount persistence", () => {
  test.beforeEach(async ({ page }) => {
    await gotoGame(page);
  });

  test("_ammoDecrement and _ammoIncrement persist system.amount across a reload", async ({
    page: game,
  }) => {
    const actorName = uniqueName("ammo-char");
    const ammoName = uniqueName("ammo");

    // 1. Create a character actor with an embedded ammo item at a known amount.
    const actorId = await createActorViaUI(game, { name: actorName });
    const itemId = await createItemViaUI(game, {
      type: "ammo",
      name: ammoName,
    });
    const sheetId = await expectSheetRendered(game, {
      collection: "actors",
      id: actorId,
    });
    await dragItemToActorSheet(game, { itemId, sheetId, actorId });
    const ammoId = await game.evaluate(
      ({ actorId, ammoName }) => {
        const ammo = game.actors
          .get(actorId)
          .items.find((item) => item.name === ammoName);
        return ammo.id;
      },
      { actorId, ammoName },
    );
    await game.evaluate(
      ({ actorId, ammoId }) =>
        game.actors
          .get(actorId)
          .items.get(ammoId)
          .update({ "system.amount": 100 }),
      { actorId, ammoId },
    );

    // Sanity: the embedded ammo starts at 100.
    expect(await readAmount(game, actorId, ammoId)).toBe(100);

    // 2. Decrement by 10 via the method under test, then reload the world so the
    //    ammo is re-read fresh from the persisted DB (the bug's failure path).
    await game.evaluate(
      async ({ actorId, ammoId }) => {
        const ammo = game.actors.get(actorId).items.get(ammoId);
        await ammo._ammoDecrement(10);
      },
      { actorId, ammoId },
    );
    await gotoGame(game);

    // 3. With the bug this fresh read is still 100; with the fix it is 90.
    expect(await readAmount(game, actorId, ammoId)).toBe(90);

    // 4. Increment by 5 and confirm it likewise survives a reload (90 -> 95).
    await game.evaluate(
      async ({ actorId, ammoId }) => {
        const ammo = game.actors.get(actorId).items.get(ammoId);
        await ammo._ammoIncrement(5);
      },
      { actorId, ammoId },
    );
    await gotoGame(game);

    expect(await readAmount(game, actorId, ammoId)).toBe(95);
  });
});
