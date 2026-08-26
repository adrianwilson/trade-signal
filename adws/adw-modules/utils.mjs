/**
 * Utility functions for ADW system.
 */

import { randomUUID } from 'crypto';
import { mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(dirname(__dirname));

/**
 * Generate a short 8-character UUID for ADW tracking.
 */
export function makeAdwId() {
  return randomUUID().slice(0, 8);
}

/**
 * Get the project root directory.
 */
export function getProjectRoot() {
  return PROJECT_ROOT;
}

/**
 * Create a simple logger that writes to console and file.
 * @param {string} adwId
 * @param {string} triggerType
 */
export function setupLogger(adwId, triggerType = 'adw_plan_build') {
  const logDir = join(PROJECT_ROOT, 'agents', adwId, triggerType);
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, 'execution.log');

  function formatTime() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  return {
    info(msg) {
      const line = `${formatTime()} - INFO - ${msg}`;
      console.log(msg);
      appendFileSync(logFile, line + '\n');
    },
    error(msg) {
      const line = `${formatTime()} - ERROR - ${msg}`;
      console.error(msg);
      appendFileSync(logFile, line + '\n');
    },
    debug(msg) {
      const line = `${formatTime()} - DEBUG - ${msg}`;
      appendFileSync(logFile, line + '\n');
    },
    warning(msg) {
      const line = `${formatTime()} - WARNING - ${msg}`;
      console.warn(msg);
      appendFileSync(logFile, line + '\n');
    },
  };
}

/**
 * Parse JSON from agent output, handling markdown-wrapped responses.
 * @param {string} text
 * @returns {any}
 */
export function parseJson(text) {
  const trimmed = text.trim();
  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try extracting from markdown code block
    const match = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    throw new Error(`Failed to parse JSON: ${trimmed.slice(0, 200)}`);
  }
}
