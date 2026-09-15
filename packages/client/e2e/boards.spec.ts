import { expect, test } from '@playwright/test';

// Keep every selectable board covered here. The expedition maps arrived on
// main while this branch was in flight, so they need the same responsive and
// WebGL smoke coverage as the original set.
const maps = [
  'standard', 'cyber', 'poker', 'pride', 'dummy',
  'abyss', 'lunar', 'mycelium', 'oasis', 'confection', 'clockwork',
] as const;
const viewports = [
  { label: 'phone-narrow', width: 296, height: 700 },
  { label: 'phone', width: 390, height: 844 },
  { label: 'tablet', width: 600, height: 800 },
  { label: 'desktop-column', width: 800, height: 900 },
  { label: 'short-landscape', width: 600, height: 300 },
] as const;

for (const map of maps) {
  for (const viewport of viewports) {
    test(`${map} 2D · ${viewport.label} (${viewport.width}×${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/visual-regression.html?map=${map}&view=2d`);
      await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
      await expect(page.locator('.tile')).toHaveCount(40);
      await expect(page.locator('.board-token')).toHaveCount(8);
      await expect(page.locator('.tile.mortgaged')).toHaveCount(5);
      await expect(page.locator('.tile[title="The exceptionally long custom riverside cooperative boulevard"]')).toHaveCount(1);

      const layoutProblems = await page.locator('.board').evaluate(board => {
        const bounds = board.getBoundingClientRect();
        const tolerance = 1;
        const outside = [...board.querySelectorAll<HTMLElement>('.tile')]
          .filter(tile => {
            const rect = tile.getBoundingClientRect();
            return rect.left < bounds.left - tolerance || rect.top < bounds.top - tolerance ||
              rect.right > bounds.right + tolerance || rect.bottom > bounds.bottom + tolerance;
          })
          .map(tile => tile.title);
        const invalidTokens = [...board.querySelectorAll<HTMLElement>('.board-token')]
          .filter(token => !token.style.left.includes('%') || !token.style.top.includes('%') ||
            token.style.left.includes('NaN') || token.style.top.includes('NaN'))
          .length;
        return { outside, invalidTokens, width: bounds.width, height: bounds.height };
      });
      expect(layoutProblems.outside, `${map}/${viewport.label}: tiles outside board`).toEqual([]);
      expect(layoutProblems.invalidTokens, `${map}/${viewport.label}: invalid token coordinates`).toBe(0);
      expect(layoutProblems.width, `${map}/${viewport.label}: board has no width`).toBeGreaterThan(150);
      expect(layoutProblems.height, `${map}/${viewport.label}: board is not square`).toBeCloseTo(layoutProblems.width, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `${map}/${viewport.label}: page causes horizontal overflow`).toBe(true);
    });
  }

  test(`${map} 3D starts in Chromium`, async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await page.goto(`/visual-regression.html?map=${map}&view=3d`);
    const canvas = page.locator('.world-canvas');
    await expect(canvas).toBeVisible();
    await expect(page.locator('.world-error')).toHaveCount(0);
    await expect(page.locator('.world-property-select option')).toHaveCount(41);
    expect(await canvas.evaluate(element => {
      const target = element as HTMLCanvasElement;
      return !!(target.getContext('webgl2') || target.getContext('webgl'));
    }), `${map}: WebGL context unavailable`).toBe(true);
  });
}
