import { useEffect, useId, useRef, useState } from 'react';
import type { GameState } from '@marxopoly/shared';
import { sendChat, useStore } from '../net.js';

interface Props {
  state: GameState;
  onUnreadChange?: (count: number) => void;
}

export default function LogPanel({ state, onUnreadChange }: Props) {
  const [tab, setTab] = useState<'log' | 'chat'>('log');
  const chat = useStore((s) => s.chat);
  const spectating = useStore((s) => s.spectator);
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const lastMessageId = chat.at(-1)?.id;
  const [seenChat, setSeenChat] = useState(lastMessageId);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(!document.hidden);
  const following = useRef(true);
  const panelId = useId();
  const unread = chat.length - (seenChat ? chat.findIndex(message => message.id === seenChat) + 1 : 0);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(scroller.current!);
    const onVisibility = () => setDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => { onUnreadChange?.(unread); }, [unread, onUnreadChange]);

  useEffect(() => {
    if (!visible || !documentVisible) return;
    if (following.current) {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
      if (tab === 'chat') setSeenChat(lastMessageId);
    }
  }, [state.log.at(-1)?.id, lastMessageId, tab, visible, documentVisible]);
  function changeTab(next: 'log' | 'chat') { following.current = true; setTab(next); }

  return (
    <div className="panel log">
      <div className="tabs" aria-label="Conversation view">
        <button aria-pressed={tab === 'log'} aria-controls={panelId} className={tab === 'log' ? 'active' : ''} onClick={() => changeTab('log')}>
          Activity
        </button>
        <button aria-pressed={tab === 'chat'} aria-controls={panelId} className={tab === 'chat' ? 'active' : ''} onClick={() => changeTab('chat')}>
          Chat {unread > 0 && <span className="notification-count">{unread}</span>}
        </button>
      </div>

      <div className="log-scroll" id={panelId} ref={scroller} role="region" aria-label={tab === 'log' ? 'Game activity' : 'Table chat'} tabIndex={0} onScroll={(event) => { const el = event.currentTarget; following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; if (following.current && visible && documentVisible && tab === 'chat') setSeenChat(lastMessageId); }}>
        {tab === 'chat' && chat.length === 0 && <div className="chat-empty"><strong>{spectating ? 'Follow the table talk' : 'A little table talk?'}</strong><p>{spectating ? 'Messages from the players will appear here.' : 'Say hello, celebrate a good roll or talk through a deal.'}</p></div>}
        {tab === 'log'
          ? state.log.slice(-120).map((entry) => {
              const player = state.players.find((p) => p.id === entry.playerId);
              return (
                <div key={entry.id} className={`log-line ${entry.kind}`}>
                  {player && <span className="chip xs" style={{ background: player.color }} />}
                  <span>{entry.text}</span>
                </div>
              );
            })
          : chat.map((m) => (
              <div key={m.id} className="chat-line">
                <span className="chip xs" style={{ background: m.color }} />
                <span className="chat-content">
                  <strong>{m.name}</strong>{' '}
                  <span>{m.text}</span>
                </span>
              </div>
            ))}
      </div>

      {tab === 'chat' && spectating && <p className="spectator-chat-note">You’re watching. Only seated players can send messages.</p>}
      {tab === 'chat' && !spectating && (
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            sendChat(draft.trim());
            following.current = true;
            setDraft('');
          }}
        >
          <input
            className="input"
            aria-label="Chat message"
            value={draft}
            maxLength={300}
            placeholder="Say something…"
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn small" type="submit" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
