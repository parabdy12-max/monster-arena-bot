/**
 * Monster Arena — 01-core/config
 * Central configuration. No balance value should be scattered through handlers.
 */

export const GAME = Object.freeze({
  id: "monster-arena",
  name: "Monster Arena",
  version: "global-v1",
  workerName: "monster-arena-bot",
  schemaVersion: 1,
  maxPlayerLevel: 30,
  maxMonsterLevel: 30,
  serverTimezone: "UTC",
});

export const CURRENCIES = Object.freeze([
  "gold",
  "food",
  "gems",
  "unique_tokens",
  "monster_parts",
  "war_tokens",
  "summon_tickets",
  "speed_tokens",
]);

export const CURRENCY_ICONS = Object.freeze({
  gold: "🪙",
  food: "🍎",
  gems: "💎",
  unique_tokens: "🔮",
  monster_parts: "🧩",
  war_tokens: "⚔️",
  summon_tickets: "🎟️",
  speed_tokens: "⏩",
});

export const ECONOMY = Object.freeze({
  initialCurrencyBalance: 0,
  foodGoldBenchmark: 10,
  transferGoldTaxBps: 1000,
  transferFoodTaxBps: 1000,
  monsterTransferGoldPerPoint: 100,
});

export const PLAYER = Object.freeze({
  initialLevel: 1,
  initialXp: 0,
  maxIslandNameLength: 24,
  initialCups: 0,
  initialWins: 0,
  initialLosses: 0,
  initialCurrentStreak: 0,
  initialBestStreak: 0,
  initialReferralCount: 0,
  initialTitles: [],
  setupStates: Object.freeze({
    ISLAND_NAME: "island_name",
    STARTER_SELECTION: "starter_selection",
    TUTORIAL: "tutorial",
    COMPLETE: "complete",
  }),
});

export const PROGRESSION = Object.freeze({
  maxLevel: 30,
  xpToNextLevel: (level) => {
    if (!Number.isInteger(level) || level < 1 || level >= 30) return 0;
    return 100 * level * level;
  },
  xpSources: Object.freeze([
    "mission",
    "achievement",
    "ranked",
    "adventure",
    "dungeon",
    "event",
    "collection",
    "hunt",
    "group",
    "team",
    "first_unlock",
  ]),
  unlocks: Object.freeze({
    1: ["home", "monsters", "island", "collection", "missions", "farm", "basic_shop"],
    2: ["breeding"],
    3: ["habitats"],
    4: ["adventure"],
    5: ["laboratory"],
    6: ["dungeon"],
    7: ["ranked"],
    8: ["hunt"],
    9: ["team"],
    10: ["transfer"],
    11: ["trader"],
    12: ["achievements"],
    13: ["temple"],
    14: ["advanced_storage_filters"],
    15: ["events"],
    16: ["relics"],
    17: ["artifacts"],
    18: ["team_war"],
    19: ["treasure_cave"],
    20: ["summon"],
    21: ["warlock_shop_expansion"],
    22: ["rune"],
    23: ["habitat_boosters"],
    24: ["minute_activities"],
    25: ["vip"],
    26: ["advanced_pve"],
    27: ["advanced_events"],
    28: ["advanced_collection"],
    29: ["endgame_missions"],
    30: ["endgame_title", "prestige_ready"],
  }),
});

export const TIMER = Object.freeze({
  states: Object.freeze(["ACTIVE", "READY", "CLAIMED", "CANCELLED"]),
});

export const DATABASE = Object.freeze({
  keyPrefix: "ma",
  keys: Object.freeze({
    player: (telegramId) => `ma:player:${String(telegramId)}`,
    monster: (instanceId) => `ma:monster:${String(instanceId)}`,
    species: (speciesId) => `ma:species:${String(speciesId)}`,
    battle: (battleId) => `ma:battle:${String(battleId)}`,
    team: (teamId) => `ma:team:${String(teamId)}`,
    group: (groupId) => `ma:group:${String(groupId)}`,
    event: (eventId) => `ma:event:${String(eventId)}`,
    timer: (ownerId, timerId) => `ma:timer:${String(ownerId)}:${String(timerId)}`,
    transaction: (transactionId) => `ma:tx:${String(transactionId)}`,
    idempotency: (key) => `ma:idempotency:${String(key)}`,
    migration: (version) => `ma:migration:${String(version)}`,
    settings: () => "ma:settings:global",
  }),
});

export const SECURITY = Object.freeze({
  idempotencyTtlSeconds: 24 * 60 * 60,
  lockTtlSeconds: 15,
  maxCallbackAgeSeconds: 10 * 60,
});

export const MAINTENANCE = Object.freeze({
  defaultEnabled: false,
  publicMessage: "🛠️ بازی در حال بروزرسانی است.\nلطفاً کمی بعد دوباره امتحان کن.",
});

export const DEFAULTS = Object.freeze({
  emptyArray: () => [],
  emptyObject: () => ({}),
});
