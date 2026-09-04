#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ensureSessionLogDir } from './constants.mjs';

function isDangerousRmCommand(command) {
  const normalized = command.toLowerCase().replace(/\s+/g, ' ').trim();

  const patterns = [
    /\brm\s+.*-[a-z]*r[a-z]*f/,
    /\brm\s+.*-[a-z]*f[a-z]*r/,
    /\brm\s+--recursive\s+--force/,
    /\brm\s+--force\s+--recursive/,
    /\brm\s+-r\s+.*-f/,
    /\brm\s+-f\s+.*-r/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(normalized)) return true;
  }

  if (/\brm\s+.*-[a-z]*r/.test(normalized)) {
    const dangerousPaths = [/^\s*\/\s*$/, /\/\*/, /~/, /\$HOME/, /\.\./, /\*$/];
    for (const p of dangerousPaths) {
      if (p.test(normalized)) return true;
    }
  }

  return false;
}

function isEnvFileAccess(toolName, toolInput) {
  if (['Read', 'Edit', 'MultiEdit', 'Write'].includes(toolName)) {
    const filePath = toolInput.file_path || '';
    if (filePath.includes('.env') && !filePath.endsWith('.env.sample')) {
      return true;
    }
  }

  if (toolName === 'Bash') {
    const command = toolInput.command || '';
    const patterns = [
      /\b\.env\b(?!\.sample)/,
      /cat\s+.*\.env\b(?!\.sample)/,
      /echo\s+.*>\s*\.env\b(?!\.sample)/,
      /touch\s+.*\.env\b(?!\.sample)/,
      /cp\s+.*\.env\b(?!\.sample)/,
      /mv\s+.*\.env\b(?!\.sample)/,
    ];
    for (const pattern of patterns) {
      if (pattern.test(command)) return true;
    }
  }

  return false;
}

try {
  const input = JSON.parse(readFileSync('/dev/stdin', 'utf8'));
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  if (isEnvFileAccess(toolName, toolInput)) {
    process.stderr.write(
      'BLOCKED: Access to .env files containing sensitive data is prohibited\n',
    );
    process.stderr.write('Use .env.sample for template files instead\n');
    process.exit(2);
  }

  if (toolName === 'Bash') {
    const command = toolInput.command || '';
    if (isDangerousRmCommand(command)) {
      process.stderr.write(
        'BLOCKED: Dangerous rm command detected and prevented\n',
      );
      process.exit(2);
    }
  }

  const sessionId = input.session_id || 'unknown';
  const logDir = ensureSessionLogDir(sessionId);
  const logPath = join(logDir, 'pre_tool_use.json');

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
