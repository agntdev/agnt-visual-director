import type { StorageAdapter } from "grammy";
import { MemorySessionStorage, defaultRedisStorage } from "../toolkit/index.js";

export interface Asset {
  imageId: string;
  telegramFileId: string;
  thumbnailUrl?: string;
  fullResUrl?: string;
  createdAt: number;
}

export interface Job {
  jobId: string;
  status: "awaiting_renderer" | "completed" | "editing";
  kind: "generation" | "edit" | "upscale";
  originalPrompt: string;
  professionalPrompt: string;
  assets: string[];
  createdAt: number;
}

export interface UserRecord {
  telegramId: number;
  sessionMemory: string[];
  pinnedCharacters: string[];
  jobs: string[];
  assets: string[];
  historyRetentionDays: number;
  characterPersistence: "ask" | "always_ask";
  sessionMemoryDays: number;
}

/**
 * Durable domain records use the toolkit's Redis-backed adapter in production.
 * The in-memory adapter is only the harness/development fallback when Redis is
 * intentionally absent; records are always addressed through explicit indexes.
 */
let storage: StorageAdapter<unknown> =
  typeof process !== "undefined" && process.env.REDIS_URL
    ? defaultRedisStorage<unknown>(process.env.REDIS_URL)
    : new MemorySessionStorage<unknown>();

/**
 * The non-Redis fallback is deliberately process-local, so a newly assembled
 * development/harness bot starts with a clean store just as it would after a
 * process restart. Redis-backed production records are never reset here.
 */
export function resetEphemeralDomainStore(): void {
  if (!(typeof process !== "undefined" && process.env.REDIS_URL)) {
    storage = new MemorySessionStorage<unknown>();
  }
}

function key(kind: string, id: string | number): string {
  return `visual:${kind}:${id}`;
}

async function read<T>(kind: string, id: string | number): Promise<T | undefined> {
  return (await storage.read(key(kind, id))) as T | undefined;
}

async function write<T>(kind: string, id: string | number, value: T): Promise<void> {
  await storage.write(key(kind, id), value);
}

export async function userFor(telegramId: number): Promise<UserRecord> {
  const found = await read<UserRecord>("user", telegramId);
  if (found) return found;
  const user: UserRecord = {
    telegramId,
    sessionMemory: [],
    pinnedCharacters: [],
    jobs: [],
    assets: [],
    historyRetentionDays: 7,
    characterPersistence: "ask",
    sessionMemoryDays: 7,
  };
  await write("user", telegramId, user);
  return user;
}

export async function saveUser(user: UserRecord): Promise<void> {
  await write("user", user.telegramId, user);
}

export async function saveJob(user: UserRecord, job: Job): Promise<void> {
  await write("job", job.jobId, job);
  user.jobs = [job.jobId, ...user.jobs].slice(0, 5);
  await saveUser(user);
}

export async function saveAsset(user: UserRecord, asset: Asset): Promise<void> {
  await write("asset", asset.imageId, asset);
  user.assets = [asset.imageId, ...user.assets].slice(0, 5);
  await saveUser(user);
}

export async function latestAsset(user: UserRecord): Promise<Asset | undefined> {
  const imageId = user.assets[0];
  return imageId ? read<Asset>("asset", imageId) : undefined;
}

export function id(prefix: string, at: number): string {
  return `${prefix}-${at.toString(36)}`;
}
