import { BOARD } from './board.js';
import { DEFAULT_CARDS, sanitizeCardEffect } from './cards.js';
import type { Card, GameSettings, RuleWorld, RuleWorldConfig, RuleWorldResult, Tile } from '../types.js';

/** Stable defaults used when a world intentionally omits optional rule data. */
export const DEFAULT_WORLD_SETTINGS: Omit<GameSettings, 'seed'> = Object.freeze({
  startingCash: 1500,
  startSalary: 200,
  doubleOnExactStart: false,
  auctionsEnabled: true,
  auctionMode: 'open',
  plazaPot: false,
  noRentInHolding: false,
  evenBuild: true,
  doubleRentOnFullGroup: true,
  holdingFine: 50,
  houseSupply: 32,
  hotelSupply: 12,
  turnSeconds: 90,
  maxPlayers: 8,
});

export const DEFAULT_WORLD_TOKENS = Object.freeze([
  'rocket', 'anchor', 'lantern', 'compass', 'kite', 'acorn', 'bell', 'crown',
]);

const WORLD_NAMES: Record<string, string> = {
  standard: 'Civic Gardens',
  cyber: 'Neon Circuit',
  poker: 'The High Roller',
  pride: 'Pride Board',
  dummy: 'Block Party',
  abyss: 'The Sunken Observatory',
  lunar: 'Moonbase Commons',
  mycelium: 'Mushroom Hollow',
  oasis: 'The Saffron Caravan',
  confection: 'Sugarplum Borough',
};

/** These deliberately incomplete packages exercise and document inheritance:
 * omitted board/cards/tokens/settings resolve to the standard defaults. */
const INHERITED_WORLDS: RuleWorldConfig[] = Object.entries(WORLD_NAMES).map(([id, name]) => ({
  id,
  name,
  visualId: id,
  description: `${name} presentation with the stable standard rules.`,
}));

const CLOCKWORK_NAMES = [
  'Dawn Winder', 'Copper Mews', 'Patent Office', 'Ratchet Row', 'Spring Levy',
  'North Gearline', 'Pendulum Parade', 'Tinker\'s Chance', 'Escapement End', 'Minute Mile',
  'Repair Bay', 'Bellfounder Bend', 'Steam Dynamo', 'Horologist Hall', 'Camshaft Close',
  'East Gearline', 'Boiler Boulevard', 'Tinker\'s Chance', 'Flywheel Fields', 'Brass Bridge',
  'Grand Dial', 'Piston Place', 'Guild Ledger', 'Sprocket Street', 'Governor Gardens',
  'South Gearline', 'Chronometer Court', 'Keymaker Quay', 'Pressure Works', 'Mainspring Market',
  'Sent to Repair', 'Automaton Avenue', 'Balance Beam', 'Guild Ledger', 'Turret Terrace',
  'West Gearline', 'Tinker\'s Chance', 'Celestial Clock', 'Maintenance Due', 'Republic Rotunda',
] as const;

/**
 * Complete example package (40 spaces). It demonstrates every supported tile
 * kind, custom names/short labels, property prices/rents/build costs, taxes,
 * both card decks, token figures, a suggested visual and every starting rule.
 */
export const CLOCKWORK_WORLD_CONFIG: RuleWorldConfig = {
  id: 'clockwork',
  name: 'The Brass Republic',
  description: 'A faster, higher-stakes economy driven by the great civic clock.',
  visualId: 'clockwork',
  board: BOARD.map((source, id): Tile => {
    const name = CLOCKWORK_NAMES[id]!;
    if (source.kind === 'street') {
      const factor = 1.15;
      return {
        ...source,
        name,
        short: name.split(' ').slice(0, 2).join(' '),
        price: Math.round(source.price * factor / 5) * 5,
        rent: source.rent.map(value => Math.round(value * factor)) as unknown as typeof source.rent,
        buildCost: Math.round(source.buildCost * factor / 5) * 5,
      };
    }
    if (source.kind === 'depot' || source.kind === 'works') {
      return { ...source, name, short: name, price: source.price + 35 };
    }
    if (source.kind === 'tax') return { ...source, name, short: name, amount: source.amount + 25 };
    return { ...source, name, short: name };
  }),
  cards: [
    { id: 'clock-f01', deck: 'fortune', text: 'Your precision escapement wins the guild prize. Receive 180.', effect: { kind: 'cash', amount: 180 } },
    { id: 'clock-f02', deck: 'fortune', text: 'The express gearline carries you to North Gearline.', effect: { kind: 'move_to', tile: 5, collectStart: true } },
    { id: 'clock-f03', deck: 'fortune', text: 'A master key grants one release from the Repair Bay.', effect: { kind: 'reprieve' } },
    { id: 'clock-l01', deck: 'ledger', text: 'Replace worn teeth: pay 24 per house and 110 per hotel.', effect: { kind: 'assessment', perHouse: 24, perHotel: 110 } },
    { id: 'clock-l02', deck: 'ledger', text: 'The council resets the mechanism. Return to Dawn Winder.', effect: { kind: 'move_to', tile: 0, collectStart: true } },
    { id: 'clock-l03', deck: 'ledger', text: 'Your public clock runs late. Pay every other player 20.', effect: { kind: 'pay_each', amount: 20 } },
  ],
  tokens: ['cog', 'key', 'spring', 'hammer', 'owl', 'train', 'tower', 'star'],
  settings: {
    startingCash: 1750,
    startSalary: 240,
    doubleOnExactStart: true,
    auctionsEnabled: true,
    auctionMode: 'sealed',
    plazaPot: true,
    noRentInHolding: false,
    evenBuild: true,
    doubleRentOnFullGroup: true,
    holdingFine: 60,
    houseSupply: 36,
    hotelSupply: 12,
    turnSeconds: 75,
    maxPlayers: 8,
  },
};

