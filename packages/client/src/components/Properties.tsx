import { useState } from 'react';
import {
  GROUP_COLORS,
  GROUP_LABELS,
  GROUP_ORDER,
  GROUP_TILES,
  ownableTile,
  ownsWholeGroup,
  tileLabel,
  type GameState,
} from '@marxopoly/shared';
import { money } from '../lib.js';

interface Props {
  state: GameState;
  myId: string | null;
  onSelect?: (tileId: number) => void;
  overviewMode?: boolean;
}

const GROUPS: readonly string[] = [...GROUP_ORDER, 'depot', 'works'];

export default function Properties({ state, myId, onSelect, overviewMode = false }: Props) {
  const [mineOnly, setMineOnly] = useState(true);
  const playerById = new Map(state.players.map((p) => [p.id, p]));
  const myCount = myId
    ? Object.values(state.deeds).filter((d) => d.ownerId === myId).length
    : 0;
  // "Mine" is the default, but a spectator with no seat always sees everything.
  const showMineOnly = !overviewMode && mineOnly && !!myId;

  return (
    <div className="panel deeds">
      <div className="deeds-head">
        <h2>{overviewMode ? 'All properties' : 'Properties'}</h2>
        {myId && !overviewMode && (
          <div className="tabs deeds-tabs">
            <button aria-pressed={!mineOnly} className={mineOnly ? '' : 'active'} onClick={() => setMineOnly(false)}>
              All
            </button>
            <button aria-pressed={mineOnly} className={mineOnly ? 'active' : ''} onClick={() => setMineOnly(true)}>
              Mine ({myCount})
            </button>
          </div>
        )}
      </div>

      <div className="deeds-groups">
        {GROUPS.map((group) => {
          const color = GROUP_COLORS[group as keyof typeof GROUP_COLORS];
          const rows = (GROUP_TILES[group] ?? [])
            .map((id) => ({ id, deed: state.deeds[id] }))
            .filter((r) => !showMineOnly || r.deed?.ownerId === myId);
          if (rows.length === 0) return null;

          const fullSet = !!myId && ownsWholeGroup(state, myId, group);

          return (
            <div key={group} className="deed-group">
              <div className="deed-group-head">
                <span className="deed-group-band" style={{ background: color }} />
                <span className="deed-group-name">
                  {GROUP_LABELS[group as keyof typeof GROUP_LABELS]}
                </span>
                {fullSet && <span className="tag you">full set</span>}
              </div>

              {rows.map(({ id, deed }) => {
                const owner = deed?.ownerId ? playerById.get(deed.ownerId) : null;
                const isMine = !!owner && owner.id === myId;
                const tile = ownableTile(id)!;
                const name = tileLabel(state, id);
                return (
                  <button
                    type="button"
                    onClick={() => onSelect?.(id)}
                    aria-label={`Inspect ${name}. Price ${money(tile.price)}. Owner ${owner?.name ?? 'Bank'}.`}
                    key={id}
                    className={`deed-item${isMine ? ' mine' : ''}${deed?.mortgaged ? ' mtg' : ''}`}
                  >
                    <span className="deed-item-band" style={{ background: color }} />
                    <span className="deed-item-name">
                      {name}
                      {deed && deed.houses > 0 && (
                        <span className="deed-item-houses">
                          {deed.houses === 5 ? 'Hotel' : `${deed.houses}h`}
                        </span>
                      )}
                      {deed?.mortgaged && <span className="deed-item-flag">MTG</span>}
                    </span>
                    <span className="deed-item-price">{money(tile.price)}</span>
                    <span className="deed-item-owner">
                      {owner ? (
                        <>
                          <span className="chip xs" style={{ background: owner.color }} />
                          <span className={isMine ? 'accent' : ''}>
                            {isMine ? 'You' : owner.name}
                          </span>
                        </>
                      ) : (
                        <span className="muted">Bank</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {showMineOnly && myCount === 0 && <div className="property-empty"><span aria-hidden="true">⌂</span><strong>Your portfolio starts here</strong><p>Buy a property when you land on it. Collect a colour set to start building.</p><button className="btn ghost small" onClick={() => setMineOnly(false)}>Explore all properties</button></div>}
    </div>
  );
}
