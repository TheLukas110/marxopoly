import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Native dialogs keep keyboard focus inside and restore it to the opener. */
export default function GameDialog({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="game-dialog" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    } }}>
    <header><h2 id={titleId}>{title}</h2><button className="btn ghost small" onClick={onClose} aria-label="Close dialog">×</button></header>
    {children}
  </dialog>;
}
