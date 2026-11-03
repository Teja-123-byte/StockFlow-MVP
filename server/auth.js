import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'stockflow_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(request, name) {
  const header = request.headers.cookie;
  if (!header) return null;

  for (const item of header.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) {
      return item.slice(separator + 1).trim();
    }
  }
  return null;
}

function setSessionCookie(response, token, secureCookies) {
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(response, secureCookies) {
  response.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
  });
}

function createSession(database, userId) {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  database.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(now);
  database.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(hashToken(token), userId, now + SESSION_TTL_MS, now);
  return token;
}

function getPublicUser(database, userId) {
  return database.prepare(`
    SELECT users.id, users.email, organizations.id AS organizationId,
      organizations.name AS orgName
    FROM users
    JOIN organizations ON organizations.id = users.organization_id
    WHERE users.id = ?
  `).get(userId);
}

function validateCredentials(body, { signup }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  if (typeof body.email !== 'string') {
    return { error: 'Email is required.', field: 'email' };
  }
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: 'Enter a valid email address.', field: 'email' };
  }

  if (typeof body.password !== 'string') {
    return { error: 'Password is required.', field: 'password' };
  }
  const passwordLength = Array.from(body.password).length;
  if (signup && passwordLength < 8) {
    return { error: 'Password must be at least 8 characters.', field: 'password' };
  }
  if (Buffer.byteLength(body.password, 'utf8') > 72) {
    return { error: 'Password must be no more than 72 bytes.', field: 'password' };
  }
  if (!signup && passwordLength === 0) {
    return { error: 'Password is required.', field: 'password' };
  }

  if (!signup) return { value: { email, password: body.password } };

  if (typeof body.organizationName !== 'string') {
    return { error: 'Organization name is required.', field: 'organizationName' };
  }
  const organizationName = body.organizationName.trim();
  if (organizationName.length < 2 || organizationName.length > 100) {
    return { error: 'Organization name must be between 2 and 100 characters.', field: 'organizationName' };
  }

  return { value: { email, password: body.password, organizationName } };
}

export function createAuthRouter(database, options = {}) {
  const router = Router();
  const secureCookies = options.secureCookies ?? process.env.NODE_ENV === 'production';
  const passwordRounds = options.passwordRounds ?? 12;

  function requireAuth(request, response, next) {
    const token = readCookie(request, COOKIE_NAME);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      clearSessionCookie(response, secureCookies);
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const row = database.prepare(`
      SELECT users.id, users.email, organizations.id AS organizationId,
        organizations.name AS orgName
      FROM auth_sessions
      JOIN users ON users.id = auth_sessions.user_id
      JOIN organizations ON organizations.id = users.organization_id
      WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?
    `).get(hashToken(token), Date.now());

    if (!row) {
      clearSessionCookie(response, secureCookies);
      return response.status(401).json({ error: 'Session is invalid or expired.' });
    }

    request.user = row;
    return next();
  }

  router.post('/signup', async (request, response, next) => {
    const validation = validateCredentials(request.body, { signup: true });
    if (validation.error) {
      return response.status(400).json({ error: validation.error, field: validation.field });
    }

    const { email, password, organizationName } = validation.value;
    try {
      const passwordHash = await bcrypt.hash(password, passwordRounds);
      const now = Date.now();
      const createAccount = database.transaction(() => {
        const organization = database.prepare(
          'INSERT INTO organizations (name, created_at) VALUES (?, ?)'
        ).run(organizationName, now);
        const user = database.prepare(`
          INSERT INTO users (organization_id, email, password_hash, created_at)
          VALUES (?, ?, ?, ?)
        `).run(organization.lastInsertRowid, email, passwordHash, now);
        return Number(user.lastInsertRowid);
      });
      const userId = createAccount();
      const token = createSession(database, userId);
      setSessionCookie(response, token, secureCookies);
      return response.status(201).json(getPublicUser(database, userId));
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return response.status(409).json({ error: 'An account with this email already exists.' });
      }
      return next(error);
    }
  });

  router.post('/login', async (request, response, next) => {
    const validation = validateCredentials(request.body, { signup: false });
    if (validation.error) {
      return response.status(400).json({ error: validation.error, field: validation.field });
    }

    const { email, password } = validation.value;
    try {
      const user = database.prepare(
        'SELECT id, password_hash FROM users WHERE email = ? COLLATE NOCASE'
      ).get(email);
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return response.status(401).json({ error: 'Email or password is incorrect.' });
      }

      const token = createSession(database, user.id);
      setSessionCookie(response, token, secureCookies);
      return response.json(getPublicUser(database, user.id));
    } catch (error) {
      return next(error);
    }
  });

  router.get('/me', requireAuth, (request, response) => {
    response.json(request.user);
  });

  router.post('/logout', (request, response) => {
    const token = readCookie(request, COOKIE_NAME);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      database.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashToken(token));
    }
    clearSessionCookie(response, secureCookies);
    response.status(204).end();
  });

  return router;
}