import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { now } from "../domain/clock.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Create image", data: "new:begin", order: 10 });

const composer = new Composer<Ctx>();
const promptKeyboard = inlineKeyboard([[inlineButton("Cancel", "flow:cancel")]]);

async function begin(ctx: Ctx): Promise<void> {
  ctx.session.step = "awaiting_generation";
  ctx.session.generationDraft = undefined;
  ctx.session.clarificationCount = 0;
  ctx.session.expiresAt = now() + 5 * 60 * 1000;
  await ctx.reply(
    "Describe the image you want to create. Include the subject, setting, and style if you know them.",
    { reply_markup: promptKeyboard },
  );
}

// Kept as the documented power-user shortcut; the main menu is the primary path.
composer.command("new", begin);
composer.callbackQuery("new:begin", async (ctx) => {
  await ctx.answerCallbackQuery();
  await begin(ctx);
});

export default composer;
