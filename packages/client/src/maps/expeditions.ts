import { ringLayout } from './layout.js';
import type { MapDefinition } from './types.js';

// Shared construction keeps every expedition on the same playable perimeter.
function expedition(id: string, name: string, description: string, face: string, frame: string, ink: string, centre: string, colors: string[], glyph: string): MapDefinition {
  return {
    id, name, description, layout: ringLayout(), wrapClass: `map-expedition map-${id}`,
    vars: {
      '--board-face': face, '--board-frame': frame, '--tile-ink': ink,
      '--tile-price-ink': ink, '--tile-border': `1px solid ${frame}`,
      '--centre-bg': centre, '--centre-ink': ink, '--centre-muted': ink,
      '--expedition-accent': frame, '--expedition-glyph': `"${glyph}"`,
    },
    special: {
      start: { bg: colors[0], glyph: '◎', label: 'START' },
      holding: { bg: colors[1], glyph: '⏸', label: 'HOLD' },
      plaza: { bg: colors[2], glyph, label: 'PLAZA' },
      dispatch: { bg: colors[3], glyph: '⚑', label: 'DISPATCH' },
      fortune: { bg: colors[2], glyph: '?' },
      ledger: { bg: colors[0], glyph: '≡' },
      tax: { bg: colors[1], glyph: '¤' },
    },
  };
}

export const EXPEDITIONS: readonly MapDefinition[] = [
  expedition('abyss', 'The Sunken Observatory', 'An ocean chart of tidal rings, pearl tiles, and coral landmarks.', '#e0f5f2', '#347b87', '#123f50', 'repeating-radial-gradient(ellipse at 50% 55%, #c3e7e6 0 18px, #b4dedd 19px 20px, #c3e7e6 21px 40px)', ['#a7dfd2', '#b9d8ed', '#f2c5b4', '#c8c7e9'], '⚓'),
  expedition('lunar', 'Moonbase Commons', 'A mission blueprint with orbital paths and an indigo star field.', '#e4e9fa', '#7587b6', '#233154', 'radial-gradient(circle at 20% 25%, #9da9d5 1px, transparent 2px) 0 0 / 29px 31px, radial-gradient(ellipse at 65% 30%, #354675, #18243f)', ['#b7ddd8', '#d3d2ec', '#e9d8aa', '#d9c2dd'], '☾'),
  expedition('mycelium', 'Mushroom Hollow', 'A mossy botanical print with fairy rings and warm parchment tiles.', '#f6efd9', '#79845a', '#343e28', 'repeating-radial-gradient(circle at 50% 50%, #dbe2bf 0 35px, #c8d4ad 36px 38px, #dbe2bf 39px 70px)', ['#c7dcaa', '#edd5ab', '#ebbbb0', '#d4c4dc'], '♣'),
  expedition('oasis', 'The Saffron Caravan', 'A desert atlas of tiled courtyards, turquoise water, and sunlit dunes.', '#fff0d5', '#b4824d', '#563c29', 'repeating-conic-gradient(from 45deg, #e9cc96 0% 25%, #f3ddb0 0% 50%) 0 0 / 36px 36px', ['#baddcb', '#edd3a4', '#a9dadd', '#efbda3'], '☀'),
  expedition('confection', 'Sugarplum Borough', 'A candy-striped board of sherbet pastels and a peppermint plaza.', '#fff2f2', '#bc7796', '#64364f', 'repeating-linear-gradient(135deg, #f8d9e4 0 22px, #fff0df 22px 44px)', ['#c4e5d6', '#f3d7a6', '#dfc7ec', '#f3bdcb'], '♥'),
  expedition('clockwork', 'The Brass Republic', 'An engraved drafting table with copper rails and precision gridwork.', '#f2e3c8', '#967148', '#4d3928', 'linear-gradient(#9c805327 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, #9c805327 1px, transparent 1px) 0 0 / 24px 24px, #e1cfaa', ['#c6d8c0', '#e6c797', '#bcd6d4', '#e6bda3'], '⚙'),
];
