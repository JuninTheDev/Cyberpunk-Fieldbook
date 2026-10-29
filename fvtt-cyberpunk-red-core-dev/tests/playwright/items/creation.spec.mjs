import { test, expect } from "@playwright/test";
import { gotoReadyWorld } from "../../../tools/playwright/session/world.mjs";
import {
  ITEM_TYPES,
  createDocumentViaUI,
  expectSheetRendered,
  captureSheet,
  closeDocSheet,
  uniqueName,
} from "../../../tools/playwright/ui/index.mjs";

/*
 * Create an item of each type through the Items directory UI; the test passes
 * when the item exists and its sheet renders (any error in the item's data or
 * sheet code would abort the render).
 */
test.beforeEach(async ({ page }) => {
  await gotoReadyWorld(page);
});

test.describe("Item creation", () => {
  for (const type of ITEM_TYPES) {
    test(`creates a ${type} item and renders its sheet`, async ({
      page: game,
    }) => {
      const name = uniqueName(type);

      const id = await createDocumentViaUI(game, {
        documentTab: "items",
        type,
        name,
      });
      expect(id).toBeTruthy();

      const sheetId = await expectSheetRendered(game, {
        collection: "items",
        id,
      });
      await captureSheet(game, sheetId, `item-${type}`);

      await closeDocSheet(game, { collection: "items", id });
    });
  }
});
