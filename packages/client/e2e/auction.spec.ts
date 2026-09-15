import { expect, test, type BrowserContext, type Page } from '@playwright/test';

async function waitUntilConnected(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Ready to play')).toBeVisible();
}

async function joinTable(page: Page, name: string, roomId: string): Promise<void> {
  await page.locator('#player-name').fill(name);
  await page.locator('#room-code').fill(roomId);
  await page.getByRole('button', { name: 'Join table' }).click();
  await expect(page.getByRole('heading', { name: 'Sealed browser test' })).toBeVisible();
}

async function visibleAction(page: Page, name: string | RegExp) {
  const button = page.getByRole('button', { name }).first();
  return await button.isVisible().catch(() => false) ? button : null;
}

test('three browser profiles keep sealed bids private until evaluation', async ({ browser, page: host }) => {
  test.setTimeout(60_000);
  const contexts: BrowserContext[] = [];
  const guestContext = await browser.newContext();
  const thirdContext = await browser.newContext();
  contexts.push(guestContext, thirdContext);
  const guest = await guestContext.newPage();
  const third = await thirdContext.newPage();

  try {
    await Promise.all([waitUntilConnected(host), waitUntilConnected(guest), waitUntilConnected(third)]);
    await host.locator('#player-name').fill('Ada');
    await host.locator('#room-name').fill('Sealed browser test');
    await host.getByRole('button', { name: /Create a table/ }).click();
    await expect(host.getByRole('heading', { name: 'Sealed browser test' })).toBeVisible();
    const roomId = (await host.locator('.lobby-head .code-chip').textContent())!.trim();

    await joinTable(guest, 'Brix', roomId);
    await joinTable(third, 'Cleo', roomId);
    await expect(host.getByRole('heading', { name: 'Players (3/8)' })).toBeVisible();

    await host.getByLabel('Auction style').selectOption('sealed');
    await host.getByLabel('Turn timer (seconds, 0 = off)').fill('0');
    await expect(guest.getByLabel('Auction style')).toHaveValue('sealed');
    await expect(third.getByLabel('Auction style')).toHaveValue('sealed');
    await host.getByRole('button', { name: 'Start game' }).click();

    const profiles = [host, guest, third];
    let auctionStarted = false;
    for (let attempt = 0; attempt < 40 && !auctionStarted; attempt += 1) {
      for (const profile of profiles) {
        if (await profile.getByRole('heading', { name: 'Sealed auction' }).isVisible().catch(() => false)) {
          auctionStarted = true;
          break;
        }
        const confirm = await visibleAction(profile, /Confirm card/);
        const decline = await visibleAction(profile, 'Send to auction');
        const roll = await visibleAction(profile, 'Roll dice');
        const end = await visibleAction(profile, 'End turn');
        const action = confirm ?? decline ?? roll ?? end;
        if (action) {
          await action.click();
          await profile.waitForTimeout(100);
        }
      }
    }

    expect(auctionStarted).toBe(true);
    const hostAuction = host.locator('.modal.auction');
    const guestAuction = guest.locator('.modal.auction');
    const thirdAuction = third.locator('.modal.auction');
    await Promise.all([
      expect(hostAuction).toBeVisible(),
      expect(guestAuction).toBeVisible(),
      expect(thirdAuction).toBeVisible(),
    ]);

    await hostAuction.locator('input[type="number"]').fill('111');
    await hostAuction.getByRole('button', { name: 'Submit $111' }).click();
    await expect(hostAuction).toContainText('Your sealed bid of $111 is locked in.');
    await expect(guestAuction).not.toContainText('$111');

    await guestAuction.locator('input[type="number"]').fill('222');
    await guestAuction.getByRole('button', { name: 'Submit $222' }).click();
    await expect(guestAuction).toContainText('Your sealed bid of $222 is locked in.');
    await expect(thirdAuction).not.toContainText('$222');

    await thirdAuction.getByRole('button', { name: 'Pass' }).click();
    await expect(hostAuction).toBeHidden();
    await expect(host.getByText(/Brix won .* at auction for \$222/)).toBeVisible();
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});
