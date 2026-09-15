import { lazy, Suspense, useState } from 'react';
import { createRoom, rejoinSession, dismissSavedSession, dismissInvitation, joinRoom, refreshRooms, setPlayerName, useStore } from '../net.js';
import { useMapId } from '../maps/index.js';
import { worldTheme } from '../world/themes.js';
import WorldGallery from './WorldGallery.js';

const WorldBoard = lazy(() => import('./WorldBoard.js'));

export default function Home() {
  const playerName = useStore(s => s.playerName), rooms = useStore(s => s.rooms), joining = useStore(s => s.joining), connected = useStore(s => s.connected);
  const invitedRoomId = useStore(s => s.invitedRoomId), error = useStore(s => s.error);
  const account = useStore(s => s.account);
  const [templateId, setTemplateId] = useState('');
  const selectedTemplate = account?.templates.find(t => t.id === templateId);
  const savedSessions = useStore(s => s.savedSessions);
  const recovery = savedSessions.filter(s => !invitedRoomId || s.roomId === invitedRoomId);
  const rejoin = recovery.length > 0 && <section className="card saved-games" aria-label="Saved games">
    {error && <p role="alert">{error}</p>}
    <h3>Back to your game</h3><p>Closed your browser? Rejoin with your original player while your seat is still reserved.</p>
    {recovery.map(session => <div className="row" key={session.token}>
      <button type="button" className="btn primary" disabled={!connected || joining} onClick={() => rejoinSession(session)}>Rejoin {session.roomId} as {session.playerName}</button>
      <button type="button" className="btn ghost" disabled={joining} onClick={() => dismissSavedSession(session)}>Forget</button>
    </div>)}
  </section>;
  const [code, setCode] = useState(''), [roomName, setRoomName] = useState(''), [isPrivate, setPrivate] = useState(false);
  const mapId = useMapId(), world = worldTheme(mapId), nameOk = playerName.trim().length > 0;
  const canJoin = nameOk && connected && !joining;

  if (invitedRoomId) return <div className="home invitation-home">
    <header className="home-head"><span className="eyebrow">THERE'S A SEAT FOR YOU</span><h1>You're invited to Marxopoly</h1><p>Choose your name to join table <strong className="code-chip">{invitedRoomId}</strong>.</p></header>
    {rejoin}
    <form className="card" onSubmit={e => { e.preventDefault(); if (canJoin) joinRoom(invitedRoomId); }}>
      <label className="field" htmlFor="invite-name">Your name</label><input id="invite-name" className="input" value={playerName} maxLength={24} placeholder="e.g. Sandy" autoFocus autoComplete="nickname" required onChange={e => setPlayerName(e.target.value)} />
      {error && <p role="alert">{error}</p>}<p className="muted">If the game has already started, you can join as a spectator.</p>
      <div className="row"><button className="btn primary" disabled={!canJoin}>{joining ? 'Joining…' : 'Join table'}</button><button className="btn ghost" type="button" disabled={joining} onClick={dismissInvitation}>Back to home</button></div>
    </form>
  </div>;

  return <div className="home home-redesign">
    <nav className="home-nav" aria-label="Main navigation"><a className="wordmark" href="#"><span className="brand-symbol" aria-hidden="true">◎</span>marxopoly<span className="wordmark-period">.</span></a><div className="home-nav-links"><a href="#worlds">The worlds</a><a href="#how-to-play">How to play</a><a href="#tables">Find a table <span aria-hidden="true">↗</span></a></div><span className="connection-status"><i className={connected ? 'online' : ''} />{connected ? 'Ready to play' : 'Connecting'}</span></nav>
    <main>
      {rejoin}
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-copy"><span className="eyebrow"><span className="tiny-star">✳</span> YOUR NEXT GAME NIGHT, REIMAGINED</span><h1 id="hero-title">Big moves.<br /><span>Small world.</span></h1><p>Build your little empire. Make a questionable deal. Turn your favourite people into your fiercest rivals.</p><div className="hero-actions"><a className="btn primary big" href="#tables">Let's play <span aria-hidden="true">↗</span></a><a className="text-link" href="#worlds">Find your world <span aria-hidden="true">↓</span></a></div><div className="hero-facts"><span><strong>2–8</strong> players</span><span><strong>5</strong> distinct worlds</span><span><strong>Zero</strong> downloads</span></div></div>
        <div className="hero-world"><Suspense fallback={<div className="world-loading">Building your world…</div>}><WorldBoard theme={mapId} preview /></Suspense><div className="hero-world-caption"><div><span className="eyebrow">ON THE TABLE</span><strong>{world.name}</strong></div><span>Go on, give it a spin <span aria-hidden="true">↶</span></span></div></div>
      </section>
      <section className="worlds-section" id="worlds" aria-labelledby="worlds-title"><div className="section-heading"><div><span className="eyebrow">A DIFFERENT KIND OF ESCAPE</span><h2 id="worlds-title">Same rivals. A whole new world.</h2></div><p>Pick a place that feels like you.<br />Your world, your view, at every table.</p></div><WorldGallery /><p className="world-description"><span style={{ background: world.accent }} />{world.description}</p></section>
      <section className="tables-section" id="tables" aria-labelledby="tables-title"><div className="section-heading"><div><span className="eyebrow">GOOD COMPANY. GREAT COMPETITION.</span><h2 id="tables-title">Pull up a chair.</h2></div><p>Bring your friends, or add a bot.<br />The first move is yours.</p></div>
        <div className="home-grid">
          <form className="card create-table-card" onSubmit={e => { e.preventDefault(); if (canJoin) createRoom(roomName, isPrivate, undefined, selectedTemplate?.id); }}><div className="form-title"><span className="form-icon" aria-hidden="true">＋</span><div><h3>Start something.</h3><p>Your table. Your house rules.</p></div></div>
            <label className="field-label" htmlFor="player-name">Your name</label><input id="player-name" className="input" value={playerName} maxLength={24} placeholder="What should we call you?" autoComplete="nickname" required onChange={e => setPlayerName(e.target.value)} />
            <label className="field-label" htmlFor="room-name">Table name <span>optional</span></label><input id="room-name" className="input" value={roomName} maxLength={30} placeholder="The usual suspects" onChange={e => setRoomName(e.target.value)} />
            {account && <><label className="field-label" htmlFor="table-template">Saved streets &amp; cards</label><select id="table-template" className="input" value={selectedTemplate?.id ?? ''} onChange={e => setTemplateId(e.target.value)}><option value="">Default board &amp; cards</option>{account.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><p className="muted small">{selectedTemplate ? `${Object.keys(selectedTemplate.tileNames).length} custom names ? ${selectedTemplate.cards.length} cards` : 'Save your customisations in the lobby to reuse them here.'}</p></>}
            <label className="check private-check"><input type="checkbox" checked={isPrivate} onChange={e => setPrivate(e.target.checked)} /><span>Make it private<em>Only friends with your invite can find the table.</em></span></label>
            <button className="btn primary full" disabled={!canJoin}>{joining ? 'Taking your seat…' : 'Create a table'} <span aria-hidden="true">↗</span></button><p className="form-footnote">Play as a guest, or sign in to reuse your saved streets and cards.</p>
          </form>
          <section className="card join-table-card" aria-labelledby="join-title"><div className="form-title"><span className="form-icon" aria-hidden="true">↗</span><div><h3 id="join-title">Already invited?</h3><p>Good. They saved you a seat.</p></div></div>
            <form className="join-code-form" onSubmit={e => { e.preventDefault(); if (canJoin && code.length === 6) joinRoom(code); }}><label className="field-label" htmlFor="room-code">Your six-character table code</label><div className="join-code-row"><input id="room-code" className="input code" value={code} maxLength={6} placeholder="ABC123" autoComplete="off" spellCheck={false} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /><button className="btn" disabled={!canJoin || code.length !== 6}>Join table</button></div></form>
            {!nameOk && <p className="name-reminder">Add your name to join or create a table.</p>}
            <div className="rooms-head"><h3><span className="live-dot" /> Open tables <span className="count-badge">{rooms.length}</span></h3><button type="button" className="btn ghost small" disabled={!connected} onClick={refreshRooms}>↻ Refresh</button></div>
            <div className="room-list">{rooms.length === 0 && <div className="empty-tables"><span aria-hidden="true">▧</span><strong>A quiet moment before the rivalry.</strong><p>Start a table and get the evening going.</p></div>}{rooms.map(room => { const lobby = room.phase === 'lobby', full = room.playerCount >= room.maxPlayers; return <button type="button" key={room.id} className="room-row" disabled={!canJoin || (lobby && full)} onClick={() => joinRoom(room.id)}><span className="room-name">{room.name}</span><span className="room-meta">{room.playerCount}/{room.maxPlayers} · {lobby ? (full ? 'full' : 'open') : 'watch game'}{room.spectatorCount > 0 ? ` · ${room.spectatorCount} watching` : ''}</span><span className="room-code">{room.id}</span></button>; })}</div>
          </section>
        </div>
      </section>
      <section className="how-section" id="how-to-play" aria-labelledby="how-title"><div><span className="eyebrow">SIMPLE TO START. HARD TO WALK AWAY.</span><h2 id="how-title">A little luck.<br />A lot of nerve.</h2></div><ol className="how-steps"><li><span>01</span><div><h3>Bring your people.</h3><p>Create a table, share the invite, and make the house rules your own. Bots are always up for a game.</p></div></li><li><span>02</span><div><h3>Make your move.</h3><p>Roll, buy streets, collect sets. Build houses and hotels to turn a small foothold into a growing empire.</p></div></li><li><span>03</span><div><h3>Own the evening.</h3><p>Trade, bid, and collect rent. Keep your cash flowing and be the last player standing.</p></div></li></ol></section>
    </main>
    <footer className="home-foot"><a className="wordmark" href="#">marxopoly<span className="wordmark-period">.</span></a><p>A small world for big game nights.</p><span>Made for the table. Played in your browser.</span></footer>
  </div>;
}
