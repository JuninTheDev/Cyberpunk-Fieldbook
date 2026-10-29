import { test, expect } from "@playwright/test";
import { gotoReadyWorld } from "../../../tools/playwright/session/world.mjs";
import { createActorViaUI } from "../../../tools/playwright/ui/actors.mjs";
import { dragItemToActorSheet } from "../../../tools/playwright/ui/embedded-items.mjs";
import { createItemViaUI } from "../../../tools/playwright/ui/items.mjs";
import { uniqueName } from "../../../tools/playwright/ui/names.mjs";
import { expectSheetRendered } from "../../../tools/playwright/ui/sheets.mjs";

/*
 * Verifies @-references resolve in roll formulas via the actor's roll data. `CPRActor#getRollData`
 * exposes single-value stats as plain numbers (`@stats.ref`) and value+max stats (LUCK, EMP, derived
 * HP/Humanity) as `{ value, total }` (`@stats.luck.value` / `@stats.luck.total`). Skills come from the
 * `system.skills` getter as `level + Active Effect mods`. Derived stats are also under `@derivedStats.*`.
 */

test.beforeEach(async ({ page }) => {
  await gotoReadyWorld(page);
});

test("@stats (flat + value/total), @skills, and @derivedStats resolve in roll formulas", async ({
  page: game,
}) => {
  const actorId = await createActorViaUI(game, {
    name: uniqueName("rd-char"),
  });
  const hasHandgun = await game.evaluate((actorId) => {
    const actor = game.actors.get(actorId);
    return actor.items.some(
      (item) => item.type === "skill" && item.name === "Handgun",
    );
  }, actorId);
  if (!hasHandgun) {
    const skillId = await createItemViaUI(game, {
      type: "skill",
      name: "Handgun",
    });
    const sheetId = await expectSheetRendered(game, {
      collection: "actors",
      id: actorId,
    });
    await dragItemToActorSheet(game, { itemId: skillId, sheetId, actorId });
  }

  const result = await game.evaluate(async (actorId) => {
    const actor = game.actors.get(actorId);
    await actor.update({
      "system.stats.ref.value": 7,
      "system.stats.luck.value": 3,
      "system.stats.luck.max": 6,
    });
    const handgun = actor.items.find(
      (item) => item.type === "skill" && item.name === "Handgun",
    );
    await handgun.update({ "system.level": 5, "system.stat": "ref" });

    const rd = actor.getRollData();
    const walkValue = actor.system.derivedStats.walk.value;

    const checkRoll = await new Roll(
      "1d10 + @stats.ref + @skills.handgun",
      rd,
    ).evaluate();
    const luckRoll = await new Roll(
      "@stats.luck.value + @stats.luck.total",
      rd,
    ).evaluate();
    const derivedRoll = await new Roll("@derivedStats.walk", rd).evaluate();

    const out = {
      ref: rd.stats?.ref, // single-value stat → flat number
      handgun: rd.skills?.handgun, // level + mods
      luckValue: rd.stats?.luck?.value, // value+max stat → { value, total }
      luckTotal: rd.stats?.luck?.total,
      walkValue,
      rdStatsWalk: rd.stats?.walk, // single-value derived → flat
      rdDerivedWalk: rd.derivedStats?.walk,
      checkTotal: checkRoll.total,
      diceTotal: checkRoll.dice[0].total,
      luckTotalRoll: luckRoll.total,
      derivedTotalRoll: derivedRoll.total,
    };
    return out;
  }, actorId);

  // Single-value stat stays flat; skill is level + mods.
  expect(result.ref).toBe(7);
  expect(result.handgun).toBe(5);
  expect(result.checkTotal).toBe(result.diceTotal + 12);
  // Value+max stat exposes value (current) and total (max), both usable in a formula.
  expect(result.luckValue).toBe(3);
  expect(result.luckTotal).toBe(6);
  expect(result.luckTotalRoll).toBe(9);
  // Derived stats resolve under both @stats.* and @derivedStats.*.
  expect(result.rdStatsWalk).toBe(result.walkValue);
  expect(result.rdDerivedWalk).toBe(result.walkValue);
  expect(result.derivedTotalRoll).toBe(result.walkValue);
});
