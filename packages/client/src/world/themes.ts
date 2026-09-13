export interface WorldTheme { name: string; eyebrow: string; description: string; accent: string; ground: string; base: string; tile: string; sky: string; }
export const WORLD_THEMES: Record<string, WorldTheme> = {
  standard: { name: 'Civic Gardens', eyebrow: 'THE ORIGINAL DISTRICT', description: 'Terracotta rooftops, tree-lined avenues, and a clock tower at the heart of it all.', accent: '#e6ab69', ground: '#91a984', base: '#344944', tile: '#e9e4d3', sky: '#172e2b' },
  cyber: { name: 'Neon Circuit', eyebrow: 'AFTER HOURS, ABOVE THE CITY', description: 'A vertical metropolis of luminous towers, elevated links, and a floating data core.', accent: '#6aeddc', ground: '#1d3443', base: '#15232e', tile: '#476176', sky: '#10252d' },
  poker: { name: 'The High Roller', eyebrow: 'A SEAT AT THE BIG TABLE', description: 'Chip-stack skyscrapers, a house of cards, and a golden crown over deep green felt.', accent: '#e4bd72', ground: '#28664e', base: '#57392b', tile: '#f3e8cc', sky: '#18392c' },
  pride: { name: 'Spectrum Festival', eyebrow: 'EVERY COLOUR BELONGS', description: 'Walk beneath a sculpted rainbow, past a festival stage and a colourful observation wheel.', accent: '#efa6d1', ground: '#b6c6ac', base: '#806c99', tile: '#f4e7e3', sky: '#342e46' },
  dummy: { name: 'Block Party', eyebrow: 'BUILD SOMETHING UNEXPECTED', description: 'A playful construction world of stacked blocks, a working skyline, and a giant yellow crane.', accent: '#e4cb75', ground: '#8ba4b1', base: '#394b66', tile: '#e7e3db', sky: '#223244' },
};
export function worldTheme(id: string): WorldTheme { return WORLD_THEMES[id] ?? WORLD_THEMES.standard; }
