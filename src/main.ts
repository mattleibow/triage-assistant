import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import { runTriageWorkflow } from './triage/triage.js'
import { runEngagementWorkflow } from './engagement/engagement.js'
import { EverythingConfig } from './config.js'

/**
 * Validates that a string represents a positive integer
 */
function validatePositiveInteger(value: string, fieldName: string): number {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`Invalid ${fieldName} number: "${value}". Must be a positive integer.`)
  }
  return parsed
}

/**
 * Validates that a string represents a non-negative integer
 */
function validateNonNegativeInteger(value: string, fieldName: string): number {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`Invalid ${fieldName} number: "${value}". Must be a non-negative integer.`)
  }
  return parsed
}

/**
 * Enum for triage modes
 */
enum TriageMode {
  IssueTriage = 'issue-triage',
  EngagementScore = 'engagement-score'
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const DEFAULT_AI_ENDPOINT = 'https://models.github.ai/inference'
  const DEFAULT_AI_MODEL = 'openai/gpt-4o'
  const DEFAULT_PROJECT_COLUMN_NAME = 'Engagement Score'

  let config: EverythingConfig | undefined

  try {
    // Get inputs for mode determination
    const template = core.getInput('template')
    const projectInput = core.getInput('project')
    const issueInput = core.getInput('issue')
    const issueContext = github.context.issue?.number || 0

    // Determine triage mode
    const triageMode = template === TriageMode.EngagementScore ? TriageMode.EngagementScore : TriageMode.IssueTriage

    // Validate inputs based on mode
    if (triageMode === TriageMode.EngagementScore) {
      if (!projectInput && !issueInput) {
        throw new Error('Either project or issue must be specified when using engagement-score template')
      }
    } else {
      // For normal triage mode, default to current issue if not specified
      if (!issueInput && !issueContext) {
        throw new Error('Issue number is required for triage mode')
      }
    }

    // Initialize configuration object
    const token =
      core.getInput('token') ||
      process.env.TRIAGE_GITHUB_TOKEN ||
      process.env.GITHUB_TOKEN ||
      core.getInput('fallback-token') ||
      ''
    const aiToken = core.getInput('ai-token') || process.env.TRIAGE_AI_TOKEN || token

    config = {
      aiEndpoint: core.getInput('ai-endpoint') || process.env.TRIAGE_AI_ENDPOINT || DEFAULT_AI_ENDPOINT,
      aiModel: core.getInput('ai-model') || process.env.TRIAGE_AI_MODEL || DEFAULT_AI_MODEL,
      aiToken: aiToken,
      applyComment: core.getBooleanInput('apply-comment'),
      applyLabels: core.getBooleanInput('apply-labels'),
      applyScores: core.getBooleanInput('apply-scores'),
      commentFooter: core.getInput('comment-footer'),
      dryRun: core.getBooleanInput('dry-run') || false,
      issueNumber: issueInput ? validatePositiveInteger(issueInput, 'issue') : issueContext,
      label: core.getInput('label'),
      labelPrefix: core.getInput('label-prefix'),
      projectColumn: core.getInput('project-column') || DEFAULT_PROJECT_COLUMN_NAME,
      projectNumber: projectInput ? validateNonNegativeInteger(projectInput, 'project') : 0,
      repoName: github.context.repo.repo,
      repoOwner: github.context.repo.owner,
      repository: `${github.context.repo.owner}/${github.context.repo.repo}`,
      tempDir: process.env.RUNNER_TEMP || os.tmpdir(),
      template: template,
      token: token
    }

    // Initial validation checks
    if (config.dryRun) {
      core.info('Running in dry-run mode. No changes will be made.')
    }
    if (!config.token) {
      core.info('No GitHub token provided.')
    }
    if (!config.aiToken) {
      core.info('No specific AI token provided, using GitHub token as fallback.')
    }

    // Validate numeric inputs
    if (config.issueNumber <= 0) {
      throw new Error(`Invalid issue number: ${config.issueNumber}. Must be a positive integer.`)
    }
    if (typeof config.projectNumber === 'number' && config.projectNumber < 0) {
      throw new Error(`Invalid project number: ${config.projectNumber}. Must be a non-negative integer.`)
    }

    // Validate repository name to prevent injection
    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(config.repository)) {
      throw new Error(`Invalid repository format: ${config.repository}`)
    }

    let responseFile = ''

    // Run the appropriate workflow based on the triage mode
    if (triageMode === TriageMode.EngagementScore) {
      responseFile = await runEngagementWorkflow(config)
    } else {
      responseFile = await runTriageWorkflow(config)
    }

    // Set the response file output
    core.setOutput('response-file', responseFile)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(`An unknown error occurred: ${JSON.stringify(error)}`)
    }
  }
}
