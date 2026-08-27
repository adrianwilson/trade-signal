/**
 * Claude Code agent module using the official SDK.
 *
 * Replaces subprocess-based execution with native SDK calls.
 */

import { query } from '@anthropic-ai/claude-code';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getProjectRoot } from './utils.mjs';

/**
 * Execute a Claude Code prompt using the SDK.
 *
 * @param {Object} request
 * @param {string} request.prompt
 * @param {string} request.adwId
 * @param {string} request.agentName
 * @param {'sonnet'|'opus'} request.model
 * @returns {Promise<{output: string, success: boolean, sessionId: string|null}>}
 */
export async function promptClaudeCode(request) {
  // Save the prompt for logging
  const match = request.prompt.match(/^(\/\w+)/);
  if (match) {
    const commandName = match[1].slice(1);
    const promptDir = join(
      getProjectRoot(),
      'agents',
      request.adwId,
      request.agentName,
      'prompts',
    );
    mkdirSync(promptDir, { recursive: true });
    writeFileSync(join(promptDir, `${commandName}.txt`), request.prompt);
  }

  // Save raw output for debugging
  const outputDir = join(
    getProjectRoot(),
    'agents',
    request.adwId,
    request.agentName,
  );
  mkdirSync(outputDir, { recursive: true });

  try {
    const messages = [];
    const abortController = new AbortController();

    for await (const message of query({
      prompt: request.prompt,
      abortController,
      options: {
        model: request.model === 'opus' ? 'claude-opus-4-6' : 'claude-sonnet-4-6',
        maxTurns: 30,
        permissionMode: 'bypassPermissions',
        cwd: getProjectRoot(),
      },
    })) {
      messages.push(message);
    }

    // Save all messages for debugging
    writeFileSync(
      join(outputDir, 'raw_output.json'),
      JSON.stringify(messages, null, 2),
    );

    // Find the result message
    const resultMessage = messages.findLast((m) => m.type === 'result');

    if (resultMessage) {
      return {
        output: resultMessage.result || '',
        success: !resultMessage.is_error,
        sessionId: resultMessage.session_id || null,
      };
    }

    // Extract text from assistant messages as fallback
    const assistantText = messages
      .filter((m) => m.type === 'assistant')
      .map((m) => {
        const content = m.message?.content;
        if (!content) return '';
        return content
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
      })
      .join('\n');

    return {
      output: assistantText || 'No output',
      success: true,
      sessionId: null,
    };
  } catch (e) {
    const msg = e.name === 'AbortError'
      ? 'Claude Code query was aborted'
      : `Error executing Claude Code: ${e.message}`;
    return { output: msg, success: false, sessionId: null };
  }
}

/**
 * Execute a Claude Code template with slash command and arguments.
 *
 * @param {Object} request
 * @param {string} request.agentName
 * @param {string} request.slashCommand
 * @param {string[]} request.args
 * @param {string} request.adwId
 * @param {'sonnet'|'opus'} request.model
 * @returns {Promise<{output: string, success: boolean, sessionId: string|null}>}
 */
export async function executeTemplate(request) {
  const prompt = `${request.slashCommand} ${request.args.join(' ')}`;

  return promptClaudeCode({
    prompt,
    adwId: request.adwId,
    agentName: request.agentName,
    model: request.model,
  });
}
