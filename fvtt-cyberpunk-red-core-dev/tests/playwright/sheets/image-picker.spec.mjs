import { test, expect } from "@playwright/test";
import { gotoReadyWorld } from "../../../tools/playwright/session/world.mjs";
import {
  ACTOR_TYPES,
  closeDocSheet,
  createActorViaUI,
  createItemViaUI,
  expectSheetRendered,
  openImagePickerViaUI,
  reopenActorSheetViaUI,
  reopenItemSheetViaUI,
  selectFileViaUI,
  uniqueName,
} from "../../../tools/playwright/ui/index.mjs";

const ACTOR_IMAGE = "icons/svg/skull.svg";
const ITEM_IMAGE = "icons/svg/book.svg";

test.beforeEach(async ({ page }) => {
  await gotoReadyWorld(page);
});

test("actor portrait images open the FilePicker and persist", async ({
  page: game,
}) => {
  for (const type of ACTOR_TYPES) {
    await test.step(`${type} portrait`, async () => {
      const actorId = await createActorViaUI(game, {
        type,
        name: uniqueName(`${type}-portrait`),
      });
      let sheetId = await expectSheetRendered(game, {
        collection: "actors",
        id: actorId,
      });
      let portrait = game.locator(
        `#${sheetId} img[data-action="editImage"][data-edit="img"]`,
      );
      await expect(portrait).toBeVisible();

      const picker = await openImagePickerViaUI(game, portrait);
      await expect(picker).toBeVisible();
      await selectFileViaUI(game, picker, ACTOR_IMAGE);
      await game.waitForFunction(
        ({ actorId, image }) => game.actors.get(actorId)?.img === image,
        { actorId, image: ACTOR_IMAGE },
        { timeout: 10000 },
      );
      await expect(portrait).toHaveAttribute("src", ACTOR_IMAGE);

      await closeDocSheet(game, { collection: "actors", id: actorId });
      sheetId = await reopenActorSheetViaUI(game, actorId);
      portrait = game.locator(
        `#${sheetId} img[data-action="editImage"][data-edit="img"]`,
      );
      await expect(portrait).toHaveAttribute("src", ACTOR_IMAGE);

      await closeDocSheet(game, { collection: "actors", id: actorId });
    });
  }
});

test("item portrait images open the FilePicker and persist", async ({
  page: game,
}) => {
  const itemId = await createItemViaUI(game, {
    type: "gear",
    name: uniqueName("item-portrait"),
  });
  let sheetId = await expectSheetRendered(game, {
    collection: "items",
    id: itemId,
  });
  let portrait = game.locator(
    `#${sheetId} img.item-image-block-img[data-action="editImage"][data-edit="img"]`,
  );
  await expect(portrait).toBeVisible();

  const picker = await openImagePickerViaUI(game, portrait);
  await expect(picker).toBeVisible();
  await selectFileViaUI(game, picker, ITEM_IMAGE);
  await game.waitForFunction(
    ({ itemId, image }) => game.items.get(itemId)?.img === image,
    { itemId, image: ITEM_IMAGE },
    { timeout: 10000 },
  );
  await expect(portrait).toHaveAttribute("src", ITEM_IMAGE);

  await closeDocSheet(game, { collection: "items", id: itemId });
  sheetId = await reopenItemSheetViaUI(game, itemId);
  portrait = game.locator(
    `#${sheetId} img.item-image-block-img[data-action="editImage"][data-edit="img"]`,
  );
  await expect(portrait).toHaveAttribute("src", ITEM_IMAGE);

  await closeDocSheet(game, { collection: "items", id: itemId });
});