export const RULE_WORLD_CONFIGS: readonly RuleWorldConfig[] = [
  ...INHERITED_WORLDS,
  CLOCKWORK_WORLD_CONFIG,
];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function finiteInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function validateTile(tile: Tile, index: number, errors: string[]): void {
  const at = `board[${index}]`;
  if (!tile || typeof tile !== 'object') { errors.push(`${at} must be a tile.`); return; }
  if (tile.id !== index) errors.push(`${at}.id must be ${index}.`);
  if (typeof tile.name !== 'string' || !tile.name.trim()) errors.push(`${at}.name is required.`);
  if (tile.short !== undefined && (typeof tile.short !== 'string' || tile.short.length > 28)) errors.push(`${at}.short must be at most 28 characters.`);
  const kinds = new Set(['start', 'street', 'depot', 'works', 'tax', 'fortune', 'ledger', 'holding', 'dispatch', 'plaza']);
  if (!kinds.has(tile.kind)) { errors.push(`${at}.kind is not supported.`); return; }
  if (tile.kind === 'street') {
    if (!['clay', 'sky', 'rose', 'amber', 'crimson', 'gold', 'forest', 'navy'].includes(tile.group)) errors.push(`${at}.group is not supported.`);
    if (!finiteInteger(tile.price, 1, 100_000)) errors.push(`${at}.price must be a positive integer.`);
    if (!finiteInteger(tile.buildCost, 1, 100_000)) errors.push(`${at}.buildCost must be a positive integer.`);
    if (!Array.isArray(tile.rent) || tile.rent.length !== 6 || tile.rent.some(value => !finiteInteger(value, 0, 1_000_000))) errors.push(`${at}.rent must contain six non-negative integers.`);
  } else if (tile.kind === 'depot' || tile.kind === 'works') {
    if (!finiteInteger(tile.price, 1, 100_000)) errors.push(`${at}.price must be a positive integer.`);
  } else if (tile.kind === 'tax') {
    if (!finiteInteger(tile.amount, 0, 100_000)) errors.push(`${at}.amount must be a non-negative integer.`);
  }
}

