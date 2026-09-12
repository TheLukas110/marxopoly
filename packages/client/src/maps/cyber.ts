import { districtLayout } from './layout.js';
import type { MapDefinition } from './types.js';

/**
 * "Cyber" — a four-shade LCD skin in the spirit of an old handheld console
 * screen: hard pixel edges, a dark green panel, monospaced type and faint
 * scanlines (drawn in CSS, see `.map-cyber` in `styles/index.css`).
 *
 * Uses colours and unicode glyphs without bundled images or fonts.
 * Labels come from the shared tile data.
 *
 * The palette is the classic four-step green ramp:
 *   #9bbc0f (lightest) · #8bac0f · #306230 · #0f380f (darkest)
 */
export const CYBER: MapDefinition = {
  id: 'cyber',
  name: 'Cyber',
  description: 'Retro handheld LCD — four shades of green, scanlines and pixel type.',
  layout: districtLayout(),
  vars: {
    '--board-face': '#0f380f',
    '--board-frame': '#0f380f',
    '--board-gap': '2px',
    '--board-pad': '8px',
    '--board-radius': '4px',
    '--board-ring': '12px',
    '--tile-ink': '#0f380f',
    '--tile-price-ink': '#2c5c1a',
    '--tile-radius': '0px',
    '--tile-border': '2px solid #0f380f',
    '--centre-bg': '#9bbc0f',
    '--centre-ink': '#0f380f',
    '--centre-muted': '#306230',
  },
  wrapClass: 'map-cyber',
  special: {
    start: { bg: '#9bbc0f', glyph: '◎', label: 'START' },
    holding: { bg: '#6b8c1e', glyph: '#', label: 'HOLD' },
    plaza: { bg: '#8bac0f', glyph: '◆', label: 'PLAZA' },
    dispatch: { bg: '#6b8c1e', glyph: '!', label: 'DISPATCH' },
    fortune: { bg: '#9bbc0f', glyph: '?' },
    ledger: { bg: '#8bac0f', glyph: '≡' },
    tax: { bg: '#7c9c18', glyph: '¤' },
  },
};
