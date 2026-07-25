import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { now } from "../domain/clock.js";
import { id, saveJob, saveUser, userFor } from "../domain/store.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function isBorderline(text: string): boolean {
  return /\b(nude|nudity|sexual|gore|blood|self-harm|suicide|minor)\b/i.test(text);
}

function needsStyle(text: string): boolean {
  return text.trim().split(/\s+/).length < 6 || !/\b(photo|photograph|cinematic|editorial|illustration|3d|watercolor|anime|studio|film|poster|render)\b/i.test(text);
}

function conflicts(text: string): boolean {
  return /\b(remove|replace|change)\b[\s\S]{0,80}\b(keep|preserve)\b|\b(keep|preserve)\b[\s\S]{0,80}\b(remove|replace|change)\b/i.test(text);
}

function professionalPrompt(original: string, edit = false): string {
  const foundation = original.trim().replace(/\s+/g, " ");
  return edit
    ? `${foundation}. Preserve the source image's composition, subject identity, lighting, and unchanged details. High-definition professional finish.`
    : `${foundation}. High-definition image with deliberate composition, coherent lighting, refined detail, and a professional finish.`;
}

async function finishGeneration(ctx: Ctx, original: string): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;
  const user = await userFor(telegramId);
  const at = now();
  const refined = professionalPrompt(original);
  user.sessionMemory = [original, ...user.sessionMemory].slice(0, 5);
  await saveUser(user);
  await saveJob(user, {
    jobId: id("job", at), status: "awaiting_renderer", kind: "generation", originalPrompt: original,
    professionalPrompt: refined, assets: [], createdAt: at,
  });
  ctx.session.step = undefined;
  ctx.session.generationDraft = undefined;
  ctx.session.expiresAt = undefined;
  await ctx.reply(`Professional prompt:\n${refined}`);
  await ctx.reply(
    "Image rendering isn’t set up yet. Your prompt is saved and ready once a rendering provider is connected.",
    { reply_markup: inlineKeyboard([[inlineButton("Pin character", "character:pin"), inlineButton("Create another", "new:begin")]]) },
  );
}

async function finishEdit(ctx: Ctx, instructions: string): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;
  const user = await userFor(telegramId);
  const at = now();
  const refined = professionalPrompt(instructions, true);
  await saveJob(user, {
    jobId: id("edit", at), status: "awaiting_renderer", kind: "edit", originalPrompt: instructions,
    professionalPrompt: refined, assets: ctx.session.editAssetId ? [ctx.session.editAssetId] : [], createdAt: at,
  });
  ctx.session.step = undefined;
  ctx.session.editInstructions = undefined;
  ctx.session.expiresAt = undefined;
  await ctx.reply(`Edit direction:\n${refined}`);
  await ctx.reply(
    "Image rendering isn’t set up yet. I’ve kept your edit direction and source image ready.",
    { reply_markup: inlineKeyboard([[inlineButton("Explore alternatives", "edit:alternatives"), inlineButton("Edit another", "edit:begin")]]) },
  );
}

composer.on("message:text", async (ctx, next) => {
  const text = ctx.message.text.trim();
  if (!text || text.startsWith("/")) return next();
  if (isBorderline(text)) {
    ctx.session.step = undefined;
    await ctx.reply("I can’t help create that image. Try a safe, non-explicit direction instead.");
    return;
  }

  if (ctx.session.step === "awaiting_generation") {
    const draft = ctx.session.generationDraft ? `${ctx.session.generationDraft}. ${text}` : text;
    if (needsStyle(draft) && (ctx.session.clarificationCount ?? 0) < 2) {
      ctx.session.generationDraft = draft;
      ctx.session.clarificationCount = (ctx.session.clarificationCount ?? 0) + 1;
      ctx.session.expiresAt = now() + 5 * 60 * 1000;
      await ctx.reply("What visual style or final format should it have? For example: editorial photo, cinematic poster, or illustration.");
      return;
    }
    await finishGeneration(ctx, draft);
    return;
  }

  if (ctx.session.step === "awaiting_edit_instructions") {
    if (conflicts(text)) {
      ctx.session.step = "awaiting_edit_resolution";
      ctx.session.editInstructions = text;
      ctx.session.expiresAt = now() + 5 * 60 * 1000;
      await ctx.reply("Those directions conflict. Which change should take priority?");
      return;
    }
    await finishEdit(ctx, text);
    return;
  }

  if (ctx.session.step === "awaiting_edit_resolution") {
    await finishEdit(ctx, `${ctx.session.editInstructions ?? ""} Priority: ${text}`.trim());
    return;
  }

  // A normal text message is a fast path to creation, without requiring /new.
  if (text.includes(" ") && text.length >= 6) {
    ctx.session.step = "awaiting_generation";
    ctx.session.generationDraft = undefined;
    ctx.session.clarificationCount = 0;
    ctx.session.expiresAt = now() + 5 * 60 * 1000;
    if (needsStyle(text)) {
      ctx.session.generationDraft = text;
      ctx.session.clarificationCount = 1;
      await ctx.reply("What visual style or final format should it have? For example: editorial photo, cinematic poster, or illustration.");
    } else {
      await finishGeneration(ctx, text);
    }
    return;
  }
  return next();
});

composer.callbackQuery("edit:alternatives", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "Create two alternate visual directions from this edit?",
    { reply_markup: inlineKeyboard([[inlineButton("Create alternatives", "edit:alts:yes"), inlineButton("Keep this direction", "edit:alts:no")]]) },
  );
});

composer.callbackQuery("edit:alts:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Image rendering isn’t set up yet, so alternatives can’t be created yet.");
});

composer.callbackQuery("edit:alts:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Your current edit direction is saved.");
});

export default composer;
