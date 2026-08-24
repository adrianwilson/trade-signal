/**
 * Data types for the ADW (Autonomous Developer Workflow) system.
 *
 * Supported slash commands for issue classification.
 * These align with custom slash commands in .claude/commands/.
 */

/** @typedef {'/chore' | '/bug' | '/feature' | '/refactor'} IssueClassSlashCommand */

/**
 * All slash commands used in the ADW system.
 * @typedef {IssueClassSlashCommand | '/classify_issue' | '/find_plan_file' | '/generate_branch_name' | '/commit' | '/pull_request' | '/implement'} SlashCommand
 */

/**
 * @typedef {Object} AgentPromptRequest
 * @property {string} prompt
 * @property {string} adwId
 * @property {string} agentName
 * @property {'sonnet' | 'opus'} model
 * @property {boolean} dangerouslySkipPermissions
 * @property {string} outputFile
 */

/**
 * @typedef {Object} AgentPromptResponse
 * @property {string} output
 * @property {boolean} success
 * @property {string|null} sessionId
 */

/**
 * @typedef {Object} AgentTemplateRequest
 * @property {string} agentName
 * @property {SlashCommand} slashCommand
 * @property {string[]} args
 * @property {string} adwId
 * @property {'sonnet' | 'opus'} model
 */

export {};
