#!/usr/bin/env node

/**
 * User prompt submit hook -- logs every user prompt.
 * Can also validate/block prompts before execution.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ensureSessionLogDir } from './constants.mjs';

try {
  const input = JSON.parse(readFileSync('/dev/stdin', 'utf8'));
  const sessionId = input.session_id || 'unknown';
  const logDir = ensureSessionLogDir(sessionId);
  const logPath = join(logDir, 'user_prompt_submit.json');

  let logData = [];
  if (existsSync(logPath)) {
    try {
      logData = JSON.parse(readFileSync(logPath, 'utf8'));
    } catch {
      logData = [];
    }
  }
  logData.push(input);
  writeFileSync(logPath, JSON.stringify(logData, null, 2));

  process.exit(0);
} catch {
  process.exit(0);
}
