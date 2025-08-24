import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import {
  TriageMode,
  validateNumericInput,
  validateOptionalNumericInput,
  validateRepositoryId,
  validateMode
} from './utils.js'
import { runTriageWorkflow } from './triage/triage.js'
import { runEngagementWorkflow } from './engagement/engagement.js'
import { EverythingConfig } from './config.js'
import { loadConfigFile } from './config-file.js'

/**
 * Common workflow execution logic
 */
async function runWorkflow(triageModeOverride?: TriageMode): Promise<void> {
  const DEFAULT_AI_ENDPOINT = 'https://models.github.ai/inference'
  const DEFAULT_AI_MODEL = 'openai/gpt-4o'
  const DEFAULT_PROJECT_COLUMN_NAME = 'Engagement Score'

  let config: EverythingConfig | undefined

  try {
    // Get mode input
    const modeInput = core.getInput('mode', { required: false }) || 'apply-labels'
    const triageMode = triageModeOverride || validateMode(modeInput)

    // Get project and issue numbers
    const projectInput = core.getInput('project')
    const issueInput = core.getInput('issue')
    const issueQueryInput = core.getInput('issue-query')
    const issueContext = github.context.issue?.number || 0

    // Make sure they are correct for the mode
    if (triageMode === TriageMode.EngagementScore) {
      if (!projectInput && !issueInput) {
        throw new Error('Either project or issue must be specified when calculating engagement scores')
      }
    } else if (triageMode === TriageMode.ApplyLabels) {
      if (!issueInput && !issueQueryInput && !issueContext) {
        throw new Error('Issue number or issue query is required for applying labels')
      }
      if (issueInput && issueQueryInput) {
        throw new Error('Cannot specify both issue number and issue query - please use only one')
      }
    }

    // Validate repository context
    validateRepositoryId(github.context.repo.owner, github.context.repo.repo)

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
      applyComment: core.getInput('apply-comment')?.toLowerCase() === 'true',
      applyLabels: core.getInput('apply-labels')?.toLowerCase() === 'true',
      applyScores: core.getInput('apply-scores')?.toLowerCase() === 'true',
      commentFooter: core.getInput('comment-footer'),
      dryRun: core.getInput('dry-run')?.toLowerCase() === 'true',
      issueNumber: validateOptionalNumericInput(issueInput || issueContext.toString(), 'issue number'),
      issueQuery: issueQueryInput || undefined,
      projectColumn: core.getInput('project-column') || DEFAULT_PROJECT_COLUMN_NAME,
      projectNumber: validateNumericInput(projectInput, 'project number'),
      repoName: github.context.repo.repo,
      repoOwner: github.context.repo.owner,
      repository: `${github.context.repo.owner}/${github.context.repo.repo}`,
      tempDir: process.env.RUNNER_TEMP || os.tmpdir(),
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
      core.info('No AI token provided.')
    }

    // Load full triage config file
    const configFile = await loadConfigFile()

    // Run the appropriate workflow based on the triage mode
    let responseFile = ''
    if (triageMode === TriageMode.EngagementScore) {
      core.info('Running engagement scoring workflow')
      responseFile = await runEngagementWorkflow(config, configFile.engagement)
    } else {
      core.info('Running labelling workflow')
      responseFile = await runTriageWorkflow(config, configFile.labels)
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

/**
 * The main function for the action (backward compatibility)
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  await runWorkflow()
}

/**
 * Entry point for apply-labels sub-action
 *
 * @returns Resolves when the action is complete.
 */
export async function runApplyLabels(): Promise<void> {
  await runWorkflow(TriageMode.ApplyLabels)
}

/**
 * Entry point for engagement-score sub-action
 *
 * @returns Resolves when the action is complete.
 */
export async function runEngagementScore(): Promise<void> {
  await runWorkflow(TriageMode.EngagementScore)
}
