import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { now } from "../domain/clock.js";
import { id, saveAsset, userFor } from "../domain/store.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "Edit image", data: "edit:begin", order: 20 });

const composer = new Composer<Ctx>();
const back = inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]);

async function begin(ctx: Ctx): Promise<void> {
  ctx.session.step = "awaiting_edit_upload";
  ctx.session.editAssetId = undefined;
  ctx.session.expiresAt = now() + 5 * 60 * 1000;
  await ctx.reply("Upload an image, then I’ll ask what you want to change.", { reply_markup: back });
}

composer.command("edit", begin);
composer.callbackQuery("edit:begin", async (ctx) => {
  await ctx.answerCallbackQuery();
  await begin(ctx);
});

async function receiveImage(ctx: Ctx, fileId: string, size: number | undefined): Promise<void> {
  if (size !== undefined && size > 20 * 1024 * 1024) {
    await ctx.reply("That image is too large to edit here. Upload a file under 20 MB.");
    return;
  }
  const telegramId = ctx.from?.id;
  if (!telegramId) return;
  const user = await userFor(telegramId);
  const at = now();
  const imageId = id("asset", at);
  await saveAsset(user, { imageId, telegramFileId: fileId, createdAt: at });
  ctx.session.step = "awaiting_edit_instructions";
  ctx.session.editAssetId = imageId;
  ctx.session.expiresAt = now() + 5 * 60 * 1000;
  await ctx.reply("Image received. What should change? I’ll preserve everything else.");
}

composer.on("message:photo", async (ctx) => {
  const photo = ctx.message.photo.at(-1);
  if (photo) await receiveImage(ctx, photo.file_id, photo.file_size);
});

composer.on("message:document", async (ctx) => {
  const document = ctx.message.document;
  if (!document.mime_type?.startsWith("image/")) {
    if (ctx.session.step === "awaiting_edit_upload") {
      await ctx.reply("Upload an image file in PNG, JPEG, or WebP format.");
    }
    return;
  }
  await receiveImage(ctx, document.file_id, document.file_size);
});

export default composer;
