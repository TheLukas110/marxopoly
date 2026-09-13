import { BOARD_SIZE, tileIdByName } from './board.js';
import type { Card, CardEffect, CardInput } from '../types.js';

/**
 * The two card decks — Fortune and Ledger.
 *
 * WHAT A CARD IS
 *   text   – the sentence the player reads when the card is drawn.
 *   effect – what the game actually does. Built from the small helpers below,
 *            so every card reads like a sentence too.
 *
 * TO ADD OR CHANGE A CARD
 *   Edit the FORTUNE_CARDS / LEDGER_CARDS lists at the bottom. Each row is:
 *
 *       card('<id>', '<player-facing text>', <effect>)
 *
 *   Keep ids unique and in the `f##` / `l##` style. The decks may hold any
 *   number of cards (they reshuffle from these lists when a pile runs out).
 *
 * REFERRING TO A STREET
 *   advanceTo() takes the tile's name exactly as it appears on the board, e.g.
 *   advanceTo('Lantern Quay'). Or use one of the aliases below — add a line there
 *   for any new street a card should send players to. Either way a name that is
 *   not on the board throws at startup, so cards never drift out of sync with
 *   data/board.ts.
 */

// ---------------------------------------------------------------------------
// Effect helpers — one per kind of thing a card can do. Money is in game cash.
// ---------------------------------------------------------------------------

/** Receive `amount` from the bank. */
const collect = (amount: number): CardEffect => ({ kind: 'cash', amount });

/** Pay `amount` to the bank. */
const pay = (amount: number): CardEffect => ({ kind: 'cash', amount: -amount });

/** Every other player pays you `amount`. */
const collectFromEveryone = (amount: number): CardEffect => ({ kind: 'collect_each', amount });

/** You pay every other player `amount`. */
const payEveryone = (amount: number): CardEffect => ({ kind: 'pay_each', amount });

/** Jump straight to a tile, named as it appears on the board ('Lantern Quay') or by
 *  index. You still draw salary if you pass Start unless `collectStart: false`
 *  is passed (an unpaid transfer). An unknown name throws at load. */
const advanceTo = (
  tile: string | number,
  opts: { collectStart?: boolean } = {},
): CardEffect => ({
  kind: 'move_to',
  tile: typeof tile === 'number' ? tile : tileIdByName(tile),
  collectStart: opts.collectStart ?? true,
});

/** Step forward (positive) or back (negative) along the board. */
const moveBy = (steps: number): CardEffect => ({ kind: 'move_by', steps });

/** Advance to the next depot/works and pay the owner `multiplier`× the usual toll. */
const advanceToNearest = (target: 'depot' | 'works', multiplier: number): CardEffect => ({
  kind: 'advance_nearest',
  target,
  multiplier,
});

/** Go to the holding yard immediately, without collecting salary. */
const goToHoldingYard = (): CardEffect => ({ kind: 'goto_holding' });

/** A keep-until-needed card that buys the holder out of the holding yard later. */
const reprieveCard = (): CardEffect => ({ kind: 'reprieve' });

/** Pay a repair bill scaled by what you have built. */
const repairBill = (perHouse: number, perHotel: number): CardEffect => ({
  kind: 'assessment',
  perHouse,
  perHotel,
});

// ---------------------------------------------------------------------------
// Street aliases — looked up in data/board.ts by name, so a card and the board
// can never disagree. Add a line for any new street a card points at (or pass
// the name straight to advanceTo, e.g. advanceTo('Lantern Quay')). A name that is
// not on the board throws the moment the game loads.
// ---------------------------------------------------------------------------

const START = tileIdByName('Start');
const LANTERN_QUAY = tileIdByName('Lantern Quay');

// ---------------------------------------------------------------------------
// Deck assembly
// ---------------------------------------------------------------------------

interface CardRow {
  id: string;
  text: string;
  effect: CardEffect;
}

const card = (id: string, text: string, effect: CardEffect): CardRow => ({ id, text, effect });

const buildDeck = (deck: 'fortune' | 'ledger', rows: CardRow[]): readonly Card[] =>
  rows.map((row) => ({ ...row, deck }));

// ---------------------------------------------------------------------------
// The cards
// ---------------------------------------------------------------------------

export const FORTUNE_CARDS: readonly Card[] = buildDeck('fortune', [
  card('f01', 'Your rooftop seed nursery supplies the whole district. Receive 135.', collect(135)),
  card('f02', 'The night ferry brings you to Lantern Quay. Travel there, collecting salary if the route crosses Start.', advanceTo(LANTERN_QUAY)),
  card('f03', 'A footbridge opens beside your workshop. Move forward two spaces.', moveBy(2)),
  card('f04', 'The mural crew borrows your scaffolding. Each other player pays you 25.', collectFromEveryone(25)),
  card('f05', 'A rainstorm damages the shared tool library. Contribute 65 to repairs.', pay(65)),
  card('f06', 'A canal towpath is closed for nesting birds. Move back two spaces.', moveBy(-2)),
  card('f07', 'You underwrite the neighbourhood lantern walk. Give each other player 30.', payEveryone(30)),
  card('f08', 'The insulation team visits your buildings. Pay 18 per house and 85 per hotel.', repairBill(18, 85)),
  card('f09', 'Your surplus solar power lights the evening market. Receive 95.', collect(95)),
  card('f10', 'A cargo cycle is ready at the next exchange. Advance to the next depot; any toll is the usual amount.', advanceToNearest('depot', 1)),
  card('f11', 'The district mediator reserves you an appointment. Keep this pass to leave the holding yard on a later turn.', reprieveCard()),
  card('f12', 'A repair cafe orders your spare components. Receive 55.', collect(55)),
]);

