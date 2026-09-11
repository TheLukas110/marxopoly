/** Invitations carry only the room code, never a player's reconnect token. */
export function invitedRoom(search: string): string | null {
  const code = new URLSearchParams(search).get('room')?.trim().toUpperCase();
  return code || null;
}

export function invitationUrl(base: string, roomId: string): string {
  const url = new URL(base);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', roomId);
  return url.toString();
}

export function clearInvitation(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  window.history.replaceState(null, '', url);
}
