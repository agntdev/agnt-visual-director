import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { saveUser, userFor } from "../domain/store.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Storage settings", data: "settings:show", order: 50 });

const composer = new Composer<Ctx>();

function settingsKeyboard() {
  return inlineKeyboard([
    [inlineButton("Keep history 7 days", "settings:history:7"), inlineButton("Keep history 30 days", "settings:history:30")],
    [inlineButton("Memory 7 days", "settings:memory:7"), inlineButton("Memory 30 days", "settings:memory:30")],
    [inlineButton("Always ask before pinning", "settings:characters:ask")],
    [inlineButton("Back to menu", "menu:main")],
  ]);
}

composer.callbackQuery("settings:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Choose how long to keep your image history and session memory. Character details are always saved only with your consent.", {
    reply_markup: settingsKeyboard(),
  });
});

composer.callbackQuery(/^settings:history:(7|30)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from) return;
  const user = await userFor(ctx.from.id);
  user.historyRetentionDays = Number(ctx.match[1]);
  await saveUser(user);
  await ctx.reply(`Image history will be kept for ${user.historyRetentionDays} days.`);
});

composer.callbackQuery(/^settings:memory:(7|30)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from) return;
  const user = await userFor(ctx.from.id);
  user.sessionMemoryDays = Number(ctx.match[1]);
  await saveUser(user);
  await ctx.reply(`Session memory will be kept for ${user.sessionMemoryDays} days.`);
});

composer.callbackQuery("settings:characters:ask", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from) return;
  const user = await userFor(ctx.from.id);
  user.characterPersistence = "always_ask";
  await saveUser(user);
  await ctx.reply("I’ll always ask before saving character details.");
});

export default composer;
