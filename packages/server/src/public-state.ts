import type { GameState } from '@marxopoly/shared';

/** Remove server-only data and opponents' sealed bids from one browser's view. */
export function publicState(state: GameState, viewerPlayerId?: string): GameState {
  const auction = state.auction?.mode === 'sealed'
    ? {
        ...state.auction,
        sealedBids: viewerPlayerId !== undefined
          && state.auction.sealedBids[viewerPlayerId] !== undefined
          ? { [viewerPlayerId]: state.auction.sealedBids[viewerPlayerId]! }
          : {},
      }
    : state.auction;

  return {
    ...state,
    auction,
    rngState: 0,
    settings: { ...state.settings, seed: 0 },
    fortuneDeck: [],
    ledgerDeck: [],
  };
}
