/** Protect every Pages route, including static assets. */
export async function onRequest(context) {
  const { request, env } = context;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
  const user = env.BASIC_AUTH_USER ?? (local ? 'local' : '');
  const pass = env.BASIC_AUTH_PASS ?? (local ? 'local-test' : '');
  let authenticated = false;
  const match = /^Basic\s+([A-Za-z0-9+/]+={0,2})$/i.exec(request.headers.get('Authorization') ?? '');
  if (user && pass && match) {
    try {
      const bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
      const credentials = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const separator = credentials.indexOf(':');
      authenticated = separator >= 0 && credentials.slice(0, separator) === user &&
        credentials.slice(separator + 1) === pass;
    } catch {
      // Malformed Base64 or UTF-8 is an unsuccessful login, not a server error.
    }
  }

  const downstream = authenticated ? await context.next() : null;
  const response = downstream
    ? new Response(downstream.body, downstream)
    : new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Protected", charset="UTF-8"' },
    });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}
