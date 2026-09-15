import { useEffect, useRef } from 'react';
import { useStore } from '../net.js';
import { useTurnNotificationsEnabled } from '../turn-reminder-preferences.js';
import { currentTurnReminder, deliverTurnReminder, TurnReminderTracker } from '../turn-reminders.js';

export default function TurnReminderManager() {
  const game = useStore((state) => state.game);
  const playerId = useStore((state) => state.playerId);
  const spectator = useStore((state) => state.spectator);
  const enabled = useTurnNotificationsEnabled();
  const tracker = useRef(new TurnReminderTracker());
  const originalTitle = useRef(document.title);

  useEffect(() => () => { document.title = originalTitle.current; }, []);

  useEffect(() => {
    const current = currentTurnReminder(game, playerId, spectator);
    document.title = current ? `● ${current.title} — Marxopoly` : originalTitle.current;

    const event = tracker.current.next(game, playerId, spectator);
    if (typeof Notification === 'undefined') return;
    deliverTurnReminder(event, enabled, {
      visibilityState: document.visibilityState,
      permission: Notification.permission,
      notify: (title, options) => { new Notification(title, options); },
    });
  }, [enabled, game, playerId, spectator]);

  return null;
}
