/**
 * Monster Arena — 01-core/database
 * Cloudflare KV persistence adapter.
 *
 * KV is the persistence layer. Business rules must not call KV directly.
 * Each mutable entity carries a version for optimistic consistency checks.
 */

import { DATABASE, GAME } from "./config.js";

export class DatabaseError extends Error {
  constructor(code, message, cause = undefined) {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
    this.cause = cause;
  }
}

function assertKv(kv) {
  if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function") {
    throw new DatabaseError("KV_UNAVAILABLE", "Persistent storage is unavailable.");
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export async function readJson(kv, key, options = {}) {
  assertKv(kv);
  try {
    return await kv.get(key, { type: "json", ...options });
  } catch (error) {
    throw new DatabaseError("KV_READ_FAILED", "Could not read persistent data.", error);
  }
}

export async function writeJson(kv, key, value, options = {}) {
  assertKv(kv);
  try {
    await kv.put(key, JSON.stringify(value), options);
  } catch (error) {
    throw new DatabaseError("KV_WRITE_FAILED", "Could not write persistent data.", error);
  }
}

export async function deleteKey(kv, key) {
  assertKv(kv);
  try {
    await kv.delete(key);
  } catch (error) {
    throw new DatabaseError("KV_DELETE_FAILED", "Could not delete persistent data.", error);
  }
}

export async function getEntity(kv, key) {
  return readJson(kv, key);
}

export async function putEntity(kv, key, entity, { expectedVersion = undefined, expirationTtl = undefined } = {}) {
  const current = await readJson(kv, key);

  if (expectedVersion !== undefined) {
    const currentVersion = current?.version ?? 0;
    if (currentVersion !== expectedVersion) {
      throw new DatabaseError("VERSION_CONFLICT", "The data changed before this operation completed.");
    }
  }

  const next = clone(entity);
  next.version = (current?.version ?? 0) + 1;
  next.updated_at = new Date().toISOString();

  await writeJson(kv, key, next, expirationTtl ? { expirationTtl } : {});
  return next;
}

export async function createEntity(kv, key, entity, { expirationTtl = undefined } = {}) {
  const existing = await readJson(kv, key);
  if (existing !== null) {
    throw new DatabaseError("ALREADY_EXISTS", "The requested data already exists.");
  }

  const now = new Date().toISOString();
  const record = {
    ...clone(entity),
    version: 1,
    created_at: entity.created_at ?? now,
    updated_at: entity.updated_at ?? now,
    data_version: entity.data_version ?? GAME.schemaVersion,
  };

  await writeJson(kv, key, record, expirationTtl ? { expirationTtl } : {});
  return record;
}

export async function updateEntity(kv, key, updater, { maxRetries = 3 } = {}) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const current = await readJson(kv, key);
    if (current === null) {
      throw new DatabaseError("NOT_FOUND", "The requested data does not exist.");
    }

    const proposed = await updater(clone(current));
    if (!proposed || typeof proposed !== "object") {
      throw new DatabaseError("INVALID_UPDATE", "The update did not return valid data.");
    }

    const expectedVersion = current.version ?? 1;
    const latest = await readJson(kv, key);
    if ((latest?.version ?? 0) !== expectedVersion) continue;

    const next = {
      ...proposed,
      version: expectedVersion + 1,
      created_at: current.created_at,
      updated_at: new Date().toISOString(),
      data_version: current.data_version ?? GAME.schemaVersion,
    };

    await writeJson(kv, key, next);
    const verify = await readJson(kv, key);
    if (verify?.version === next.version && verify?.updated_at === next.updated_at) {
      return verify;
    }
  }

  throw new DatabaseError("CONCURRENCY_CONFLICT", "The operation could not be safely committed. Please retry.");
}

export async function getPlayer(kv, telegramId) {
  return getEntity(kv, DATABASE.keys.player(telegramId));
}

export async function savePlayer(kv, player, options = {}) {
  return putEntity(kv, DATABASE.keys.player(player.telegram_id), player, options);
}

export async function transactionExists(kv, transactionId) {
  return (await readJson(kv, DATABASE.keys.transaction(transactionId))) !== null;
}

export async function recordTransaction(kv, transaction) {
  return createEntity(kv, DATABASE.keys.transaction(transaction.transaction_id), transaction);
}

export async function getIdempotencyResult(kv, key) {
  return readJson(kv, DATABASE.keys.idempotency(key));
}

export async function saveIdempotencyResult(kv, key, result, ttlSeconds = 86400) {
  return writeJson(
    kv,
    DATABASE.keys.idempotency(key),
    { key, result: clone(result), created_at: new Date().toISOString() },
    { expirationTtl: ttlSeconds }
  );
}

export function nowMs() {
  return Date.now();
}

export function isoNow() {
  return new Date().toISOString();
}
