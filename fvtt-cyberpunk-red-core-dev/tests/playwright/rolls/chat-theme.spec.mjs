import { test, expect } from "@playwright/test";
import { gotoReadyWorld } from "../../../tools/playwright/session/world.mjs";
import { uniqueName } from "../../../tools/playwright/ui/index.mjs";

/*
 * All chat messages now use the CPR chat theme. This covers plain text chat,
 * native Foundry roll output, native RollTable output, and bespoke CPR roll
 * cards so the full chat surface is exercised.
 */

async function getExpectedTheme(page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.background = "var(--cpr-background-chat-card)";
    probe.style.color = "var(--cpr-text-chat-normal)";
    probe.style.fontFamily = "var(--cpr-font-primary)";
    probe.style.border = "1px solid var(--cpr-background-chat-border)";
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const theme = {
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontFamily: style.fontFamily,
      borderColor: style.borderTopColor,
    };
    probe.remove();
    return theme;
  });
}

async function postPlainMessage(page, text) {
  return page.evaluate(
    async (content) => (await ChatMessage.create({ content })).id,
    text,
  );
}

async function postNativeRollMessage(page, formula) {
  return page.evaluate(async (rollFormula) => {
    const roll = await new Roll(rollFormula).evaluate();
    return (await roll.toMessage({}, { create: true })).id;
  }, formula);
}

async function drawNativeRollTableMessage(page, name) {
  return page.evaluate(async (tableName) => {
    const table = await globalThis.RollTable.create({
      name: tableName,
      formula: "1d1",
      replacement: true,
      displayRoll: true,
      results: [
        {
          type: globalThis.CONST.TABLE_RESULT_TYPES.TEXT,
          text: "Chrome in the bloodstream.",
          weight: 1,
          range: [1, 1],
          drawn: false,
        },
      ],
    });

    const before = game.messages.size;
    try {
      await table.draw();
      const message = game.messages.contents.at(-1);
      return {
        tableId: table.id,
        messageId: message.id,
        hasRollTableFlag: Boolean(
          foundry.utils.getProperty(message, "flags.core.RollTable"),
        ),
        messageCountIncreased: game.messages.size > before,
      };
    } finally {
      await table.delete();
    }
  }, name);
}

async function waitForRenderedMessage(page, messageId) {
  await page.waitForFunction(
    (id) =>
      Array.from(
        document.querySelectorAll(
          `#chat .chat-message[data-message-id="${id}"]`,
        ),
      ).some((element) => !element.hidden),
    messageId,
    { timeout: 10000 },
  );
}

async function readMessageTheme(page, messageId) {
  return page.evaluate((id) => {
    const message = Array.from(
      document.querySelectorAll(`#chat .chat-message[data-message-id="${id}"]`),
    ).find((element) => !element.hidden);
    const messageStyle = getComputedStyle(message);
    const content = message.querySelector(".message-content");
    const contentStyle = getComputedStyle(content);
    return {
      backgroundColor: messageStyle.backgroundColor,
      color: messageStyle.color,
      fontFamily: messageStyle.fontFamily,
      contentColor: contentStyle.color,
      contentFontFamily: contentStyle.fontFamily,
    };
  }, messageId);
}

test.beforeEach(async ({ page }) => {
  await gotoReadyWorld(page);
});

test.describe("chat theme", () => {
  test("a plain chat message uses the CPR chat theme", async ({
    page: game,
  }) => {
    const theme = await getExpectedTheme(game);
    const messageId = await postPlainMessage(
      game,
      `<p>${uniqueName("plain-chat")}</p>`,
    );
    await waitForRenderedMessage(game, messageId);

    const styles = await readMessageTheme(game, messageId);
    expect(styles.backgroundColor).toBe(theme.backgroundColor);
    expect(styles.color).toBe(theme.color);
    expect(styles.fontFamily).toBe(theme.fontFamily);
    expect(styles.contentColor).toBe(theme.color);
    expect(styles.contentFontFamily).toBe(theme.fontFamily);
  });

  test("a native bare roll uses the CPR chat theme", async ({ page: game }) => {
    const theme = await getExpectedTheme(game);
    const messageId = await postNativeRollMessage(game, "1d10");
    await waitForRenderedMessage(game, messageId);

    const diceRoll = game.locator(
      `#chat .chat-message[data-message-id="${messageId}"]:not([hidden]) .dice-roll`,
    );
    await expect(diceRoll).toBeVisible();

    const styles = await readMessageTheme(game, messageId);
    expect(styles.backgroundColor).toBe(theme.backgroundColor);
    expect(styles.color).toBe(theme.color);
    expect(styles.fontFamily).toBe(theme.fontFamily);

    const diceStyles = await diceRoll.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        fontFamily: style.fontFamily,
      };
    });
    expect(diceStyles.color).toBe(theme.color);
    expect(diceStyles.fontFamily).toBe(theme.fontFamily);
  });

  test("a native RollTable draw uses the CPR chat theme", async ({
    page: game,
  }) => {
    const theme = await getExpectedTheme(game);
    const draw = await drawNativeRollTableMessage(game, uniqueName("table"));
    expect(draw.hasRollTableFlag).toBe(true);
    expect(draw.messageCountIncreased).toBe(true);

    await waitForRenderedMessage(game, draw.messageId);
    const tableDraw = game.locator(
      `#chat .chat-message[data-message-id="${draw.messageId}"]:not([hidden]) .table-draw[data-table-id="${draw.tableId}"]`,
    );
    await expect(tableDraw).toBeVisible();

    const styles = await readMessageTheme(game, draw.messageId);
    expect(styles.backgroundColor).toBe(theme.backgroundColor);
    expect(styles.color).toBe(theme.color);
    expect(styles.fontFamily).toBe(theme.fontFamily);

    const tableStyles = await tableDraw.evaluate((element) => {
      const drawStyle = getComputedStyle(element);
      const resultStyle = getComputedStyle(
        element.querySelector(".table-results > li"),
      );
      return {
        color: drawStyle.color,
        fontFamily: drawStyle.fontFamily,
        borderColor: resultStyle.borderTopColor,
      };
    });
    expect(tableStyles.color).toBe(theme.color);
    expect(tableStyles.fontFamily).toBe(theme.fontFamily);
    expect(tableStyles.borderColor).toBe(theme.borderColor);
  });

  test("a bespoke CPR roll card still uses the CPR chat theme", async ({
    page: game,
  }) => {
    const theme = await getExpectedTheme(game);
    const messageId = await game.evaluate(async () => {
      const content =
        '<div class="rollcard"><div class="cpr-block">Custom CPR card</div></div>';
      return (await ChatMessage.create({ content })).id;
    });
    await waitForRenderedMessage(game, messageId);

    const styles = await readMessageTheme(game, messageId);
    expect(styles.backgroundColor).toBe(theme.backgroundColor);
    expect(styles.color).toBe(theme.color);
    expect(styles.fontFamily).toBe(theme.fontFamily);
  });
});
