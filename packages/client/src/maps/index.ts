import { useSyncExternalStore } from 'react';
import { STANDARD } from './standard.js';
import { DUMMY } from './dummy.js';
import { CYBER } from './cyber.js';
import { POKER } from './poker.js';
import { PRIDE } from './pride.js';
import { EXPEDITIONS } from './expeditions.js';
import type { MapDefinition } from './types.js';

export type { MapDefinition, SpecialTileStyle } from './types.js';
export type { BoardLayout, Edge } from './layout.js';
export { ringLayout, tokenSpot } from './layout.js';

/**
 * Every board skin the player can choose from. Register the matching palette
 * and scene in world/, then run `pnpm --filter @marxopoly/client previews`
 * to include its miniature in the gallery and the WebGL fallback.
 */
export const MAPS: readonly MapDefinition[] = [STANDARD, CYBER, POKER, PRIDE, DUMMY, ...EXPEDITIONS];

export const DEFAULT_MAP_ID = STANDARD.id;

export function getMap(id: string | null | undefined): MapDefinition {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

/* ------------------------------------------------- per-player persistence */

const STORAGE_KEY = 'marxopoly.map.v1';
const listeners = new Set<() => void>();
let memoryMapId: string | null = null;

export function getMapId(): string {
  if (memoryMapId) return memoryMapId;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && MAPS.some((m) => m.id === stored)) return stored;
  } catch {
    /* storage may be unavailable */
  }
  return memoryMapId ?? DEFAULT_MAP_ID;
}

export function setMapId(id: string): void {
  if (!MAPS.some((map) => map.id === id)) return;
  memoryMapId = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** The id of the map this player has chosen. */
export function useMapId(): string {
  return useSyncExternalStore(subscribe, getMapId, getMapId);
}

/** The map this player has chosen. */
export function useMap(): MapDefinition {
  return getMap(useMapId());
}
