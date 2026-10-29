import { test, expect } from "@playwright/test";
import { gotoReadyWorld } from "../../../tools/playwright/session/world.mjs";
import {
  ACTOR_TYPES,
  createDocumentViaUI,
  expectSheetRendered,
  captureSheet,
  closeDocSheet,
  uniqueName,
} from "../../../tools/playwright/ui/index.mjs";

/*
 * Create an actor of each type through the Actors directory UI; the test passes
 * when the actor exists and its sheet renders (any error on the actor or its
 * embedded items would abort the render).
 */
test.beforeEach(async ({ page }) => {
  await gotoReadyWorld(page);
});

test.describe("Actor creation", () => {
  for (const type of ACTOR_TYPES) {
    test(`creates a ${type} actor and renders its sheet`, async ({
      page: game,
    }) => {
      const name = uniqueName(type);

      const id = await createDocumentViaUI(game, {
        documentTab: "actors",
        type,
        name,
      });
      expect(id).toBeTruthy();

      const sheetId = await expectSheetRendered(game, {
        collection: "actors",
        id,
      });
      await captureSheet(game, sheetId, `actor-${type}`);

      await closeDocSheet(game, { collection: "actors", id });
    });
  }
});
