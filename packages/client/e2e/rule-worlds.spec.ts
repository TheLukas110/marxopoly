import { expect, test, type BrowserContext, type Page } from '@playwright/test';

async function openHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#player-name')).toBeVisible();
  await expect(page.locator('.connection-status')).toHaveText('Ready to play');
}

test('authoritative rule world stays consistent in 2D, 3D, mobile and reconnect', async ({ browser, page: host }) => {
  test.setTimeout(60_000);
  const guestContext: BrowserContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guest = await guestContext.newPage();
  try {
    await Promise.all([openHome(host), openHome(guest)]);
    await host.locator('#player-name').fill('Ada');
    await host.locator('#room-name').fill('Rule world browser test');
    await host.getByRole('button', { name: /Create a table/ }).click();
    const roomId = (await host.locator('.lobby-head .code-chip').textContent())!.trim();

    await guest.locator('#player-name').fill('Brix');
    await guest.locator('#room-code').fill(roomId);
    await guest.getByRole('button', { name: 'Join table' }).click();
    await host.getByLabel('Shared rule world').selectOption('clockwork');
    await expect(guest.getByLabel('Shared rule world')).toHaveValue('clockwork');
    await expect(guest.getByText('A faster, higher-stakes economy driven by the great civic clock.')).toBeVisible();

    await host.getByRole('button', { name: 'Start game' }).click();
    await expect(host.locator('.tile[title="Copper Mews"]')).toBeVisible();
    await expect(host.locator('.tile[title="Copper Mews"] .tile-price')).toHaveText('$90');
    await expect(guest.locator('.game')).toHaveAttribute('data-mobile-panel', 'board');
    await expect(guest.locator('.tile[title="Republic Rotunda"]')).toHaveCount(1);

    await host.getByRole('button', { name: '3D world' }).click();
    await expect(host.locator('.world-canvas')).toBeVisible();
    await expect(host.getByLabel('Inspect a board space').getByRole('option', { name: /Copper Mews.*\$90/ })).toHaveCount(1);

    await guest.reload();
    await expect(guest.locator('.tile[title="Copper Mews"]')).toHaveCount(1);
    await guest.getByRole('button', { name: 'Table', exact: true }).click();
    await guest.getByRole('button', { name: 'Table rules' }).click();
    await expect(guest.getByRole('dialog', { name: 'Table rules' }).getByText('The Brass Republic')).toBeVisible();
  } finally {
    await guestContext.close();
  }
});
