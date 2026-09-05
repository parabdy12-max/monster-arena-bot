/**
 * Monster Arena — 01-core/timers
 * Authoritative server-timestamp timers.
 */

import { DATABASE, TIMER } from "./config.js";
import { createEntity, getEntity, updateEntity } from "./database.js";

function assertTimestamp(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a Unix timestamp in milliseconds.`);
  }
}

function assertState(state) {
  if (!TIMER.states.includes(state)) {
    throw new Error(`Invalid timer state: ${state}`);
  }
}

export function serverNowMs() {
  return Date.now();
}

export function getRemainingMs(timer, nowMs = serverNowMs()) {
  if (!timer) return 0;
  assertTimestamp(timer.end_timestamp, "end_timestamp");
  return Math.max(0, timer.end_timestamp - nowMs);
}

export function getTimerState(timer, nowMs = serverNowMs()) {
  if (!timer) throw new Error("Timer not found.");
  assertState(timer.state);

  if (timer.state === "ACTIVE" && timer.end_timestamp <= nowMs) return "READY";
  return timer.state;
}

export async function createTimer(env, { ownerId, timerId, type, durationMs, metadata = {} }) {
  if (!String(ownerId)) throw new Error("ownerId is required.");
  if (!String(timerId)) throw new Error("timerId is required.");
  if (!String(type)) throw new Error("timer type is required.");
  if (!Number.isInteger(durationMs) || durationMs <= 0) {
    throw new Error("Timer duration must be a positive integer.");
  }

  const start = serverNowMs();
  const timer = {
    timer_id: String(timerId),
    owner_id: String(ownerId),
    type: String(type),
    start_timestamp: start,
    end_timestamp: start + durationMs,
    state: "ACTIVE",
    metadata,
  };

  return createEntity(env.GAME_KV, DATABASE.keys.timer(ownerId, timerId), timer);
}

export async function getTimer(env, ownerId, timerId) {
  const timer = await getEntity(env.GAME_KV, DATABASE.keys.timer(ownerId, timerId));
  if (!timer) return null;

  const state = getTimerState(timer);
  if (state !== timer.state) {
    return updateEntity(env.GAME_KV, DATABASE.keys.timer(ownerId, timerId), (current) => ({
      ...current,
      state: "READY",
    }));
  }

  return timer;
}

export async function speedUpTimer(env, ownerId, timerId, reductionMs) {
  if (!Number.isInteger(reductionMs) || reductionMs <= 0) {
    throw new Error("Timer reduction must be a positive integer.");
  }

  return updateEntity(env.GAME_KV, DATABASE.keys.timer(ownerId, timerId), (timer) => {
    const state = getTimerState(timer);
    if (state === "READY" || state === "CLAIMED" || state === "CANCELLED") {
      const error = new Error("⏳ این Timer دیگه نیاز به Speed Up نداره.");
      error.code = "TIMER_NOT_ACTIVE";
      throw error;
    }

    const now = serverNowMs();
    const nextEnd = Math.max(now, timer.end_timestamp - reductionMs);

    return {
      ...timer,
      end_timestamp: nextEnd,
      state: nextEnd <= now ? "READY" : "ACTIVE",
    };
  });
}

export async function claimTimer(env, ownerId, timerId) {
  return updateEntity(env.GAME_KV, DATABASE.keys.timer(ownerId, timerId), (timer) => {
    const state = getTimerState(timer);
    if (state !== "READY") {
      const error = new Error("⏳ هنوز آماده نشده!");
      error.code = "TIMER_NOT_READY";
      throw error;
    }

    return {
      ...timer,
      state: "CLAIMED",
      claimed_at: new Date().toISOString(),
    };
  });
}

export async function cancelTimer(env, ownerId, timerId) {
  return updateEntity(env.GAME_KV, DATABASE.keys.timer(ownerId, timerId), (timer) => {
    if (getTimerState(timer) === "CLAIMED") {
      throw new Error("A claimed timer cannot be cancelled.");
    }
    return { ...timer, state: "CANCELLED" };
  });
}
