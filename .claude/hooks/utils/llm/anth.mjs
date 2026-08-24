#!/usr/bin/env node

/**
 * Anthropic LLM helper for generating completion messages.
 *
 * Usage:
 *   node anth.mjs --completion
 *   node anth.mjs "your prompt here"
 */

async function promptLlm(promptText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: promptText }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

export async function generateCompletionMessage() {
  const name = (process.env.ENGINEER_NAME || '').trim();
  const nameInstruction = name
    ? `Sometimes (about 30% of the time) include the engineer's name '${name}' in a natural way.`
    : '';

  const prompt = `Generate a short, friendly completion message for when an AI coding assistant finishes a task.

Requirements:
- Keep it under 10 words
- Make it positive and future focused
- Use natural, conversational language
- Focus on completion/readiness
- Do NOT include quotes, formatting, or explanations
- Return ONLY the completion message text
${nameInstruction}

Generate ONE completion message:`;

  let response = await promptLlm(prompt);
  if (response) {
    response = response.replace(/^["']|["']$/g, '').split('\n')[0].trim();
  }
  return response;
}

// CLI
if (process.argv[1]?.endsWith('anth.mjs')) {
  if (process.argv[2] === '--completion') {
    const msg = await generateCompletionMessage();
    console.log(msg || 'Error generating completion message');
  } else if (process.argv[2]) {
    const response = await promptLlm(process.argv.slice(2).join(' '));
    console.log(response || 'Error calling Anthropic API');
  } else {
    console.log(
      "Usage: node anth.mjs 'your prompt here' or node anth.mjs --completion",
    );
  }
}
