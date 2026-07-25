import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { latestAsset, userFor } from "../domain/store.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("upscale:request", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from) return;
  const asset = await latestAsset(await userFor(ctx.from.id));
  if (!asset) {
    await ctx.reply(
      "There’s no generated image to upscale yet. Create an image first.",
      { reply_markup: inlineKeyboard([[inlineButton("Create image", "new:begin")]]) },
    );
    return;
  }
  if (!asset.fullResUrl) {
    await ctx.reply("4K rendering isn’t set up yet. Your source image remains saved for when it is available.");
    return;
  }
  await ctx.reply("Your 4K image is ready to download.", {
    reply_markup: inlineKeyboard([[{ text: "Download 4K", url: asset.fullResUrl }]]),
  });
});

export default composer;
