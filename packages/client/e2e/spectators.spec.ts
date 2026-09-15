import { expect, test, type BrowserContext, type Page } from '@playwright/test';

async function openHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Ready to play')).toBeVisible();
}

async function joinByCode(page: Page, name: string, roomId: string): Promise<void> {
  await page.locator('#player-name').fill(name);
  await page.locator('#room-code').fill(roomId);
  await page.getByRole('button', { name: 'Join table' }).click();
}

test('player, spectator and reconnect profiles retain separate roles', async ({ browser, page: host }) => {
  test.setTimeout(45_000);
  const contexts: BrowserContext[] = [];
  const playerContext = await browser.newContext();
  const spectatorContext = await browser.newContext();
  contexts.push(playerContext, spectatorContext);
  const player = await playerContext.newPage();
  const spectator = await spectatorContext.newPage();

  try {
    await Promise.all([openHome(host), openHome(player), openHome(spectator)]);
    await host.locator('#player-name').fill('Host');
    await host.locator('#room-name').fill('Spectator browser test');
    await host.getByRole('button', { name: /Create a table/ }).click();
    await expect(host.getByRole('heading', { name: 'Spectator browser test' })).toBeVisible();
    const roomId = (await host.locator('.lobby-head .code-chip').textContent())!.trim();

    await joinByCode(player, 'Player', roomId);
    await expect(player.getByRole('heading', { name: 'Spectator browser test' })).toBeVisible();
    await host.getByLabel('Maximum spectators').fill('1');
    await host.getByRole('button', { name: 'Start game' }).click();
    await expect(player.getByRole('button', { name: 'Leave table' })).toBeVisible();

    await joinByCode(spectator, 'Watcher', roomId);
    await expect(spectator.getByRole('button', { name: 'Stop watching' })).toBeVisible();
    await expect(spectator.getByRole('textbox', { name: 'Chat message' })).toHaveCount(0);
    const hostSpectators = host.locator('.panel.spectators');
    await expect(hostSpectators).toContainText('Watcher');
    await expect(hostSpectators).toContainText('1/1 watching');

    const accessToggle = hostSpectators.getByLabel('Accept new spectators');
    await accessToggle.click();
    await expect(accessToggle).not.toBeChecked();
    await expect(spectator.locator('.panel.spectators')).toContainText('New spectator access is closed.');
    await spectator.reload();
    await expect(spectator.getByRole('button', { name: 'Stop watching' })).toBeVisible();
    await expect(hostSpectators).toContainText('Watcher');
    await expect(hostSpectators).toContainText('1/1 watching');

    await hostSpectators.getByRole('button', { name: 'Remove spectator Watcher' }).click();
    await expect(spectator.getByRole('heading', { name: /Big moves/ })).toBeVisible();
    await expect(hostSpectators).toContainText('Nobody is watching yet.');
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});
