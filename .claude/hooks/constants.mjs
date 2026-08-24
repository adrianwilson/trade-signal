import { mkdirSync } from 'fs';
import { join } from 'path';

const LOG_BASE_DIR = process.env.CLAUDE_HOOKS_LOG_DIR || 'logs';

export function getSessionLogDir(sessionId) {
  return join(LOG_BASE_DIR, sessionId);
}

export function ensureSessionLogDir(sessionId) {
  const dir = getSessionLogDir(sessionId);
  mkdirSync(dir, { recursive: true });
  return dir;
}
