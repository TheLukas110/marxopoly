import { setBoardView, useBoardView } from '../board-view.js';

export default function BoardViewToggle() {
  const view = useBoardView();
  return <div className="view-switch" role="group" aria-label="Board perspective">
    {(['2d','3d'] as const).map(mode=><button key={mode} type="button" aria-pressed={view===mode} onClick={()=>setBoardView(mode)}>{mode==='2d'?'2D':'3D world'}</button>)}
  </div>;
}
