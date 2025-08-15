import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import * as utils from './utils.js'
import { runTriageWorkflow } from './triage/triage.js'
import { runEngagementWorkflow } from './engagement/engagement.js'
import { EverythingConfig } from './config.js'

/**
 * Validates template name against allowed values
 * @param template Template name to validate
 */
export function validateTemplate(template: string): void {
  const allowedTemplates = ['multi-label', 'single-label', 'regression', 'missing-info', 'engagement-score', '']
  if (template && !allowedTemplates.includes(template)) {
    throw new Error(`Invalid template: ${template}. Allowed values: ${allowedTemplates.filter((t) => t).join(', ')}`)
  }
}

/**
 * Enum for triage modes
 */
enum TriageMode {
  ApplyLabels = 'apply-labels',
  EngagementScore = 'engagement-score'
}

/**
 * Detects triage mode based on template for backward compatibility
 */
function detectTriageModeFromTemplate(template?: string): TriageMode {
  // Check which mode based on an explicit template
  const triageMode = template === TriageMode.EngagementScore ? TriageMode.EngagementScore : TriageMode.ApplyLabels
  core.info(`Using template ${template} to determine triage mode: ${triageMode}`)

  return triageMode
}

/**
 * Common workflow execution logic
 */
async function runWorkflow(triageMode: TriageMode | null, isSubAction: boolean = false): Promise<void> {
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

    // For backward compatibility, detect mode from template if not explicitly set
    const finalTriageMode = triageMode || detectTriageModeFromTemplate(template)

    // Validate template
    validateTemplate(template)

    // Validate repository context
    utils.validateRepositoryId(github.context.repo.owner, github.context.repo.repo)

    // Validate inputs based on mode
    if (finalTriageMode === TriageMode.EngagementScore) {
      if (!projectInput && !issueInput) {
        throw new Error('Either project or issue must be specified when using engagement-score template')
      }
    } else if (finalTriageMode === TriageMode.ApplyLabels) {
      // For apply labels mode, default to current issue if not specified
      if (!issueInput && !issueContext) {
        throw new Error('Issue number is required for triage mode')
      }
      // For apply labels mode, template is required when using main action (not sub-actions)
      if (!template && !isSubAction) {
        throw new Error('Template is required for triage mode')
      }
    } else {
      throw new Error(`Unknown triage mode: ${finalTriageMode}`)
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
      issueNumber: utils.validateNumericInput(issueInput || issueContext.toString(), 'issue number'),
      label: core.getInput('label'),
      labelPrefix: core.getInput('label-prefix'),
      projectColumn: core.getInput('project-column') || DEFAULT_PROJECT_COLUMN_NAME,
      projectNumber: utils.validateNumericInput(projectInput, 'project number'),
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
    if (finalTriageMode === TriageMode.EngagementScore) {
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
  // Get inputs for mode determination
  const template = core.getInput('template')
  const triageMode = template ? detectTriageModeFromTemplate(template) : null

  await runWorkflow(triageMode, false)
}

/**
 * Entry point for apply-labels sub-action
 *
 * @returns Resolves when the action is complete.
 */
export async function runApplyLabels(): Promise<void> {
  await runWorkflow(TriageMode.ApplyLabels, true)
}

/**
 * Entry point for engagement-score sub-action
 *
 * @returns Resolves when the action is complete.
 */
export async function runEngagementScore(): Promise<void> {
  await runWorkflow(TriageMode.EngagementScore, true)
}
