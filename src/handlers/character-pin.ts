import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { saveUser, userFor } from "../domain/store.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Pin character", data: "character:pin", order: 30 });

const composer = new Composer<Ctx>();

composer.callbackQuery("character:pin", async (ctx) => {
  await ctx.answerCallbackQuery();
  const user = ctx.from ? await userFor(ctx.from.id) : undefined;
  const details = user?.sessionMemory[0];
  if (!details) {
    await ctx.reply("No character details yet. Create an image with a character first.");
    return;
  }
  await ctx.reply(
    "Save the character details from your latest prompt for future edits?",
    { reply_markup: inlineKeyboard([[inlineButton("Save character", "character:yes"), inlineButton("Don’t save", "character:no")]]) },
  );
});

composer.callbackQuery("character:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from) return;
  const user = await userFor(ctx.from.id);
  const details = user.sessionMemory[0];
  if (!details) {
    await ctx.reply("There are no character details to save yet.");
    return;
  }
  user.pinnedCharacters = [details, ...user.pinnedCharacters.filter((item) => item !== details)].slice(0, 5);
  await saveUser(user);
  await ctx.reply("Character details saved for your future edits.");
});

composer.callbackQuery("character:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Character details weren’t saved.");
});

export default composer;
