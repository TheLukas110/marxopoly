import { useState } from 'react';
import {
  disableTurnNotifications,
  enableTurnNotifications,
  notificationCapability,
  useTurnNotificationsEnabled,
} from '../turn-reminder-preferences.js';

export default function TurnReminderSettings() {
  const enabled = useTurnNotificationsEnabled();
  const [permission, setPermission] = useState(notificationCapability());
  const [busy, setBusy] = useState(false);
  const descriptionId = 'turn-reminder-description';
  const statusId = 'turn-reminder-status';
  const unavailable = permission === 'unsupported' || permission === 'denied';

  async function change(next: boolean) {
    if (!next) {
      disableTurnNotifications();
      return;
    }
    setBusy(true);
    const result = await enableTurnNotifications();
    setPermission(result);
    setBusy(false);
  }

  return <div className="turn-reminder-settings">
    <p id={descriptionId}>The page title always shows when it is your turn or your debt needs attention. You can also receive a browser notification while this tab is inactive.</p>
    <label className="check reminder-check">
      <input
        type="checkbox"
        checked={enabled}
        disabled={busy || unavailable}
        aria-describedby={`${descriptionId} ${statusId}`}
        onChange={(event) => { void change(event.target.checked); }}
      />
      <span>Browser notifications<em>Off by default. Your browser asks for permission only when you switch this on.</em></span>
    </label>
    <p id={statusId} className="reminder-permission" role="status" aria-live="polite">
      {busy ? 'Waiting for your browser…'
        : permission === 'unsupported' ? 'Browser notifications are not supported here. Title reminders still work.'
        : permission === 'denied' ? 'Notifications are blocked in your browser settings. Title reminders still work.'
        : enabled ? 'Notifications are on for inactive tabs.'
        : 'Notifications are off.'}
    </p>
  </div>;
}
