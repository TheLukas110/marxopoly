import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test('external frontend rejects missing and wrong credentials, including for assets', async ({ baseURL }) => {
  test.skip(!process.env.E2E_BASE_URL, 'Only applies to an external Basic-Auth deployment.');
  expect(baseURL).toBeTruthy();

  const basic = (username: string, password: string) =>
    `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
  const request = (path: string, authorization?: string) => fetch(new URL(path, baseURL), {
    headers: authorization ? { Authorization: authorization } : undefined,
    redirect: 'manual',
  });
  const validAuthorization = basic(
    process.env.E2E_BASIC_AUTH_USER!,
    process.env.E2E_BASIC_AUTH_PASS!,
  );
  const invalidAuthorization = basic(
    `${process.env.E2E_BASIC_AUTH_USER!}-invalid`,
    process.env.E2E_BASIC_AUTH_PASS!,
  );

  for (const response of [await request('/'), await request('/', invalidAuthorization)]) {
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toMatch(/^Basic /);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  }

  const indexResponse = await request('/', validAuthorization);
  expect(indexResponse.ok).toBeTruthy();
  const index = await indexResponse.text();
  const assetPath = index.match(/(?:src|href)="([^"]*\/assets\/[^"]+)"/)?.[1];
  expect(assetPath).toBeTruthy();

  const assetResponse = await request(assetPath!);
  expect(assetResponse.status).toBe(401);
  expect(assetResponse.headers.get('cache-control')).toBe('private, no-store');
});

test('two isolated browser profiles can join, start, chat, roll and reconnect', async ({ browser }, testInfo) => {
  const contextOptions = testInfo.project.use.httpCredentials
    ? { httpCredentials: testInfo.project.use.httpCredentials }
    : {};
  const hostContext = await browser.newContext(contextOptions);
  const guestContext = await browser.newContext(contextOptions);
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  try {
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
  } finally {
    await Promise.all([hostContext.close(), guestContext.close()]);
  }
});
