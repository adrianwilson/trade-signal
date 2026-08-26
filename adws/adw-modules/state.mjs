/**
 * State management for ADW composable architecture.
 *
 * Provides persistent state via file storage and transient state
 * passing between scripts via stdin/stdout.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getProjectRoot } from './utils.mjs';

const STATE_FILENAME = 'adw_state.json';

export class ADWState {
  /**
   * @param {string} adwId
   */
  constructor(adwId) {
    if (!adwId) throw new Error('adwId is required for ADWState');
    this.adwId = adwId;
    this.data = { adw_id: adwId };
  }

  /**
   * Update state with key-value pairs. Only core fields are stored.
   */
  update(fields) {
    const coreFields = new Set([
      'adw_id',
      'issue_number',
      'branch_name',
      'plan_file',
      'issue_class',
    ]);
    for (const [key, value] of Object.entries(fields)) {
      if (coreFields.has(key)) {
        this.data[key] = value;
      }
    }
  }

  get(key, defaultValue = null) {
    return this.data[key] ?? defaultValue;
  }

  getStatePath() {
    return join(getProjectRoot(), 'agents', this.adwId, STATE_FILENAME);
  }

  /**
   * Save state to agents/{adwId}/adw_state.json.
   * @param {string} [workflowStep]
   */
  save(workflowStep) {
    const statePath = this.getStatePath();
    mkdirSync(join(statePath, '..'), { recursive: true });
    writeFileSync(statePath, JSON.stringify(this.data, null, 2));
    if (workflowStep) {
      console.log(`State saved by: ${workflowStep}`);
    }
  }

  /**
   * Load state from file if it exists.
   * @param {string} adwId
   * @returns {ADWState|null}
   */
  static load(adwId) {
    const statePath = join(
      getProjectRoot(),
      'agents',
      adwId,
      STATE_FILENAME,
    );
    if (!existsSync(statePath)) return null;

    try {
      const data = JSON.parse(readFileSync(statePath, 'utf8'));
      const state = new ADWState(data.adw_id || adwId);
      state.data = data;
      return state;
    } catch {
      return null;
    }
  }

  /**
   * Read state from stdin if available (for piped input).
   * Returns null if stdin is a TTY.
   * @returns {Promise<ADWState|null>}
   */
  static async fromStdin() {
    if (process.stdin.isTTY) return null;

    return new Promise((resolve) => {
      let input = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (input += chunk));
      process.stdin.on('end', () => {
        if (!input.trim()) return resolve(null);
        try {
          const data = JSON.parse(input);
          if (!data.adw_id) return resolve(null);
          const state = new ADWState(data.adw_id);
          state.data = data;
          resolve(state);
        } catch {
          resolve(null);
        }
      });
      // Timeout after 100ms if no piped input
      setTimeout(() => resolve(null), 100);
    });
  }

  /**
   * Write state to stdout as JSON (for piping to next script).
   */
  toStdout() {
    const output = {
      adw_id: this.data.adw_id,
      issue_number: this.data.issue_number,
      branch_name: this.data.branch_name,
      plan_file: this.data.plan_file,
      issue_class: this.data.issue_class,
    };
    console.log(JSON.stringify(output, null, 2));
  }
}
