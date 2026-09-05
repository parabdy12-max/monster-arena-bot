/**
 * Monster Arena — 01-core/progression
 * Player XP, levels and unlocks.
 */

import { DATABASE, PROGRESSION } from "./config.js";
import { updateEntity } from "./database.js";

function assertXpAmount(amount) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("XP must be a non-negative integer.");
  }
}

export function xpRequiredForNextLevel(level) {
  return PROGRESSION.xpToNextLevel(level);
}

export function getUnlocksAtLevel(level) {
  const result = [];
  for (let current = 1; current <= level; current += 1) {
    result.push(...(PROGRESSION.unlocks[current] ?? []));
  }
  return [...new Set(result)];
}

export function isFeatureUnlocked(level, featureId) {
  return getUnlocksAtLevel(level).includes(featureId);
}

export function calculateLevelFromTotalXp(totalXp) {
  assertXpAmount(totalXp);

  let level = 1;
  let remaining = totalXp;

  while (level < PROGRESSION.maxLevel) {
    const required = xpRequiredForNextLevel(level);
    if (remaining < required) break;
    remaining -= required;
    level += 1;
  }

  return { level, xpIntoLevel: remaining, totalXp };
}

export async function addPlayerXp(env, telegramId, amount, source = "unknown") {
  assertXpAmount(amount);
  if (!PROGRESSION.xpSources.includes(source)) {
    throw new Error(`Invalid XP source: ${source}`);
  }

  return updateEntity(env.GAME_KV, DATABASE.keys.player(String(telegramId)), (player) => {
    const oldLevel = player.player_level ?? 1;
    const oldXp = player.player_xp ?? 0;
    const totalProgress = oldXp + amount;

    // The stored player_xp is progress carried into the current level,
    // not an independently reset lifetime counter.
    let level = oldLevel;
    let xp = totalProgress;
    const levelUps = [];

    while (level < PROGRESSION.maxLevel) {
      const required = xpRequiredForNextLevel(level);
      if (xp < required) break;
      xp -= required;
      level += 1;
      levelUps.push(level);
    }

    if (level === PROGRESSION.maxLevel) {
      // At cap, overflow remains stored rather than disappearing.
      xp = Math.max(0, xp);
    }

    return {
      ...player,
      player_level: level,
      player_xp: xp,
      last_xp_source: source,
      last_level_ups: levelUps,
    };
  });
}

export async function requirePlayerLevel(env, telegramId, requiredLevel) {
  const id = String(telegramId);
  return updateEntity(env.GAME_KV, DATABASE.keys.player(id), (player) => {
    if ((player.player_level ?? 1) < requiredLevel) {
      const error = new Error(`Requires Player Level ${requiredLevel}.`);
      error.code = "PLAYER_LEVEL_REQUIRED";
      throw error;
    }
    return player;
  });
}
