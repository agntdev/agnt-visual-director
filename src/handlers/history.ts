import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { userFor } from "../domain/store.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Image history", data: "history:show", order: 40 });

const composer = new Composer<Ctx>();

composer.callbackQuery("history:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from) return;
  const user = await userFor(ctx.from.id);
  if (user.jobs.length === 0) {
    await ctx.reply("No image history yet — create an image to begin.", {
      reply_markup: inlineKeyboard([[inlineButton("Create image", "new:begin")]]),
    });
    return;
  }
  await ctx.reply(`You have ${user.jobs.length} recent image request${user.jobs.length === 1 ? "" : "s"}. History keeps thumbnails only.`, {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

export default composer;
