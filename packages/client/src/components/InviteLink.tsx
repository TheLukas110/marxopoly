import { useState } from 'react';
import { useStore } from '../net.js';
import { invitationUrl } from '../invitations.js';

export default function InviteLink({ roomId }: { roomId: string }) {
  const publicUrl = useStore((s) => s.publicUrl);
  const shareEnabled = useStore((s) => s.shareEnabled);
  const [copied, setCopied] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const url = invitationUrl(publicUrl ?? window.location.origin, roomId);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <section className="card invite-link">
      <h2>Invite friends</h2>
      <p className="muted">Send this link. Your friends only need to choose a name to join this table.</p>
      <div className="row">
        <input className="input" aria-label="Room invitation link" value={url} readOnly
          onFocus={(event) => event.currentTarget.select()} />
        <button className="btn" onClick={() => void copy()}>{copied === url ? 'Copied!' : 'Copy invitation'}</button>
      </div>
      {copyFailed && <p role="status">Select the link above and copy it to share.</p>}
      {!publicUrl && <p className="muted">
        {shareEnabled
          ? 'The public tunnel is not ready. This link uses your current address; it updates automatically when ngrok connects. Check the server terminal if it stays unavailable.'
          : 'For friends outside your network, start the game with pnpm share to get a public ngrok invitation here.'}
      </p>}
    </section>
  );
}
