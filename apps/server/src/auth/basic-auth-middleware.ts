import { createHash, timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

type Credentials = { username: string; password: string };

/**
 * KoSync endpoints that authenticate with their own x-auth-user / x-auth-key
 * headers. They are left open so the built-in KOReader progress sync keeps working.
 */
const KOSYNC_SELF_AUTHENTICATED = [
  { method: 'GET', pattern: /^\/users\/auth\/?$/ },
  { method: 'PUT', pattern: /^\/syncs\/progress\/?$/ },
  { method: 'GET', pattern: /^\/syncs\/progress\/[^/]+\/?$/ },
];

// Hashing first gives equal-length buffers, so the comparison is constant-time
function safeEqual(a: string, b: string): boolean {
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

function parseBasicAuth(header: string | undefined): Credentials | null {
  if (!header?.startsWith('Basic ')) {
    return null;
  }

  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator === -1) {
    return null;
  }

  return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

function isKosyncSelfAuthenticated(req: Request): boolean {
  return KOSYNC_SELF_AUTHENTICATED.some(
    ({ method, pattern }) => req.method === method && pattern.test(req.path)
  );
}

/**
 * Protects the web UI and API with HTTP Basic Auth.
 * The KOReader plugin authenticates by embedding the credentials in the server URL,
 * e.g. https://user:password@koinsight.example.com
 */
export function basicAuth(expected: Credentials) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isKosyncSelfAuthenticated(req)) {
      next();
      return;
    }

    const credentials = parseBasicAuth(req.header('authorization'));
    const usernameMatches = safeEqual(credentials?.username ?? '', expected.username);
    const passwordMatches = safeEqual(credentials?.password ?? '', expected.password);

    if (credentials && usernameMatches && passwordMatches) {
      next();
      return;
    }

    res.set('WWW-Authenticate', 'Basic realm="KoInsight", charset="UTF-8"');
    res.status(401).json({ error: 'Unauthorized' });
  };
}
