import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test('two isolated browser profiles can join, start, chat, roll and reconnect', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
    await host.goto('/');
    await expect(host.getByText('Ready to play')).toBeVisible();
    await host.locator('#player-name').fill('Hosted Alice');
    await host.locator('#room-name').fill('Deployment smoke');
    await host.locator('.private-check input').check();
    await host.getByRole('button', { name: /Create a table/ }).click();
    await expect(host.getByRole('heading', { name: 'Deployment smoke' })).toBeVisible();
    const roomId = (await host.locator('.lobby-head .code-chip').textContent())?.trim();
    expect(roomId).toMatch(/^[A-Z2-9]{6}$/);

    await guest.goto(`/?room=${roomId}`);
    await guest.locator('#invite-name').fill('Hosted Bob');
    await guest.getByRole('button', { name: 'Join table' }).click();
    await expect(guest.getByRole('heading', { name: 'Deployment smoke' })).toBeVisible();
    await expect(host.getByRole('heading', { name: /Players \(2\/8\)/ })).toBeVisible();
    await host.getByRole('button', { name: '2D', exact: true }).click();
    await guest.getByRole('button', { name: '2D', exact: true }).click();

    await host.getByRole('button', { name: 'Start game' }).click();
    await expect(host.locator('.game')).toBeVisible();
    await expect(guest.locator('.game')).toBeVisible();

    await host.getByRole('button', { name: 'Chat', exact: true }).click();
    await host.getByLabel('Chat message').fill('Hello from the protected deployment');
    await host.getByRole('button', { name: 'Send', exact: true }).click();
    await guest.getByRole('button', { name: /^Chat/ }).click();
    await expect(guest.getByText('Hello from the protected deployment')).toBeVisible();

    await host.getByRole('button', { name: 'Roll dice' }).click();
    await guest.getByRole('button', { name: 'Activity', exact: true }).click();
    await expect(guest.getByRole('region', { name: 'Game activity' })).toContainText(/Hosted Alice rolled/);

    await guest.reload();
    await expect(guest.locator('.game')).toBeVisible();
    await guest.getByRole('button', { name: /^Chat/ }).click();
    await expect(guest.getByRole('region', { name: 'Table chat' })).toContainText('Hello from the protected deployment');
});
