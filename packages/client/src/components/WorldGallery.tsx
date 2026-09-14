import { MAPS, setMapId, useMapId } from '../maps/index.js';
import { worldTheme } from '../world/themes.js';

export default function WorldGallery({compact=false}: {compact?: boolean}) {
  const active=useMapId();
  return <div className={`world-gallery${compact?' compact':''}`} role="group" aria-label="Choose your world">
    {MAPS.map((map,index)=>{
      const world=worldTheme(map.id);
      return <button type="button" key={map.id} className={`world-card${active===map.id?' active':''}`} aria-pressed={active===map.id} onClick={()=>setMapId(map.id)} style={{'--world-accent':world.accent,'--world-sky':world.sky} as React.CSSProperties}>
        <div className="world-card-art"><img src={`/worlds/${map.id}.png`} alt="" loading="lazy" width="800" height="600" /><span className="world-card-number">{String(index+1).padStart(2,'0')}</span><span className="world-card-check" aria-hidden="true">{active===map.id?'✓':'↗'}</span></div>
        <div className="world-card-copy"><strong>{world.name}</strong><span>{compact?'Explore this world':world.eyebrow.toLowerCase()}</span></div>
      </button>;
    })}
  </div>;
}
