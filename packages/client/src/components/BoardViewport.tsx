import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { DEFAULT_CAMERA, fitBoardCamera, MAX_TILT, MIN_TILT, moveCamera } from '../board-camera.js';
import { useBoardView } from '../board-view.js';
import type { MapDefinition } from '../maps/index.js';

interface Drag {
  id: number;
  x: number;
  y: number;
  rotation: number;
  tilt: number;
  moved: boolean;
}

export default function BoardViewport({ map, children }: { map: MapDefinition; children: ReactNode }) {
  const is3d = useBoardView() === '3d';
  const [camera, setCamera] = useState(DEFAULT_CAMERA);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ board: 0, width: 0, height: 0 });
  const viewport = useRef<HTMLDivElement>(null);
  const orbit = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const instructions = useId();
  const ring = parseFloat(map.vars['--board-ring'] ?? '0');
  const { scale, perspective } = fitBoardCamera(camera, size.board, size.width, size.height, ring);

  useEffect(() => {
    const wrap = viewport.current;
    const board = orbit.current;
    if (!wrap || !board) return;
    const measure = () => setSize({ board: board.offsetWidth, width: wrap.clientWidth, height: wrap.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!is3d || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ...camera, moved: false };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 6) return;
    if (!start.moved) {
      start.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    suppressClick.current = true;
    setCamera(moveCamera(start, dx * 0.4, -dy * 0.25));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className={`board-view${is3d ? ' is-3d' : ''}`}>
      {is3d && (
        <div className="board-controls" role="group" aria-label="3D board controls">
          <div className="board-rotation-buttons">
            <button type="button" className="btn small" aria-label="Rotate board left"
              onClick={() => setCamera((value) => moveCamera(value, -15))}>↶</button>
            <button type="button" className="btn small" onClick={() => setCamera(DEFAULT_CAMERA)}>Reset view</button>
            <button type="button" className="btn small" aria-label="Rotate board right"
              onClick={() => setCamera((value) => moveCamera(value, 15))}>↷</button>
          </div>
          <label className="board-tilt">
            Tilt
            <input type="range" min={MIN_TILT} max={MAX_TILT} value={camera.tilt}
              onChange={(event) => setCamera((value) => ({ ...value, tilt: Number(event.target.value) }))} />
          </label>
          <span className="board-view-hint" id={instructions}>Drag to rotate · Arrow keys when focused</span>
        </div>
      )}
      <div ref={viewport} className={`board-wrap${map.wrapClass ? ` ${map.wrapClass}` : ''}${dragging ? ' dragging' : ''}`}
        style={map.vars as CSSProperties}>
        <div
          className="board-interaction"
          role="group"
          aria-label={is3d ? 'Rotatable 3D game board' : 'Game board — scroll to explore, select a property for its name and price'}
          aria-describedby={is3d ? instructions : undefined}
          tabIndex={0}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onPointerLeave={(event) => {
            if (!drag.current?.moved) endDrag(event);
          }}
          onClickCapture={(event) => {
            if (suppressClick.current && event.detail !== 0) {
              event.preventDefault();
              event.stopPropagation();
              suppressClick.current = false;
            }
          }}
          onKeyDown={(event) => {
            if (!is3d || event.target !== event.currentTarget) return;
            const keys: Record<string, [number, number]> = {
              ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, 5], ArrowDown: [0, -5],
            };
            if (keys[event.key]) {
              event.preventDefault();
              setCamera((value) => moveCamera(value, ...keys[event.key]));
            } else if (event.key === 'Home') {
              event.preventDefault();
              setCamera(DEFAULT_CAMERA);
            }
          }}
        >
          <div ref={orbit} className="board-camera" style={is3d ? {
            transform: `perspective(${perspective}px) scale3d(${scale}, ${scale}, ${scale}) rotateX(${camera.tilt}deg) rotateZ(${camera.rotation}deg)`,
          } : undefined}>
            {is3d && <div className="board-depth" aria-hidden="true">
              <div className="board-base" />
              <div className="board-side north" /><div className="board-side south" />
              <div className="board-side east" /><div className="board-side west" />
            </div>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
