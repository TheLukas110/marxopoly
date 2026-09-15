import { kickSpectator, updateSpectatorPolicy, useStore } from '../net.js';

export default function SpectatorPanel() {
  const spectators = useStore((state) => state.spectators);
  const policy = useStore((state) => state.spectatorPolicy);
  const hostId = useStore((state) => state.hostId);
  const playerId = useStore((state) => state.playerId);
  const isHost = hostId === playerId;
  const connected = spectators.filter((spectator) => spectator.connected).length;

  return (
    <section className="panel spectators" aria-labelledby="spectator-list-title">
      <div className="panel-heading">
        <h2 id="spectator-list-title">Spectators</h2>
        <span className="section-count">{connected}/{policy.maxSpectators} watching</span>
      </div>
      <p className="muted small">{policy.accepting ? 'New spectators may join.' : 'New spectator access is closed.'}</p>
      {isHost && (
        <div className="spectator-controls">
          <label className="check compact">
            <input
              type="checkbox"
              checked={policy.accepting}
              onChange={(event) => updateSpectatorPolicy({ accepting: event.target.checked })}
            />
            <span>Accept new spectators</span>
          </label>
          <label className="field compact">
            <span>Maximum</span>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={policy.maxSpectators}
              onChange={(event) => updateSpectatorPolicy({ maxSpectators: Number(event.target.value) })}
            />
          </label>
        </div>
      )}
      {spectators.length === 0 ? (
        <p className="muted small spectator-empty">Nobody is watching yet.</p>
      ) : (
        <ul className="spectator-list">
          {spectators.map((spectator) => (
            <li key={spectator.id}>
              <span>{spectator.name}</span>
              {!spectator.connected && <span className="tag off">away</span>}
              {spectator.id === playerId && <span className="tag you">you</span>}
              {isHost && (
                <button
                  className="btn ghost small"
                  onClick={() => kickSpectator(spectator.id)}
                  aria-label={`Remove spectator ${spectator.name}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
