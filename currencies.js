/**
 * Monster Arena — 01-core/currencies
 * All currency mutations belong here.
 */

import { CURRENCIES, ECONOMY, DATABASE } from "./config.js";
import { getEntity, updateEntity, saveIdempotencyResult } from "./database.js";

function assertCurrency(currency) {
  if (!CURRENCIES.includes(currency)) {
    throw new Error(`Unknown currency: ${currency}`);
  }
}

function assertAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Currency amount must be a positive integer.");
  }
}

export function normalizeBalances(player) {
  const next = { ...player };
  for (const currency of CURRENCIES) {
    const value = next[currency];
    next[currency] = Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
  return next;
}

export async function getBalance(env, telegramId, currency) {
  assertCurrency(currency);
  const player = await getEntity(env.GAME_KV, DATABASE.keys.player(String(telegramId)));
  if (!player) throw new Error("Player not found.");
  return player[currency] ?? 0;
}

export async function creditCurrency(env, telegramId, currency, amount, meta = {}) {
  assertCurrency(currency);
  assertAmount(amount);

  return updateEntity(env.GAME_KV, DATABASE.keys.player(String(telegramId)), (player) => {
    const current = player[currency] ?? 0;
    const next = current + amount;
    if (!Number.isSafeInteger(next)) throw new Error("Currency balance overflow.");
    return { ...normalizeBalances(player), [currency]: next };
  });
}

export async function debitCurrency(env, telegramId, currency, amount, meta = {}) {
  assertCurrency(currency);
  assertAmount(amount);

  return updateEntity(env.GAME_KV, DATABASE.keys.player(String(telegramId)), (player) => {
    const current = player[currency] ?? 0;
    if (current < amount) {
      const error = new Error(`Insufficient ${currency}.`);
      error.code = "INSUFFICIENT_CURRENCY";
      throw error;
    }
    return { ...normalizeBalances(player), [currency]: current - amount };
  });
}

export function calculateTransferTax(currency, amount) {
  assertCurrency(currency);
  assertAmount(amount);

  if (currency === "gold" || currency === "food") {
    return Math.floor((amount * ECONOMY.transferGoldTaxBps) / 10_000);
  }

  return 0;
}

/**
 * Transfer semantics from the canonical spec:
 * Gold/Food: receiver gets exactly `amount`; sender pays amount + 10% tax.
 *
 * This operation uses the core persistence layer's version checks. For
 * cross-player atomicity at deployment scale, the infrastructure layer must
 * place this mutation behind one authoritative transactional coordinator.
 */
export async function transferCurrency(env, senderId, receiverId, currency, amount, idempotencyKey) {
  assertCurrency(currency);
  assertAmount(amount);

  const sender = String(senderId);
  const receiver = String(receiverId);
  if (sender === receiver) throw new Error("Self-transfer is not allowed.");
  if (!idempotencyKey) throw new Error("Idempotency key is required.");

  const previous = await getEntity(env.GAME_KV, DATABASE.keys.idempotency(idempotencyKey));
  if (previous) return previous.result;

  const tax = calculateTransferTax(currency, amount);
  const totalDebit = amount + tax;

  const senderAfter = await debitCurrency(env, sender, currency, totalDebit, {
    type: "TRANSFER",
    idempotencyKey,
  });

  try {
    const receiverAfter = await creditCurrency(env, receiver, currency, amount, {
      type: "TRANSFER",
      idempotencyKey,
    });

    const result = {
      currency,
      amount,
      tax,
      sender_total_debit: totalDebit,
      sender_balance: senderAfter[currency],
      receiver_balance: receiverAfter[currency],
    };

    await saveIdempotencyResult(env.GAME_KV, idempotencyKey, result);
    return result;
  } catch (error) {
    // Compensating credit prevents permanent loss if the receiver write fails.
    // The operation is intentionally surfaced as a transaction failure.
    await creditCurrency(env, sender, currency, totalDebit, {
      type: "TRANSFER_COMPENSATION",
      idempotencyKey,
    });
    throw error;
  }
}
