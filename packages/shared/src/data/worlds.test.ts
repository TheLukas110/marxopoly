import { describe, expect, it } from 'vitest';
import { BOARD } from './board.js';
import { DEFAULT_CARDS } from './cards.js';
import {
  CLOCKWORK_WORLD_CONFIG,
  DEFAULT_RULE_WORLD,
  DEFAULT_WORLD_SETTINGS,
  ruleWorldById,
  validateRuleWorld,
} from './worlds.js';
import { applyAction } from '../engine/engine.js';
import { createGame } from '../engine/state.js';

describe('rule world schema', () => {
  it('fills omitted optional data with stable standard defaults', () => {
    const result = validateRuleWorld({ id: 'minimal', name: 'Minimal world' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.board).toEqual(BOARD);
    expect(result.value.cards).toEqual(DEFAULT_CARDS);
    expect(result.value.settings).toEqual(DEFAULT_WORLD_SETTINGS);
    expect(result.value.tokens).toEqual(DEFAULT_RULE_WORLD.tokens);
  });

  it('loads the documented complete example with its own board, prices, cards, pieces and rules', () => {
    const result = validateRuleWorld(CLOCKWORK_WORLD_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.board).toHaveLength(40);
    expect(result.value.board[1]?.name).toBe('Copper Mews');
    expect(result.value.board[1]).toMatchObject({ kind: 'street', price: 90 });
    expect(result.value.cards.map(card => card.id)).toContain('clock-f02');
    expect(result.value.tokens).toContain('cog');
    expect(result.value.settings).toMatchObject({ startingCash: 1750, auctionMode: 'sealed' });
  });

  it.each([
    [{ id: 'broken', name: 'Broken', board: BOARD.slice(0, 39) }, /exactly 40 spaces/i],
    [{ id: 'broken', name: 'Broken', cards: [{ ...DEFAULT_CARDS[0], effect: { kind: 'move_to', tile: 99, collectStart: true } }] }, /ledger|outside/i],
    [{ id: 'Broken ID', name: '', tokens: ['same', 'same'] }, /id must|name must|unique/i],
  ])('rejects invalid configuration with a useful explanation', (input, message) => {
    const result = validateRuleWorld(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(message);
  });
});

describe('rule world engine integration', () => {
  it('uses the selected package authoritatively for players and gameplay', () => {
    const world = ruleWorldById('clockwork')!;
    let state = createGame('clock-test', [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Brix' }], { seed: 42, turnSeconds: 0 }, world);
    expect(state.ruleWorld.id).toBe('clockwork');
    expect(state.players[0]).toMatchObject({ cash: 1750, token: 'cog' });
    expect(state.deeds[1]).toBeDefined();
    expect(state.cards[0]?.id).toBe('clock-f01');
    const started = applyAction(state, { playerId: 'a', action: { type: 'start_game' }, now: 100 });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    state = started.state;
    expect(state.ruleWorld.board[1]).toMatchObject({ name: 'Copper Mews', price: 90 });
  });

  it('runs a normalized incomplete package with the inherited board and rules', () => {
    const normalized = validateRuleWorld({ id: 'inherited', name: 'Inherited' });
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    const state = createGame('inherited-test', [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Brix' }], { seed: 1 }, normalized.value);
    expect(state.ruleWorld.board[39]?.name).toBe(BOARD[39]?.name);
    expect(state.settings.startingCash).toBe(DEFAULT_WORLD_SETTINGS.startingCash);
    expect(applyAction(state, { playerId: 'a', action: { type: 'start_game' }, now: 100 }).ok).toBe(true);
  });

  it('refuses a corrupted package before the engine starts play', () => {
    const state = createGame('invalid-test', [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Brix' }], { seed: 1 });
    state.ruleWorld.board.pop();
    const result = applyAction(state, { playerId: 'a', action: { type: 'start_game' }, now: 100 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/invalid rule world.*exactly 40 spaces/i);
  });
});
