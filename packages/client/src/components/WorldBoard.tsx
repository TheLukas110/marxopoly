import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BOARD, type GameState } from '@marxopoly/shared';
import { clamp, GAME_CAMERA, WORLD_CAMERA } from '../world/math.js';
import { worldTheme } from '../world/themes.js';
import { createWorldRenderer } from '../world/renderer.js';
import { money } from '../lib.js';
import Dice from './Dice.js';

interface Props { theme: string; state?: GameState; selected?: number | null; onSelect?: (id: number) => void; preview?: boolean; onUnavailable?: () => void; controls?: ReactNode }
export default function WorldBoard({theme,state,selected=null,onSelect,preview=false,onUnavailable,controls}: Props) {
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),labels=useRef<HTMLCanvasElement>(null);
  const runtime=useRef<ReturnType<typeof createWorldRenderer> | null>(null);
  const defaultCamera = preview ? WORLD_CAMERA : GAME_CAMERA;
  const camera=useRef({...defaultCamera}),redraw=useRef<() => void>(()=>{});
  const latest=useRef({state,selected,onSelect,onUnavailable});latest.current={state,selected,onSelect,onUnavailable};
  const [error,setError]=useState(false),[showLabels,setShowLabels]=useState(!preview),[hovered,setHovered]=useState<number | null>(null),[dragging,setDragging]=useState(false);
  const labelsVisible=useRef(showLabels);labelsVisible.current=showLabels;
  const hoveredRef=useRef<number | null>(null);
  const hintId=useId(),palette=worldTheme(theme);

  useEffect(()=>{
    const element=host.current, surface=canvas.current, overlay=labels.current;
    if(!element || !surface || !overlay) return;
    let renderer: ReturnType<typeof createWorldRenderer>;
    setError(false);setHovered(null);hoveredRef.current=null;
    try { renderer=createWorldRenderer(surface,overlay,theme);runtime.current=renderer; }
    catch { setError(true); return; }
    let request=0;
    const draw=()=>{ if(!request) request=requestAnimationFrame(()=>{request=0;renderer.render(camera.current,element.clientWidth,element.clientHeight,labelsVisible.current);if(renderer.isAnimating() && !document.hidden)draw();}); };
    redraw.current=draw;
    renderer.update(latest.current.state,latest.current.selected,null);
    const resize=new ResizeObserver(draw);resize.observe(element);
    const points=new Map<number,{x:number;y:number}>();
    let start={x:0,y:0},moved=false,lastDistance=0;
    const distance=()=>{ const values=[...points.values()];return values.length===2?Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y):0; };
    const down=(event: PointerEvent)=>{
      if(event.pointerType==='mouse' && event.button!==0) return;
      surface.focus({preventScroll:true});
      points.set(event.pointerId,{x:event.clientX,y:event.clientY});surface.setPointerCapture(event.pointerId);
      if(points.size===1) {start={x:event.clientX,y:event.clientY};moved=false;} else moved=true;
      lastDistance=distance();
    };
    const move=(event: PointerEvent)=>{
      const previous=points.get(event.pointerId);
      if(previous) {
        const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
        points.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if(points.size>1) { const next=distance(); if(lastDistance) camera.current.zoom=clamp(camera.current.zoom*next/lastDistance,0.65,1.65);lastDistance=next;moved=true; }
        else { if(Math.hypot(event.clientX-start.x,event.clientY-start.y)>5) moved=true; if(moved) { camera.current.yaw-=dx*0.007;camera.current.pitch=clamp(camera.current.pitch+dy*0.005,0.3,1.4); } }
        if(moved) setDragging(true);draw();
      } else if(!preview) {
        const rect=surface.getBoundingClientRect(),id=renderer.pick(event.clientX-rect.left,event.clientY-rect.top);
        if(hoveredRef.current!==id) {hoveredRef.current=id;setHovered(id);renderer.update(latest.current.state,latest.current.selected,id);draw();}
      }
    };
    const up=(event: PointerEvent)=>{
      if(!points.has(event.pointerId)) return;
      if(!moved && event.type==='pointerup' && points.size===1) {
        const rect=surface.getBoundingClientRect(),id=renderer.pick(event.clientX-rect.left,event.clientY-rect.top);
        if(id!==null) latest.current.onSelect?.(id);
      }
      points.delete(event.pointerId);if(surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      if(points.size===0) setDragging(false);
    };
    const leave=()=>{hoveredRef.current=null;setHovered(null);renderer.update(latest.current.state,latest.current.selected,null);draw();};
    const wheel=(event: WheelEvent)=>{
      if(document.activeElement!==surface) return;
      event.preventDefault();camera.current.zoom=clamp(camera.current.zoom*Math.exp(-event.deltaY*0.001),0.65,1.65);draw();
    };
    const lost=(event: Event)=>{event.preventDefault();setError(true);};
    surface.addEventListener('pointerdown',down);surface.addEventListener('pointermove',move);surface.addEventListener('pointerup',up);
    surface.addEventListener('pointercancel',up);surface.addEventListener('lostpointercapture',up);surface.addEventListener('pointerleave',leave);
    surface.addEventListener('wheel',wheel,{passive:false});surface.addEventListener('webglcontextlost',lost);draw();
    document.addEventListener('visibilitychange',draw);
    return ()=>{
      cancelAnimationFrame(request);resize.disconnect();redraw.current=()=>{};runtime.current=null;
      surface.removeEventListener('pointerdown',down);surface.removeEventListener('pointermove',move);surface.removeEventListener('pointerup',up);
      surface.removeEventListener('pointercancel',up);surface.removeEventListener('lostpointercapture',up);surface.removeEventListener('pointerleave',leave);
      surface.removeEventListener('wheel',wheel);surface.removeEventListener('webglcontextlost',lost);renderer.dispose();
      document.removeEventListener('visibilitychange',draw);
    };
  },[theme,preview]);
  useEffect(()=>{runtime.current?.update(state,selected,hoveredRef.current);redraw.current();},[state,selected]);
  useEffect(()=>{redraw.current();},[showLabels]);
  const activeTile=hovered ?? selected,tile=activeTile===null?null:BOARD[activeTile];
  const deed=activeTile===null?undefined:state?.deeds[activeTile];
  const owner=deed?.ownerId?state?.players.find(player=>player.id===deed.ownerId):null;
  const current=state?.players.find(p=>p.seat===state.turnSeat && !p.bankrupt);
  const card=state?.drawnCard ? state.cards.find(c=>c.id===state.drawnCard?.cardId) : null;
  function adjust(yaw=0,zoom=1) {camera.current={...camera.current,yaw:camera.current.yaw+yaw,zoom:clamp(camera.current.zoom*zoom,0.65,1.65)};redraw.current();}
  return <div className={`world-board${preview?' world-preview':''}`} style={{'--world-accent':palette.accent,'--world-sky':palette.sky} as CSSProperties}>
    <div className="world-stage" ref={host}>
      <div className="world-grid" aria-hidden="true" />
      <canvas ref={canvas} className={`world-canvas${dragging?' dragging':''}`} tabIndex={0} role="group" aria-label={`${palette.name} interactive 3D world`} aria-describedby={hintId}
        onKeyDown={event=>{
          if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','=','-'].includes(event.key)) event.preventDefault();
          if(event.key==='ArrowLeft') adjust(-0.16);if(event.key==='ArrowRight') adjust(0.16);
          if(event.key==='ArrowUp' || event.key==='ArrowDown') {camera.current.pitch=clamp(camera.current.pitch+(event.key==='ArrowUp'?0.1:-0.1),0.3,1.4);redraw.current();}
          if(event.key==='Home') {camera.current={...defaultCamera};redraw.current();}
          if(event.key==='+' || event.key==='=') adjust(0,1.1);if(event.key==='-') adjust(0,1/1.1);
        }} />
      <canvas ref={labels} className="world-labels" aria-hidden="true" />
      <div className="world-caption"><span className="live-dot" />{preview?'LIVE WORLD PREVIEW':palette.name}<span className="world-dimension">3D</span></div>
      {error && <div className="world-error" role="status">{preview ? <><img src={`/worlds/${theme}.png`} alt={`${palette.name} miniature world`} /><span>World preview · Interactive 3D unavailable on this device</span></> : <><strong>Explore the board in 2D</strong><p>This device could not start the 3D scene.</p>{onUnavailable && <button className="btn primary" onClick={onUnavailable}>Use 2D board</button>}</>}</div>}
      {!preview && <div className="world-turn"><Dice dice={state?.dice ?? null} />{current && <span><i style={{background:current.color}} />{current.name}'s turn</span>}{!!state?.settings.plazaPot && state.plazaPot>0 && <small>Plaza pot {money(state.plazaPot)}</small>}</div>}
      {!preview && tile && <div className="world-inspect" aria-live="polite"><span className="eyebrow">{tile.kind}</span><strong>{state?.tileNames[tile.id] ?? tile.name}</strong><span>{'price' in tile?money(tile.price):tile.kind==='tax'?`Pay ${money(tile.amount)}`:'Special space'}{deed?.mortgaged?' · Mortgaged':''}</span>{deed && <span>{owner?.name ?? 'Bank'}{tile.kind==='street'?` · ${deed.houses===5?'Hotel':deed.houses?`${deed.houses} house${deed.houses===1?'':'s'}`:'Unbuilt'}`:''}</span>}</div>}
      <div className="world-orbit"><button type="button" aria-label="Rotate world left" onClick={()=>adjust(-0.2)}>↶</button><button type="button" aria-label="Reset world view" onClick={()=>{camera.current={...defaultCamera};redraw.current();}}>⌂</button><button type="button" aria-label="Rotate world right" onClick={()=>adjust(0.2)}>↷</button><span /><button type="button" aria-label="Zoom out" onClick={()=>adjust(0,1/1.12)}>−</button><button type="button" aria-label="Zoom in" onClick={()=>adjust(0,1.12)}>+</button></div>
      {controls && <div className="world-action-controls">{controls}</div>}
    </div>
    {!preview && <div className="world-toolbar"><span id={hintId}>Drag to orbit · Pinch to zoom · Arrow keys to explore</span><label className="world-label-toggle"><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)} />Labels</label><select className="world-property-select" aria-label="Inspect a board space" value={selected ?? ''} onChange={e=>{if(e.target.value!=='')onSelect?.(Number(e.target.value));}}><option value="">Inspect a space…</option>{BOARD.map(t=><option key={t.id} value={t.id}>{state?.tileNames[t.id] ?? t.name}{'price' in t?` · ${money(t.price)}`:''}</option>)}</select></div>}
    {preview && <span id={hintId} className="sr-only">Drag to orbit. Use arrow keys to rotate, plus and minus to zoom, or Home to reset.</span>}
    {!preview && card && <div className={`world-event ${state?.drawnCard?.deck}${state?.drawnCard?.status==='pending'?' pending':''}`} role="status" aria-live="polite" aria-atomic="true"><span className="eyebrow">{state?.drawnCard?.deck} · {state?.drawnCard?.status==='pending'?'Awaiting confirmation':'Resolved'}</span><p>{card.text}</p>{state?.drawnCard?.status==='pending' && <small>Its effect has not been applied yet.</small>}</div>}
  </div>;
}
