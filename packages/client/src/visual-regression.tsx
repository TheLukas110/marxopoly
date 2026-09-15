import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BOARD, createGame } from '@marxopoly/shared';
import Board from './components/Board.js';
import { setBoardView, type BoardView } from './board-view.js';
import { MAPS, setMapId } from './maps/index.js';
import './styles/index.css';
import './styles/experience.css';
import './styles/game-room.css';
import './styles/visual-regression.css';

const params = new URLSearchParams(window.location.search);
const mapId = params.get('map') ?? MAPS[0]!.id;
const view: BoardView = params.get('view') === '3d' ? '3d' : '2d';
setMapId(mapId);
setBoardView(view);
document.documentElement.dataset.theme = 'light';

const state = createGame(
  'BROWSER-REGRESSION',
  Array.from({ length: 8 }, (_, index) => ({
    id: `player-${index}`,
    name: index === 6 ? 'Player with a very long display name' : `Player ${index + 1}`,
  })),
  { seed: 20260915, turnSeconds: 0, maxPlayers: 8 },
);
state.phase = 'post_roll';
state.turnSeat = 7;
state.players.forEach((player, index) => {
  player.position = [0, 1, 1, 9, 10, 20, 30, 39][index]!;
});
state.tileNames[1] = 'The exceptionally long custom riverside cooperative boulevard';
state.tileNames[6] = 'Avenue of shared gardens and neighbourhood workshops';
state.tileNames[39] = 'International solidarity and community assembly promenade';
Object.values(state.deeds).forEach((deed, index) => {
  deed.ownerId = state.players[index % state.players.length]!.id;
  if (index % 6 === 0) deed.mortgaged = true;
  else if (index % 7 === 0) deed.houses = 5;
});

function Harness() {
  const [selected, setSelected] = useState<number | null>(1);
  useEffect(() => {
    document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.dataset.ready = 'true';
    })));
  }, []);
  return (
    <main className="visual-regression game" data-map={mapId} data-view={view}>
      <section className="col centre" aria-label="Deterministic browser regression board">
        <Board state={state} selected={selected} onSelect={setSelected} />
      </section>
      <output className="visual-regression-summary" aria-live="polite">
        {BOARD.length} spaces · {state.players.length} players · {Object.values(state.deeds).filter(deed => deed.mortgaged).length} mortgages
      </output>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing regression root.');
createRoot(root).render(<StrictMode><Harness /></StrictMode>);
