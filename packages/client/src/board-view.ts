import { useSyncExternalStore } from 'react';

export type BoardView = '2d' | '3d';
const STORAGE_KEY = 'marxopoly.board-view.v1';
const listeners = new Set<() => void>();

function readView(): BoardView {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '3d' ? '3d' : '2d';
  } catch {
    return '2d';
  }
}

// Each tab can have its own player. Keep their choice independent, including
// when storage is disabled. Refreshing the tab restores its preference.
let view = readView();

export function getBoardView(): BoardView {
  return view;
}

export function setBoardView(next: BoardView): void {
  if (next === view) return;
  view = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The in-memory preference still works without browser storage.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useBoardView(): BoardView {
  return useSyncExternalStore(subscribe, getBoardView, () => '2d');
}