export const LEDGER_CARDS: readonly Card[] = buildDeck('ledger', [
  card('l01', 'The cooperative buys your composting design. Receive 165.', collect(165)),
  card('l02', 'A new district survey begins at Start. Travel there and receive your salary.', advanceTo(START)),
  card('l03', 'Your stall needs a new weather canopy. Pay 70.', pay(70)),
  card('l04', 'The archive rents your collection of old maps. Receive 85.', collect(85)),
  card('l05', 'A neighbourhood kitchen orders a month of herbs. Receive 115.', collect(115)),
  card('l06', 'The canal cooperative returns your equipment deposit. Receive 125.', collect(125)),
  card('l07', 'Your delivery permit needs a signature. Transfer directly to the holding yard without salary.', goToHoldingYard()),
  card('l08', 'The water-saving retrofit is due. Pay 22 per house and 95 per hotel.', repairBill(22, 95)),
  card('l09', 'You coordinate a shared bulk order. Each other player reimburses you 15.', collectFromEveryone(15)),
  card('l10', 'You fund seedlings for the public orchard. Pay 105.', pay(105)),
  card('l11', 'Your permit paperwork is pre-approved. Keep this pass to leave the holding yard on a later turn.', reprieveCard()),
  card('l12', 'A survey crew lends you a shortcut. Move forward one space.', moveBy(1)),
]);

export const ALL_CARDS: readonly Card[] = [...FORTUNE_CARDS, ...LEDGER_CARDS];

/** The default deck contents a fresh game starts with (mutable copy). */
export const DEFAULT_CARDS: readonly Card[] = ALL_CARDS;

// Fail fast on a copy-paste slip rather than silently dropping a card.
assertUniqueIds(ALL_CARDS);

function assertUniqueIds(cards: readonly Card[]): void {
  const seen = new Set<string>();
  for (const c of cards) {
    if (seen.has(c.id)) throw new Error(`cards.ts: duplicate card id "${c.id}" — ids must be unique`);
    seen.add(c.id);
  }
}

const CARD_INDEX = new Map(ALL_CARDS.map((c) => [c.id, c]));

export function cardById(id: string): Card {
  const found = CARD_INDEX.get(id);
  if (!found) throw new Error(`Unknown card ${id}`);
  return found;
}

// ---------------------------------------------------------------------------
// Validation — for host-authored cards coming off the wire
// ---------------------------------------------------------------------------

const CARD_MAX_TEXT = 240;
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;
const clampAmount = (n: number): number => Math.max(-100_000, Math.min(100_000, n));

/** Turn an untrusted `{ deck, text, effect }` payload into a clean effect, or
 *  return an error string. Keeps every custom card safe for the engine. */
export function sanitizeCardEffect(raw: unknown): CardEffect | string {
  if (!raw || typeof raw !== 'object') return 'Missing effect.';
  const e = raw as Record<string, unknown>;
  switch (e.kind) {
    case 'cash':
    case 'collect_each':
    case 'pay_each': {
      const amount = num(e.amount);
      if (amount === null) return 'Amount must be a number.';
      if (e.kind !== 'cash' && amount < 0) return 'Amount must be positive.';
      return { kind: e.kind, amount: clampAmount(amount) };
    }
    case 'move_to': {
      const tile = num(e.tile);
      if (tile === null || tile < 0 || tile >= BOARD_SIZE) return 'Pick a destination tile.';
      return { kind: 'move_to', tile, collectStart: e.collectStart !== false };
    }
    case 'move_by': {
      const steps = num(e.steps);
      if (steps === null || steps === 0 || Math.abs(steps) > 39) return 'Steps must be between -39 and 39.';
      return { kind: 'move_by', steps };
    }
    case 'advance_nearest': {
      if (e.target !== 'depot' && e.target !== 'works') return 'Target must be depot or works.';
      const multiplier = num(e.multiplier);
      if (multiplier === null || multiplier < 1 || multiplier > 50) return 'Multiplier must be 1–50.';
      return { kind: 'advance_nearest', target: e.target, multiplier };
    }
    case 'goto_holding':
      return { kind: 'goto_holding' };
    case 'reprieve':
      return { kind: 'reprieve' };
    case 'assessment': {
      const perHouse = num(e.perHouse);
      const perHotel = num(e.perHotel);
      if (perHouse === null || perHotel === null || perHouse < 0 || perHotel < 0) {
        return 'House and hotel charges must be positive numbers.';
      }
      return { kind: 'assessment', perHouse: clampAmount(perHouse), perHotel: clampAmount(perHotel) };
    }
    default:
      return 'Unknown effect type.';
  }
}

export function sanitizeCardInput(raw: unknown): CardInput | string {
  if (!raw || typeof raw !== 'object') return 'Missing card.';
  const r = raw as Record<string, unknown>;
  if (r.deck !== 'fortune' && r.deck !== 'ledger') return 'Deck must be Fortune or Ledger.';
  const text = typeof r.text === 'string' ? r.text.trim().replace(/\s+/g, ' ') : '';
  if (!text) return 'The card needs some text.';
  const effect = sanitizeCardEffect(r.effect);
  if (typeof effect === 'string') return effect;
  return { deck: r.deck, text: text.slice(0, CARD_MAX_TEXT), effect };
}
