import { expect, test, type BrowserContext, type Page } from '@playwright/test';

async function openHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.connection-status')).toHaveText('Ready to play');
}

async function installNotificationStub(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const notices: Array<{ title: string; body?: string }> = [];
    class FakeNotification {
      static permission: NotificationPermission = 'default';
      static requestPermission() {
        (window as typeof window & { __permissionRequests?: number }).__permissionRequests =
          ((window as typeof window & { __permissionRequests?: number }).__permissionRequests ?? 0) + 1;
        FakeNotification.permission = 'granted';
        return Promise.resolve<NotificationPermission>('granted');
      }
      constructor(title: string, options?: NotificationOptions) {
        notices.push({ title, body: options?.body });
      }
    }
    Object.defineProperty(window, 'Notification', { configurable: true, value: FakeNotification });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (window as typeof window & { __reminderHidden?: boolean }).__reminderHidden ? 'hidden' : 'visible',
    });
    (window as typeof window & { __notices?: typeof notices }).__notices = notices;
  });
}

async function finishTurn(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Roll dice' }).click();
  for (let step = 0; step < 8; step += 1) {
    const confirm = page.getByRole('button', { name: /Confirm card/ }).first();
    const buy = page.getByRole('button', { name: /^Buy / }).first();
    const end = page.getByRole('button', { name: 'End turn' }).first();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    else if (await buy.isVisible().catch(() => false)) await buy.click();
    else if (await end.isVisible().catch(() => false)) { await end.click(); return; }
    await page.waitForTimeout(100);
  }
  throw new Error('Could not finish the active turn');
}

test('turn reminders work across desktop, mobile, permission and tab visibility', async ({ browser, page: host }) => {
  test.setTimeout(60_000);
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installNotificationStub(guestContext);
  const guest = await guestContext.newPage();
  try {
    await Promise.all([openHome(host), openHome(guest)]);
    await host.locator('#player-name').fill('Ada');
    await host.locator('#room-name').fill('Reminder browser test');
    await host.getByRole('button', { name: /Create a table/ }).click();
    const roomId = (await host.locator('.lobby-head .code-chip').textContent())!.trim();
    await guest.locator('#player-name').fill('Brix');
    await guest.locator('#room-code').fill(roomId);
    await guest.getByRole('button', { name: 'Join table' }).click();
    await host.getByRole('button', { name: 'Start game' }).click();

    await expect(host).toHaveTitle(/● YOUR TURN — Marxopoly/);
    await expect(guest).toHaveTitle('Marxopoly — Big moves. Small world.');

    await guest.getByRole('button', { name: 'Table', exact: true }).click();
    await guest.getByRole('button', { name: 'Turn reminders' }).click();
    const dialog = guest.getByRole('dialog', { name: 'Turn reminders' });
    const toggle = dialog.getByRole('checkbox', { name: 'Browser notifications' });
    await expect(toggle).not.toBeChecked();
    expect(await guest.evaluate(() => (window as typeof window & { __permissionRequests?: number }).__permissionRequests ?? 0)).toBe(0);
    await toggle.check();
    await expect(toggle).toBeChecked();
    await expect(dialog.getByRole('status')).toHaveText('Notifications are on for inactive tabs.');
    expect(await guest.evaluate(() => (window as typeof window & { __permissionRequests?: number }).__permissionRequests)).toBe(1);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.getByRole('button', { name: 'Close dialog' }).click();

    await guest.evaluate(() => { (window as typeof window & { __reminderHidden?: boolean }).__reminderHidden = true; });
    await finishTurn(host);
    await expect(guest).toHaveTitle(/● YOUR TURN — Marxopoly/);
    await expect(host).toHaveTitle('Marxopoly — Big moves. Small world.');
    await expect.poll(() => guest.evaluate(() => (window as typeof window & { __notices?: unknown[] }).__notices?.length ?? 0)).toBe(1);
    const notice = await guest.evaluate(() => (window as typeof window & { __notices?: Array<{ title: string }> }).__notices?.[0]);
    expect(notice?.title).toBe('Marxopoly — your turn');
  } finally {
    await guestContext.close();
  }
});