/** Validate untrusted configuration and fill every omitted optional field. */
export function validateRuleWorld(raw: unknown): RuleWorldResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Rule world must be an object.', errors: ['Rule world must be an object.'] };
  const config = raw as RuleWorldConfig;
  const errors: string[] = [];
  if (typeof config.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(config.id)) errors.push('id must use 1-40 lowercase letters, digits or hyphens.');
  if (typeof config.name !== 'string' || !config.name.trim() || config.name.length > 80) errors.push('name must contain 1-80 characters.');
  if (config.description !== undefined && typeof config.description !== 'string') errors.push('description must be text.');
  if (config.visualId !== undefined && (typeof config.visualId !== 'string' || !/^[a-z0-9-]{1,40}$/.test(config.visualId))) errors.push('visualId must use lowercase letters, digits or hyphens.');

  const board = clone(config.board ?? BOARD) as Tile[];
  if (!Array.isArray(board) || board.length !== 40) errors.push('board must contain exactly 40 spaces for the supported ring geometry.');
  else {
    board.forEach((tile, index) => validateTile(tile, index, errors));
    if (board[0]?.kind !== 'start') errors.push('board[0] must be the start space.');
    for (const kind of ['holding', 'dispatch'] as const) {
      if (board.filter(tile => tile.kind === kind).length !== 1) errors.push(`board needs exactly one ${kind} space.`);
    }
    for (const kind of ['fortune', 'ledger'] as const) {
      if (!board.some(tile => tile.kind === kind)) errors.push(`board needs at least one ${kind} space.`);
    }
  }

  const cards = clone(config.cards ?? DEFAULT_CARDS) as Card[];
  const normalizedCards: Card[] = [];
  if (!Array.isArray(cards) || cards.length < 2) errors.push('cards must contain at least one Fortune and one Ledger card.');
  else {
    const ids = new Set<string>();
    for (const [index, card] of cards.entries()) {
      const at = `cards[${index}]`;
      if (!card || typeof card !== 'object') { errors.push(`${at} must be a card.`); continue; }
      if (typeof card.id !== 'string' || !card.id.trim()) errors.push(`${at}.id is required.`);
      else if (ids.has(card.id)) errors.push(`${at}.id duplicates "${card.id}".`);
      else ids.add(card.id);
      if (card.deck !== 'fortune' && card.deck !== 'ledger') errors.push(`${at}.deck must be fortune or ledger.`);
      if (typeof card.text !== 'string' || !card.text.trim() || card.text.length > 240) errors.push(`${at}.text must contain 1-240 characters.`);
      const effect = sanitizeCardEffect(card.effect);
      if (typeof effect === 'string') errors.push(`${at}.effect: ${effect}`);
      else if (typeof card.id === 'string' && typeof card.text === 'string' && (card.deck === 'fortune' || card.deck === 'ledger')) {
        normalizedCards.push({ id: card.id.trim(), deck: card.deck, text: card.text.trim(), effect });
      }
      if (card.effect?.kind === 'move_to' && (!Number.isInteger(card.effect.tile) || card.effect.tile < 0 || card.effect.tile >= board.length)) errors.push(`${at}.effect points outside this board.`);
    }
    if (!cards.some(card => card.deck === 'fortune')) errors.push('cards needs at least one Fortune card.');
    if (!cards.some(card => card.deck === 'ledger')) errors.push('cards needs at least one Ledger card.');
  }

  const tokens = clone(config.tokens ?? DEFAULT_WORLD_TOKENS) as string[];
  if (!Array.isArray(tokens) || tokens.length < 2 || tokens.length > 8 || tokens.some(token => typeof token !== 'string' || !/^[a-z0-9-]{1,24}$/.test(token))) errors.push('tokens must contain 2-8 unique lowercase shape keys.');
  else if (new Set(tokens).size !== tokens.length) errors.push('tokens must be unique.');

  const suppliedSettings = { ...DEFAULT_WORLD_SETTINGS, ...(config.settings ?? {}) };
  const settings: Omit<GameSettings, 'seed'> = {
    startingCash: suppliedSettings.startingCash,
    startSalary: suppliedSettings.startSalary,
    doubleOnExactStart: suppliedSettings.doubleOnExactStart,
    auctionsEnabled: suppliedSettings.auctionsEnabled,
    auctionMode: suppliedSettings.auctionMode,
    plazaPot: suppliedSettings.plazaPot,
    noRentInHolding: suppliedSettings.noRentInHolding,
    evenBuild: suppliedSettings.evenBuild,
    doubleRentOnFullGroup: suppliedSettings.doubleRentOnFullGroup,
    holdingFine: suppliedSettings.holdingFine,
    houseSupply: suppliedSettings.houseSupply,
    hotelSupply: suppliedSettings.hotelSupply,
    turnSeconds: suppliedSettings.turnSeconds,
    maxPlayers: suppliedSettings.maxPlayers,
  };
  const numeric: Array<[keyof typeof settings, number, number]> = [
    ['startingCash', 200, 100_000], ['startSalary', 0, 10_000], ['holdingFine', 0, 5_000],
    ['houseSupply', 0, 200], ['hotelSupply', 0, 100], ['turnSeconds', 0, 600], ['maxPlayers', 2, 8],
  ];
  for (const [key, min, max] of numeric) if (!finiteInteger(settings[key], min, max)) errors.push(`settings.${key} must be an integer from ${min} to ${max}.`);
  if (settings.auctionMode !== 'open' && settings.auctionMode !== 'sealed') errors.push('settings.auctionMode must be open or sealed.');
  for (const key of ['doubleOnExactStart', 'auctionsEnabled', 'plazaPot', 'noRentInHolding', 'evenBuild', 'doubleRentOnFullGroup'] as const) {
    if (typeof settings[key] !== 'boolean') errors.push(`settings.${key} must be true or false.`);
  }

  if (errors.length) return { ok: false, error: `Invalid rule world "${typeof config.name === 'string' ? config.name : 'unnamed'}": ${errors.join(' ')}`, errors };
  return {
    ok: true,
    value: {
      id: config.id,
      name: config.name.trim(),
      description: config.description?.trim() ?? '',
      visualId: config.visualId ?? config.id,
      board,
      cards: normalizedCards,
      tokens,
      settings,
    },
  };
}

function loadBuiltIns(): RuleWorld[] {
  const worlds: RuleWorld[] = [];
  for (const config of RULE_WORLD_CONFIGS) {
    const result = validateRuleWorld(config);
    if (!result.ok) throw new Error(result.error);
    worlds.push(result.value);
  }
  return worlds;
}

export const RULE_WORLDS: readonly RuleWorld[] = Object.freeze(loadBuiltIns());
export const DEFAULT_RULE_WORLD = RULE_WORLDS.find(world => world.id === 'standard')!;

export function ruleWorldById(id: string | null | undefined): RuleWorld | undefined {
  return RULE_WORLDS.find(world => world.id === id);
}
