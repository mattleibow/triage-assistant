import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import { TriageMode, validateNumericInput, validateRepositoryId, validateTemplate } from './utils.js'
import { runTriageWorkflow } from './triage/triage.js'
import { runEngagementWorkflow } from './engagement/engagement.js'
import { EverythingConfig } from './config.js'

/**
 * Common workflow execution logic
 */
async function runWorkflow(triageModeOverride?: TriageMode): Promise<void> {
  const DEFAULT_AI_ENDPOINT = 'https://models.github.ai/inference'
  const DEFAULT_AI_MODEL = 'openai/gpt-4o'
  const DEFAULT_PROJECT_COLUMN_NAME = 'Engagement Score'

  let config: EverythingConfig | undefined

  try {
    // Get template and triage mode
    const template = core.getInput('template', { required: false })
    const triageMode =
      triageModeOverride ||
      (template === TriageMode.EngagementScore ? TriageMode.EngagementScore : TriageMode.ApplyLabels)

    // Template is optional - if provided, AI triage is performed; if not, only merge and labels are applied

    // Make sure templates are the ones we support
    validateTemplate(template)

    // Get project and issue numbers
    const projectInput = core.getInput('project')
    const issueInput = core.getInput('issue')
    const issueContext = github.context.issue?.number || 0

    // Make sure they are correct for the mode
    if (triageMode === TriageMode.EngagementScore) {
      if (!projectInput && !issueInput) {
        throw new Error('Either project or issue must be specified when calculating engagement scores')
      }
    } else if (triageMode === TriageMode.ApplyLabels) {
      if (!issueInput && !issueContext) {
        throw new Error('Issue number is required for applying labels')
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
      issueNumber: validateNumericInput(issueInput || issueContext.toString(), 'issue number'),
      label: core.getInput('label'),
      labelPrefix: core.getInput('label-prefix'),
      projectColumn: core.getInput('project-column') || DEFAULT_PROJECT_COLUMN_NAME,
      projectNumber: validateNumericInput(projectInput, 'project number'),
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

    let responseFile = ''

    // Run the appropriate workflow based on the triage mode
    if (triageMode === TriageMode.EngagementScore) {
      core.info('Running engagement scoring workflow')
      responseFile = await runEngagementWorkflow(config)
    } else {
      core.info('Running apply labels workflow')
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
