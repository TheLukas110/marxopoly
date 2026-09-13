export interface LabelBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
}

/** Keep labels at their tile anchors; omit crowded ones instead of covering the board. */
export function visibleLabels<T extends LabelBox>(candidates: T[], width: number, height: number): T[] {
  const accepted: T[] = [];
  const gap = 5;
  for (const box of [...candidates].sort((a, b) => b.priority - a.priority || b.y - a.y || a.id - b.id)) {
    if (box.x < gap || box.y < gap || box.x + box.width > width - gap || box.y + box.height > height - gap) continue;
    if (accepted.some(other => box.x < other.x + other.width + gap && box.x + box.width + gap > other.x
      && box.y < other.y + other.height + gap && box.y + box.height + gap > other.y)) continue;
    accepted.push(box);
  }
  return accepted;
}
