import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { now } from "../domain/clock.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function clearFlow(ctx: Ctx): void {
  ctx.session.step = undefined;
  ctx.session.generationDraft = undefined;
  ctx.session.clarificationCount = undefined;
  ctx.session.editAssetId = undefined;
  ctx.session.editInstructions = undefined;
  ctx.session.expiresAt = undefined;
}

composer.use(async (ctx, next) => {
  if (ctx.session.expiresAt !== undefined && now() > ctx.session.expiresAt) {
    clearFlow(ctx);
    await ctx.reply("This image request expired. Start a new one when you’re ready.", {
      reply_markup: inlineKeyboard([[inlineButton("Create image", "new:begin")]]),
    });
    return;
  }
  return next();
});

composer.command("cancel", async (ctx) => {
  clearFlow(ctx);
  await ctx.reply("Your image request was cancelled. Use /start when you’re ready.");
});

composer.callbackQuery("flow:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  clearFlow(ctx);
  await ctx.reply("Your image request was cancelled. Use /start when you’re ready.");
});

export default composer;
