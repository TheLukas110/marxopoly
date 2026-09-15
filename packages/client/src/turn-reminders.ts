import type { GameState } from '@marxopoly/shared';

export type TurnReminderKind = 'turn' | 'debt';

export interface TurnReminder {
  kind: TurnReminderKind;
  title: string;
  body: string;
}

function eligiblePlayer(state: GameState | null, myId: string | null, spectator: boolean) {
  if (!state || !myId || spectator || state.phase === 'lobby' || state.phase === 'game_over') return null;
  const me = state.players.find((player) => player.id === myId);
  return me && !me.isBot && !me.bankrupt ? me : null;
}

/** The reminder currently represented in the page title. */
export function currentTurnReminder(
  state: GameState | null,
  myId: string | null,
  spectator: boolean,
): TurnReminder | null {
  const me = eligiblePlayer(state, myId, spectator);
  if (!state || !me) return null;
  if (state.phase === 'debt' && state.debt?.debtorId === me.id) {
    return {
      kind: 'debt',
      title: 'ACTION NEEDED',
      body: 'You owe money at the table. Return to Marxopoly to resolve it.',
    };
  }
  const current = state.players.find((player) => player.seat === state.turnSeat && !player.bankrupt);
  if (current?.id !== me.id) return null;
  return {
    kind: 'turn',
    title: 'YOUR TURN',
    body: 'Your turn has started. Return to Marxopoly to make your move.',
  };
}

/**
 * Tracks action episodes independently of the frequently changing game state.
 * An auction or debt can temporarily replace the turn UI without starting a
 * second turn when the normal post-roll phase returns.
 */
export class TurnReminderTracker {
  private gameId: string | null = null;
  private ownTurnEpisode = false;
  private ownDebtActive = false;

  next(state: GameState | null, myId: string | null, spectator: boolean): TurnReminder | null {
    if (state?.id !== this.gameId) {
      this.gameId = state?.id ?? null;
      this.ownTurnEpisode = false;
      this.ownDebtActive = false;
    }

    const me = eligiblePlayer(state, myId, spectator);
    const current = state?.players.find((player) => player.seat === state.turnSeat && !player.bankrupt);
    const ownsTurn = !!state && !!me && current?.id === me.id;
    const ownsDebt = !!state && !!me && state.phase === 'debt' && state.debt?.debtorId === me.id;
    const reminder = currentTurnReminder(state, myId, spectator);

    let event: TurnReminder | null = null;
    if (ownsDebt && !this.ownDebtActive) event = reminder;
    else if (reminder?.kind === 'turn' && !this.ownTurnEpisode) event = reminder;

    this.ownTurnEpisode = ownsTurn;
    this.ownDebtActive = ownsDebt;
    return event;
  }
}

export interface ReminderDeliveryTarget {
  visibilityState: string;
  permission: NotificationPermission;
  notify: (title: string, options: NotificationOptions) => void;
}

/** Deliver only while the tab is inactive and permission is already granted. */
export function deliverTurnReminder(
  reminder: TurnReminder | null,
  enabled: boolean,
  target: ReminderDeliveryTarget,
): boolean {
  if (!reminder || !enabled || target.visibilityState === 'visible' || target.permission !== 'granted') return false;
  try {
    target.notify(reminder.title === 'YOUR TURN' ? 'Marxopoly — your turn' : 'Marxopoly — action needed', {
      body: reminder.body,
    });
    return true;
  } catch {
    return false;
  }
}
