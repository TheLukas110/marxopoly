import { districtLayout } from './layout.js';
import type { MapDefinition } from './types.js';

/**
 * The flat companion to Block Party: blueprint blue, ivory spaces, and
 * construction-yellow accents, with equal-width tracks.
 */
export const DUMMY: MapDefinition = {
  id: 'dummy',
  name: 'Block Party',
  description: 'A geometric construction playground with stacked blocks and a giant crane.',
  layout: districtLayout(),
  vars: {
    '--board-face': '#e7e3db',
    '--board-frame': '#52677f',
    '--board-gap': '3px',
    '--board-pad': '9px',
    '--board-radius': '10px',
    '--tile-ink': '#293d50',
    '--tile-price-ink': '#526476',
    '--tile-radius': '3px',
    '--tile-border': '1px solid #a6b2ba',
    '--centre-bg':
      'linear-gradient(145deg, #d7e1e3, #bbced5)',
    '--centre-ink': '#293d50',
    '--centre-muted': '#526476',
  },
  wrapClass: 'map-dummy',
  special: {
    start: { bg: '#99bba7', glyph: '◎', label: 'START' },
    holding: { bg: '#e2bf72', glyph: 'Ⅱ', label: 'HOLD' },
    plaza: { bg: '#97b5cc', glyph: '✳', label: 'PLAZA' },
    dispatch: { bg: '#dba18d', glyph: '!', label: 'DISPATCH' },
    fortune: { bg: '#e6cc8d', glyph: '?' },
    ledger: { bg: '#b8aed0', glyph: '≡' },
    tax: { bg: '#c8d0d2', glyph: '$' },
  },
};
