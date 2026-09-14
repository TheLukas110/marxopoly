import { useState } from 'react';
import { accountRequest, accountToken, useStore } from '../net.js';

export default function AccountPanel() {
  const account = useStore(s => s.account), busy = useStore(s => s.accountBusy), error = useStore(s => s.accountError), connected = useStore(s => s.connected);
  const [register, setRegister] = useState(false), [username, setUsername] = useState(''), [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  return <details className="card account-panel">
    <summary>{account ? `Account: ${account.username}` : 'Sign in / Create account'} <span className="muted">· Your saved boards & cards</span></summary>
    {error && <p role="alert">{error}</p>}
    {account ? <>
      <p>Save your custom streets and card decks in the lobby, then choose them when creating a table.</p>
      <div className="row"><button className="btn ghost" disabled={busy || !connected} onClick={() => void accountRequest({ action: 'restore', token: accountToken() })}>Refresh templates</button><button className="btn ghost" disabled={busy || !connected} onClick={() => void accountRequest({ action: 'logout', token: accountToken() })}>Sign out</button></div>
      {!account.templates.length && <p className="muted">No templates yet. Create a table and customise its cards and streets.</p>}
      <ul className="account-templates">{account.templates.map(template => <li key={template.id}>
        <span><strong>{template.name}</strong> · {Object.keys(template.tileNames).length} custom names · {template.cards.length} cards</span>
        {deleting === template.id ? <span className="row">Delete this template?<button className="btn small danger" disabled={busy || !connected} onClick={async () => { if (await accountRequest({ action: 'delete', token: accountToken(), templateId: template.id })) setDeleting(null); }}>Delete permanently</button><button className="btn ghost small" onClick={() => setDeleting(null)}>Cancel</button></span> : <button className="btn ghost small" disabled={busy} onClick={() => setDeleting(template.id)}>Delete</button>}
      </li>)}</ul>
    </> : <form onSubmit={async e => { e.preventDefault(); if (await accountRequest({ action: register ? 'register' : 'login', username, password })) setPassword(''); }}>
      <p>An account keeps your templates available on all your devices. You can also play as a guest.</p>
      <label className="field">Username<input className="input" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_\-]+" value={username} onChange={e => setUsername(e.target.value)} /></label>
      <label className="field">Password<input className="input" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={10} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <p className="muted small">Username: 3–24 letters, numbers, underscores or hyphens. Password: at least 10 characters. Keep your password safe; password recovery is not available yet.</p>
      <div className="row"><button className="btn primary" disabled={busy || !connected}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button><button type="button" className="btn ghost" disabled={busy} onClick={() => setRegister(!register)}>{register ? 'Already have an account? Sign in' : 'New here? Create account'}</button></div>
    </form>}
  </details>;
}

export function SaveTemplate() {
  const account = useStore(s => s.account), busy = useStore(s => s.accountBusy), connected = useStore(s => s.connected), error = useStore(s => s.accountError);
  const [name, setName] = useState(''), [id, setId] = useState(''), [saved, setSaved] = useState(false);
  if (!account) return <p className="muted">Sign in using the account panel to save these streets and cards for your next game.</p>;
  const existing = account.templates.find(t => t.id === id);
  return <form className="template-save" onSubmit={async e => { e.preventDefault(); setSaved(false); if (await accountRequest({ action: 'save', token: accountToken(), name, templateId: existing?.id })) setSaved(true); }}>
    <h3>Save streets & cards</h3>
    <label className="field">Save as<select className="input" value={existing?.id ?? ''} onChange={e => { setId(e.target.value); setName(account.templates.find(t => t.id === e.target.value)?.name ?? ''); setSaved(false); }}><option value="">New template</option>{account.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label className="field">Template name<input className="input" required maxLength={60} value={name} onChange={e => { setName(e.target.value); setSaved(false); }} /></label>
    <button className="btn primary" disabled={busy || !connected || !name.trim()}>{busy ? 'Saving…' : existing ? 'Overwrite selected template' : 'Save template'}</button>
    {saved && <p role="status">Template saved. You can select it when creating your next table.</p>}{error && <p role="alert">{error}</p>}
  </form>;
}
