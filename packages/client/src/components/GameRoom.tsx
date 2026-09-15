import { useEffect, useState } from 'react';
import { leaveRoom, reportBankrupt, useStore } from '../net.js';
import Board from './Board.js';
import PlayerList from './PlayerList.js';
import Properties from './Properties.js';
import ActionBar from './ActionBar.js';
import LogPanel from './LogPanel.js';
import ManagePanel from './ManagePanel.js';
import TradePanel from './TradePanel.js';
import TradeInbox from './TradeInbox.js';
import AuctionPanel from './AuctionPanel.js';
import TileDetail from './TileDetail.js';
import GameOver from './GameOver.js';
import CardsPanel from './CardsPanel.js';
import MapPicker from './MapPicker.js';
import BoardViewToggle from './BoardViewToggle.js';
import InviteLink from './InviteLink.js';
import GameDialog from './GameDialog.js';
import GameIcon from './GameIcon.js';
import SpectatorPanel from './SpectatorPanel.js';
import TurnReminderSettings from './TurnReminderSettings.js';
import { netWorth, ownableTile } from '@marxopoly/shared';
import { money } from '../lib.js';

export default function GameRoom() {
  const state = useStore((s) => s.game)!;
  const spectating = useStore((s) => s.spectator);
  // A viewer has no seat: drop the id so every play affordance keys off "not me".
  const myId = useStore((s) => (s.spectator ? null : s.playerId));
  const roomId = useStore((s) => s.roomId);
  const roomName = useStore((s) => s.roomName);
  const [selected, setSelected] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const [tradeWith, setTradeWith] = useState<string | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [choosingTrade, setChoosingTrade] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'board' | 'properties' | 'players' | 'table'>('board');
  const [unreadChat, setUnreadChat] = useState(0);
  useEffect(() => {
    if (state.phase === 'auction' || state.phase === 'game_over') {
      setSelected(null);
      setShowRules(false);
      setChoosingTrade(false);
      setShowCards(false);
      setManaging(false);
      setTradeWith(null);
    }
  }, [state.phase]);

  const me = myId ? state.players.find((p) => p.id === myId) : undefined;
  const inProgress = state.phase !== 'lobby' && state.phase !== 'game_over';
  const canReportBankrupt = !!me && !me.bankrupt && inProgress;
  const canCreateTrade = canReportBankrupt && state.phase !== 'awaiting_card';
  const partners = state.players.filter(p => p.id !== myId && !p.bankrupt);
  const offers = state.trades.filter(t => t.toId === myId || t.fromId === myId);
  const incoming = offers.filter(t => t.toId === myId).length;
  const needsMyAction = !!me && !me.bankrupt && inProgress &&
    (state.debt?.debtorId === myId || state.players.find(p => p.seat === state.turnSeat)?.id === myId);
  function selectTile(id: number) { setSelected(id === selected ? null : id); }

  function onReportBankrupt() {
    if (
      window.confirm(
        'Report bankrupt? Your properties go back to the bank and your cash is wiped. ' +
          'You stay out for the rest of the game but can keep watching.',
      )
    ) {
      reportBankrupt();
    }
  }

  return (
    <div className="game" data-mobile-panel={mobilePanel}>
      <header className="game-head">
        <div className="game-brand"><span className="brand-mark"><GameIcon name="board" /></span><div className="brand small">Marxopoly<span className="dot" /></div></div>
        <div className="game-room-name"><span className="live-dot" /><span>{roomName || 'Your table'}</span><span className="code-chip">{roomId}</span></div>
        <div className="board-preferences" role="group" aria-label="Board display"><MapPicker compact /><BoardViewToggle /></div>
      </header>

      <nav className="game-mobile-nav" aria-label="Game sections">
        <button aria-pressed={mobilePanel === 'board'} onClick={() => setMobilePanel('board')}><GameIcon name="board" />Board</button>
        <button aria-pressed={mobilePanel === 'properties'} onClick={() => setMobilePanel('properties')}><GameIcon name="trade" />Properties</button>
        <button aria-pressed={mobilePanel === 'players'} onClick={() => setMobilePanel('players')}><GameIcon name="people" />Players{incoming > 0 && <span className="notification-count">{incoming}</span>}</button>
        <button aria-pressed={mobilePanel === 'table'} onClick={() => setMobilePanel('table')}><GameIcon name="chat" />Table{unreadChat > 0 && <span className="notification-count">{unreadChat}</span>}</button>
      </nav>
      {needsMyAction && mobilePanel !== 'board' && <button className="mobile-turn-return" onClick={() => setMobilePanel('board')}><span className="live-dot" />{state.debt?.debtorId === myId ? 'Action needed' : 'Your turn'}<span>Return to board →</span></button>}
      <main className="game-main">
        <aside className="col left table-sidebar" aria-label="Table and conversation">
          {roomId && <InviteLink roomId={roomId} compact />}
          <div className="panel table-tools">
            <button onClick={() => setShowRules(true)}><GameIcon name="settings" /><span>Table rules</span><span aria-hidden="true">↗</span></button>
            <button onClick={() => setShowCards(true)}><GameIcon name="cards" /><span>Fortune & Ledger cards</span><span aria-hidden="true">↗</span></button>
            <button onClick={() => setShowReminders(true)}><GameIcon name="settings" /><span>Turn reminders</span><span aria-hidden="true">↗</span></button>
          </div>
          <LogPanel state={state} onUnreadChange={setUnreadChat} />
          <div className="table-exit">
            {canReportBankrupt && <button className="btn ghost small danger" onClick={onReportBankrupt}>Report bankrupt</button>}
            <button className="btn ghost small" onClick={leaveRoom}>{spectating ? 'Stop watching' : 'Leave table'}</button>
          </div>
        </aside>

        <section className="col centre" aria-label="Board and game actions">
          <Board state={state} selected={selected} onSelect={selectTile} controls={<ActionBar state={state} myId={myId} onManage={() => setManaging(true)} />} />
        </section>

        <aside className="col right portfolio-sidebar" aria-label="Players, trades and properties">
          <PlayerList state={state} myId={myId} onTrade={setTradeWith} />
          <SpectatorPanel />
          <section className="panel trade-hub" aria-label="Trades">
            <div className="panel-heading"><h2><GameIcon name="trade" />Trades{incoming > 0 && <span className="notification-count">{incoming}</span>}</h2><button className="btn small" disabled={!canCreateTrade || !partners.length} onClick={() => setChoosingTrade(true)}>+ Create</button></div>
            {offers.length === 0 ? <p className="muted small">{canReportBankrupt ? 'Make a deal. Complete your next set.' : 'Trade offers appear here when you play.'}</p> : myId && <TradeInbox state={state} myId={myId} />}
          </section>
          {me && <div className="portfolio-summary"><div><span>Your cash</span><strong>{money(me.cash)}</strong></div><div><span>Net worth</span><strong>{money(netWorth(state, me.id))}</strong></div></div>}
          <Properties state={state} myId={myId} onSelect={selectTile} overviewMode={mobilePanel === 'properties'} />
        </aside>
      </main>

      {selected !== null && ownableTile(state, selected) && <GameDialog title="Property details" onClose={() => setSelected(null)}><TileDetail state={state} tileId={selected} onClose={() => setSelected(null)} /></GameDialog>}
      {choosingTrade && <GameDialog title="Who would you like to trade with?" onClose={() => setChoosingTrade(false)}><p className="muted">Exchange cash, properties or reprieve cards.</p><div className="trade-partners">{partners.map(p => <button className="btn" key={p.id} onClick={() => { setChoosingTrade(false); setTradeWith(p.id); }}><span className="chip sm" style={{ background: p.color }} /><strong>{p.name}</strong><span>{money(p.cash)} →</span></button>)}</div></GameDialog>}
      {showRules && <GameDialog title="Table rules" onClose={() => setShowRules(false)}><p className="muted">The rules chosen for this table. They stay fixed during the game.</p><dl className="table-rules">{[
        ['Rule world', state.ruleWorld.name],
        ['Starting cash', money(state.settings.startingCash)], ['Salary at Start', money(state.settings.startSalary)],
        ['Turn timer', state.settings.turnSeconds ? `${state.settings.turnSeconds} seconds` : 'No time limit'],
        ['Holding yard fine', money(state.settings.holdingFine)],
        ['Auctions', state.settings.auctionsEnabled ? state.settings.auctionMode === 'sealed' ? 'Sealed' : 'Open' : false],
        ['Even building', state.settings.evenBuild], ['Double rent on full sets', state.settings.doubleRentOnFullGroup],
        ['Plaza pot', state.settings.plazaPot], ['No rent in holding', state.settings.noRentInHolding],
        ['Bonus on exact Start', state.settings.doubleOnExactStart], ['House supply', state.settings.houseSupply || 'Unlimited'],
        ['Hotel supply', state.settings.hotelSupply || 'Unlimited'], ['Maximum players', state.settings.maxPlayers],
      ].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{typeof value === 'boolean' ? value ? 'On' : 'Off' : value}</dd></div>)}</dl></GameDialog>}
      {showReminders && <GameDialog title="Turn reminders" onClose={() => setShowReminders(false)}><TurnReminderSettings /></GameDialog>}
      {managing && myId && <ManagePanel state={state} myId={myId} onClose={() => setManaging(false)} />}
      {tradeWith && myId && (
        <TradePanel state={state} myId={myId} partnerId={tradeWith} onClose={() => setTradeWith(null)} />
      )}
      {state.phase === 'auction' && <AuctionPanel state={state} myId={myId} />}
      {state.phase === 'game_over' && <GameOver state={state} myId={myId} />}
      {showCards && <CardsPanel state={state} editable={false} onClose={() => setShowCards(false)} />}
    </div>
  );
}
