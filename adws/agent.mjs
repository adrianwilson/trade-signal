/**
 * Claude Code agent module for executing prompts programmatically.
 */

import { execFileSync } from 'child_process';
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'fs';
import { join, dirname } from 'path';
import { getProjectRoot } from './utils.mjs';

const CLAUDE_PATH = process.env.CLAUDE_CODE_PATH || 'claude';

/**
 * Check if Claude Code CLI is installed.
 * @returns {string|null} Error message or null if installed.
 */
export function checkClaudeInstalled() {
  try {
    execFileSync(CLAUDE_PATH, ['--version'], { encoding: 'utf8' });
    return null;
  } catch {
    return `Claude Code CLI not found at '${CLAUDE_PATH}'`;
  }
}

/**
 * Parse JSONL output file.
 * @returns {{ messages: object[], resultMessage: object|null }}
 */
function parseJsonlOutput(outputFile) {
  try {
    const content = readFileSync(outputFile, 'utf8');
    const messages = content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    let resultMessage = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'result') {
        resultMessage = messages[i];
        break;
      }
    }
    return { messages, resultMessage };
  } catch {
    return { messages: [], resultMessage: null };
  }
}

/**
 * Convert JSONL file to JSON array file.
 */
function convertJsonlToJson(jsonlFile) {
  const { messages } = parseJsonlOutput(jsonlFile);
  const jsonFile = jsonlFile.replace('.jsonl', '.json');
  writeFileSync(jsonFile, JSON.stringify(messages, null, 2));
  return jsonFile;
}

/**
 * Save a prompt to the logging directory.
 */
function savePrompt(prompt, adwId, agentName = 'ops') {
  const match = prompt.match(/^(\/\w+)/);
  if (!match) return;
  const commandName = match[1].slice(1);
  const promptDir = join(getProjectRoot(), 'agents', adwId, agentName, 'prompts');
  mkdirSync(promptDir, { recursive: true });
  writeFileSync(join(promptDir, `${commandName}.txt`), prompt);
}

/**
 * Execute Claude Code with the given prompt configuration.
 * @param {import('./data-types.mjs').AgentPromptRequest} request
 * @returns {import('./data-types.mjs').AgentPromptResponse}
 */
export function promptClaudeCode(request) {
  const error = checkClaudeInstalled();
  if (error) {
    return { output: error, success: false, sessionId: null };
  }

  savePrompt(request.prompt, request.adwId, request.agentName);

  const outputDir = dirname(request.outputFile);
  if (outputDir) mkdirSync(outputDir, { recursive: true });

  const cmd = [
    CLAUDE_PATH,
    '-p',
    request.prompt,
    '--model',
    request.model,
    '--output-format',
    'stream-json',
    '--verbose',
  ];

  if (request.dangerouslySkipPermissions) {
    cmd.push('--dangerously-skip-permissions');
  }

  try {
    const stdout = execFileSync(cmd[0], cmd.slice(1), {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 5 * 60 * 1000,
    });

    writeFileSync(request.outputFile, stdout);
    convertJsonlToJson(request.outputFile);

    const { resultMessage } = parseJsonlOutput(request.outputFile);

    if (resultMessage) {
      return {
        output: resultMessage.result || '',
        success: !resultMessage.is_error,
        sessionId: resultMessage.session_id || null,
      };
    }

    return { output: stdout, success: true, sessionId: null };
  } catch (e) {
    const msg = e.killed
      ? 'Claude Code command timed out after 5 minutes'
      : `Error executing Claude Code: ${e.message}`;
    return { output: msg, success: false, sessionId: null };
  }
}

/**
 * Execute a Claude Code template with slash command and arguments.
 * @param {import('./data-types.mjs').AgentTemplateRequest} request
 * @returns {import('./data-types.mjs').AgentPromptResponse}
 */
export function executeTemplate(request) {
  const prompt = `${request.slashCommand} ${request.args.join(' ')}`;
  const outputDir = join(
    getProjectRoot(),
    'agents',
    request.adwId,
    request.agentName,
  );
  mkdirSync(outputDir, { recursive: true });
  const outputFile = join(outputDir, 'raw_output.jsonl');

  return promptClaudeCode({
    prompt,
    adwId: request.adwId,
    agentName: request.agentName,
    model: request.model,
    dangerouslySkipPermissions: true,
    outputFile,
  });
}
