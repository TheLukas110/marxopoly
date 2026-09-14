import { randomBytes, randomUUID, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import type { GameState, SavedTemplate } from '@marxopoly/shared';

interface Account {
  id: string; username: string; salt: string; hash: string;
  sessions: { hash: string; expires: number }[];
  templates: SavedTemplate[];
}
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const passwordHash = (password: string, salt: string): Promise<Buffer> => new Promise((resolve, reject) => {
  scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key));
});

/** One server process owns this file. Writes are serialized and atomically replaced. */
export class AccountStore {
  private accounts: Account[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private ready: Promise<void>;
  constructor(private filename: string) {
    this.ready = readFile(filename, 'utf8').then(raw => { this.accounts = JSON.parse(raw); }).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  private mutate<T>(fn: () => Promise<T> | T): Promise<T> {
    const result = this.queue.then(async () => {
      await this.ready;
      const before = structuredClone(this.accounts);
      try {
        const value = await fn();
        await mkdir(path.dirname(this.filename), { recursive: true });
        await writeFile(`${this.filename}.tmp`, JSON.stringify(this.accounts), { mode: 0o600 });
        await rename(`${this.filename}.tmp`, this.filename);
        return value;
      } catch (error) { this.accounts = before; throw error; }
    });
    this.queue = result.catch(() => {});
    return result;
  }
  async authenticate(username: unknown, password: unknown, register: boolean) {
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,24}$/.test(username.trim())) throw new Error('Use 3–24 letters, numbers, underscores or hyphens for your username.');
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) throw new Error('Use a password with 10–128 characters.');
    const name = username.trim();
    return this.mutate(async () => {
      let account = this.accounts.find(a => a.username.toLowerCase() === name.toLowerCase());
      if (register) {
        if (account) throw new Error('That username is already taken.');
        const salt = randomBytes(16).toString('hex');
        account = { id: randomUUID(), username: name, salt, hash: (await passwordHash(password, salt)).toString('hex'), sessions: [], templates: [] };
        this.accounts.push(account);
      } else {
        const candidate = await passwordHash(password, account?.salt ?? 'unknown-account');
        if (!account || !timingSafeEqual(candidate, Buffer.from(account.hash, 'hex'))) throw new Error('Username or password is incorrect.');
      }
      const token = randomBytes(32).toString('hex');
      account.sessions = account.sessions.filter(s => s.expires > Date.now()).slice(-9);
      account.sessions.push({ hash: digest(token), expires: Date.now() + 30 * 86400_000 });
      return { token, ...this.publicAccount(account) };
    });
  }
  private require(token: unknown): Account {
    if (typeof token !== 'string' || token.length !== 64) throw new Error('Please sign in again.');
    const account = this.accounts.find(a => a.sessions.some(s => s.hash === digest(token) && s.expires > Date.now()));
    if (!account) throw new Error('Please sign in again.');
    return account;
  }
  private publicAccount(account: Account) {
    return { username: account.username, templates: structuredClone(account.templates) };
  }
  async restore(token: string) {
    await this.ready; await this.queue;
    return this.publicAccount(this.require(token));
  }
  async template(token: string, id: string) {
    const account = await this.restore(token);
    const template = account.templates.find(t => t.id === id);
    if (!template) throw new Error('That template no longer exists.');
    return template;
  }
  logout(token: string) {
    return this.mutate(() => {
      const account = this.require(token);
      account.sessions = account.sessions.filter(s => s.hash !== digest(token));
    });
  }
  save(token: string, name: unknown, state: GameState, templateId?: string) {
    const snapshot = structuredClone({ tileNames: state.tileNames, cards: state.cards });
    return this.mutate(() => {
      const account = this.require(token);
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) throw new Error('Choose a template name with 1–60 characters.');
      const existing = templateId ? account.templates.find(t => t.id === templateId) : undefined;
      if (templateId && !existing) throw new Error('That template no longer exists.');
      if (!existing && account.templates.length >= 50) throw new Error('You can save up to 50 templates.');
      if (snapshot.cards.length > 200) throw new Error('Templates can contain up to 200 cards.');
      const template = { id: existing?.id ?? randomUUID(), name: name.trim(), updatedAt: Date.now(), ...snapshot };
      if (existing) account.templates[account.templates.indexOf(existing)] = template;
      else account.templates.push(template);
      return this.publicAccount(account);
    });
  }
  delete(token: string, id: string) {
    return this.mutate(() => {
      const account = this.require(token);
      if (!account.templates.some(t => t.id === id)) throw new Error('That template no longer exists.');
      account.templates = account.templates.filter(t => t.id !== id);
      return this.publicAccount(account);
    });
  }
}
