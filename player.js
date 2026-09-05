/**
 * Monster Arena — 01-core/player
 * Player identity, account creation, Island Name and profile-ready state.
 */

import { DATABASE, GAME, PLAYER, CURRENCIES, ECONOMY } from "./config.js";
import { createEntity, getEntity, updateEntity } from "./database.js";

const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/u;
const RESERVED = new Set([
  "admin", "administrator", "system", "moderator", "mod", "support",
  "monster arena", "monsterarena", "bot", "telegram",
]);

export function normalizeTelegramId(value) {
  const id = String(value ?? "").trim();
  if (!/^\d{1,30}$/.test(id)) {
    throw new TypeError("Invalid Telegram User ID.");
  }
  return id;
}

export function validateIslandName(input) {
  const name = String(input ?? "").normalize("NFC").trim();

  if (!name) return { ok: false, code: "EMPTY", message: "🏝️ اسم جزیره نمی‌تونه خالی باشه." };
  if (name.length > PLAYER.maxIslandNameLength) {
    return { ok: false, code: "TOO_LONG", message: `🏝️ اسم جزیره باید حداکثر ${PLAYER.maxIslandNameLength} کاراکتر باشه.` };
  }
  if (CONTROL_CHARS.test(name)) {
    return { ok: false, code: "CONTROL_CHAR", message: "⚠️ این اسم قابل استفاده نیست." };
  }
  if (RESERVED.has(name.toLocaleLowerCase())) {
    return { ok: false, code: "RESERVED", message: "⚠️ این اسم قابل استفاده نیست." };
  }

  return { ok: true, value: name };
}

function zeroCurrencies() {
  return Object.fromEntries(CURRENCIES.map((currency) => [currency, ECONOMY.initialCurrencyBalance]));
}

export function buildNewPlayer(telegramId, now = new Date().toISOString()) {
  const id = normalizeTelegramId(telegramId);

  return {
    telegram_id: id,
    island_name: null,
    player_level: PLAYER.initialLevel,
    player_xp: PLAYER.initialXp,
    ...zeroCurrencies(),
    cups: PLAYER.initialCups,
    wins: PLAYER.initialWins,
    losses: PLAYER.initialLosses,
    current_streak: PLAYER.initialCurrentStreak,
    best_streak: PLAYER.initialBestStreak,
    titles: [...PLAYER.initialTitles],
    active_title: null,
    referral_count: PLAYER.initialReferralCount,
    monster_count: 0,
    monster_points: 0,
    strongest_monster_id: null,
    team_id: null,
    setup_state: PLAYER.setupStates.ISLAND_NAME,
    starter_selection: [],
    tutorial_state: "pending",
    created_at: now,
    updated_at: now,
    data_version: GAME.schemaVersion,
  };
}

export async function getPlayerById(env, telegramId) {
  return getEntity(env.GAME_KV, DATABASE.keys.player(normalizeTelegramId(telegramId)));
}

export async function createPlayer(env, telegramId, now = new Date().toISOString()) {
  const player = buildNewPlayer(telegramId, now);
  return createEntity(env.GAME_KV, DATABASE.keys.player(player.telegram_id), player);
}

export async function ensurePlayer(env, telegramId) {
  const id = normalizeTelegramId(telegramId);
  const existing = await getPlayerById(env, id);
  return existing ?? createPlayer(env, id);
}

export async function setIslandName(env, telegramId, rawName) {
  const id = normalizeTelegramId(telegramId);
  const validation = validateIslandName(rawName);
  if (!validation.ok) {
    const error = new Error(validation.message);
    error.code = validation.code;
    throw error;
  }

  return updateEntity(env.GAME_KV, DATABASE.keys.player(id), (player) => {
    if (player.setup_state === PLAYER.setupStates.COMPLETE) {
      // Rename is still allowed through the same validated operation.
    }

    return {
      ...player,
      island_name: validation.value,
      setup_state:
        player.setup_state === PLAYER.setupStates.ISLAND_NAME
          ? PLAYER.setupStates.STARTER_SELECTION
          : player.setup_state,
    };
  });
}

export async function setStarterSelection(env, telegramId, starterSpeciesIds) {
  const id = normalizeTelegramId(telegramId);
  if (!Array.isArray(starterSpeciesIds) || starterSpeciesIds.length !== 3) {
    throw new Error("Starter selection must contain exactly 3 monsters.");
  }

  const unique = [...new Set(starterSpeciesIds.map(String))];
  if (unique.length !== 3) {
    throw new Error("Starter selection cannot contain duplicates.");
  }

  return updateEntity(env.GAME_KV, DATABASE.keys.player(id), (player) => {
    if (!player.island_name) throw new Error("Island Name must be set first.");
    if (player.setup_state !== PLAYER.setupStates.STARTER_SELECTION) {
      throw new Error("Starter selection is not currently available.");
    }

    return {
      ...player,
      starter_selection: unique,
      setup_state: PLAYER.setupStates.TUTORIAL,
    };
  });
}

export async function finishInitialTutorial(env, telegramId) {
  const id = normalizeTelegramId(telegramId);
  return updateEntity(env.GAME_KV, DATABASE.keys.player(id), (player) => {
    if (player.setup_state !== PLAYER.setupStates.TUTORIAL) {
      throw new Error("Initial tutorial is not currently active.");
    }

    return {
      ...player,
      tutorial_state: "complete",
      setup_state: PLAYER.setupStates.COMPLETE,
    };
  });
}
