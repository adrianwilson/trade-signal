#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ensureSessionLogDir } from './constants.mjs';

try {
  const input = JSON.parse(readFileSync('/dev/stdin', 'utf8'));
  const sessionId = input.session_id || 'unknown';
  const logDir = ensureSessionLogDir(sessionId);
  const logPath = join(logDir, 'subagent_stop.json');

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

  // Save transcript as chat.json if available
  if (process.argv.includes('--chat') && input.transcript_path) {
    if (existsSync(input.transcript_path)) {
      try {
        const lines = readFileSync(input.transcript_path, 'utf8')
          .split('\n')
          .filter((line) => line.trim());
        const chatData = [];
        for (const line of lines) {
          try {
            chatData.push(JSON.parse(line));
          } catch {
            // skip invalid lines
          }
        }
        writeFileSync(
          join(logDir, 'chat.json'),
          JSON.stringify(chatData, null, 2),
        );
      } catch {
        // fail silently
      }
    }
  }

  process.exit(0);
} catch {
  process.exit(0);
}
