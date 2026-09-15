import { useEffect, useState } from 'react';
import { tileAt, tileLabel, type GameState } from '@marxopoly/shared';
import { send } from '../net.js';
import { money, secondsLeft, tileColor } from '../lib.js';

interface Props {
  state: GameState;
  myId: string | null;
}

export default function AuctionPanel({ state, myId }: Props) {
  const auction = state.auction;
  const [bid, setBid] = useState(0);
  const [, force] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (auction) setBid(auction.mode === 'sealed' ? 10 : auction.highBid + 10);
  }, [auction?.highBid, auction?.tileId, auction?.mode]);

  if (!auction) return null;
  const tile = tileAt(auction.tileId);
  const me = state.players.find((p) => p.id === myId);
  const sealed = auction.mode === 'sealed';
  const submitted = !!myId && auction.submittedIds.includes(myId);
  const eligible = !!myId && auction.activeIds.includes(myId);
  const myTurn = sealed ? eligible && !submitted : auction.activeIds[auction.turnIndex] === myId;
  const bidder = state.players.find((p) => p.id === auction.activeIds[auction.turnIndex]);
  const high = state.players.find((p) => p.id === auction.highBidderId);
  const left = secondsLeft(auction.deadline);

  return (
    <div className="modal-backdrop">
      <div className="modal auction">
        <header>
          <h2>{sealed ? 'Sealed auction' : 'Auction'}</h2>
          {left !== null && <span className={`timer${left <= 5 ? ' urgent' : ''}`}>{left}s</span>}
        </header>

        <div className="auction-tile" style={{ borderColor: tileColor(tile) ?? '#334155' }}>
          <strong>{tileLabel(state, auction.tileId)}</strong>
          {'price' in tile && <span>list {money(tile.price)}</span>}
        </div>

        <p className="auction-state">
          {sealed ? (
            `${auction.submittedIds.length} of ${auction.activeIds.length} decisions submitted`
          ) : high ? (
            <>
              High bid {money(auction.highBid)} by <strong>{high.name}</strong>
            </>
          ) : (
            'No bids yet.'
          )}
        </p>
        {sealed ? (
          <p className="muted">Each eligible player may submit one private bid or pass.</p>
        ) : (
          <p className="muted">
            Waiting on <strong>{bidder?.name ?? '—'}</strong> · {auction.activeIds.length} still bidding
          </p>
        )}

        {myTurn && me && (
          <div className="auction-controls">
            <input
              className="input"
              type="number"
              min={sealed ? 1 : auction.highBid + 1}
              max={me.cash}
              step={10}
              value={bid}
              onChange={(e) => setBid(Number(e.target.value))}
            />
            <div className="row">
              {[10, 50, 100].map((step) => (
                <button key={step} className="btn ghost small" onClick={() => setBid((b) => b + step)}>
                  +{step}
                </button>
              ))}
              <button className="btn ghost small" onClick={() => setBid(me.cash)}>
                All in
              </button>
            </div>
            <div className="row">
              <button
                className="btn primary"
                disabled={!Number.isFinite(bid) || bid <= (sealed ? 0 : auction.highBid) || bid > me.cash}
                onClick={() => send({ type: 'bid', amount: bid })}
              >
                {sealed ? 'Submit' : 'Bid'} {money(bid)}
              </button>
              <button className="btn" onClick={() => send({ type: 'pass_bid' })}>
                Pass
              </button>
            </div>
            <p className="muted small">You hold {money(me.cash)}.</p>
          </div>
        )}
        {sealed && submitted && (
          <p className="muted">
            {auction.sealedBids[myId!] !== undefined
              ? `Your sealed bid of ${money(auction.sealedBids[myId!]!)} is locked in.`
              : 'You passed. Waiting for the other decisions.'}
          </p>
        )}
        {!sealed && !myTurn && <p className="muted">Sit tight — it is not your bid.</p>}
      </div>
    </div>
  );
}
