import { lazy, Suspense } from 'react';
import { BOARD, type GameState } from '@marxopoly/shared';
import BoardTile from './BoardTile.js';
import TokenLayer from './TokenLayer.js';
import { money } from '../lib.js';
import { useMap } from '../maps/index.js';
import Dice from './Dice.js';
import BoardViewport from './BoardViewport.js';
import { setBoardView, useBoardView } from '../board-view.js';

const WorldBoard = lazy(() => import('./WorldBoard.js'));

interface Props {
  state: GameState;
  selected: number | null;
  onSelect: (tileId: number) => void;
}

export default function Board({ state, selected, onSelect }: Props) {
  const map = useMap();
  const view = useBoardView();
  const { layout } = map;
  const current = state.players.find((p) => p.seat === state.turnSeat && !p.bankrupt);
  const card = state.drawnCard;
  const cardText = card ? state.cards.find((c) => c.id === card.cardId)?.text ?? '' : '';

  if (view === '3d') return <Suspense fallback={<div className="world-loading" role="status">Building your world…</div>}>
    <WorldBoard theme={map.id} state={state} selected={selected} onSelect={onSelect} onUnavailable={() => setBoardView('2d')} />
  </Suspense>;

  return (
    <BoardViewport map={map}>
      <div
        className="board"
        style={{
          ...map.vars,
          gridTemplateColumns: layout.gridTemplateColumns,
          gridTemplateRows: layout.gridTemplateRows,
        } as React.CSSProperties}
      >
        {BOARD.map((tile) => (
          <BoardTile
            key={tile.id}
            tile={tile}
            state={state}
            layout={layout}
            special={map.special}
            selected={selected === tile.id}
            onSelect={onSelect}
          />
        ))}

        <TokenLayer state={state} layout={layout} />

        <div
          className={`board-centre${card ? ' has-card' : ''}`}
          style={{ gridColumn: layout.centre.column, gridRow: layout.centre.row }}
        >
          {!card && <div className="brand">
            Common Ground<span className="dot" />
          </div>}
          <Dice dice={state.dice} />
          {current && (
            <div className="centre-turn">
              <span className="chip sm" style={{ background: current.color }} />
              {current.name}'s turn
            </div>
          )}
          {state.settings.plazaPot && state.plazaPot > 0 && (
            <div className="centre-pot">Plaza pot: {money(state.plazaPot)}</div>
          )}
          {card && (
            <div className={`centre-card ${card.deck}`} role="status" aria-live="polite">
              <span className="deck-label">Last drawn · {card.deck === 'fortune' ? 'Fortune' : 'Ledger'}</span>
              {cardText}
            </div>
          )}
        </div>
      </div>
    </BoardViewport>
  );
}
