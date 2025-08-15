import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import { runTriageWorkflow } from './triage/triage.js'
import { runEngagementWorkflow } from './engagement/engagement.js'
import { EverythingConfig } from './config.js'

/**
 * Enum for triage modes
 */
enum TriageMode {
  ApplyLabels = 'apply-labels',
  EngagementScore = 'engagement-score'
}

/**
 * Detects which sub-action or template is being used based on the action context
 */
function detectTriageMode(template?: string): TriageMode {
  // Check if we're running from a sub-action by examining the action name or path
  const githubAction = process.env.GITHUB_ACTION || ''
  const githubActionPath = process.env.GITHUB_ACTION_PATH || ''

  // Log for debugging
  core.info(
    `Detecting triage mode using action name: ${githubAction}, action path: ${githubActionPath} and template: ${template}`
  )

  // Check if running from engagement-score sub-action
  if (githubAction.includes('engagement-score') || githubActionPath.includes('engagement-score')) {
    core.info(`Detected engagement-score sub-action mode`)
    return TriageMode.EngagementScore
  }

  // Check if running from apply-labels sub-action
  if (githubAction.includes('apply-labels') || githubActionPath.includes('apply-labels')) {
    core.info(`Detected apply-labels sub-action mode`)
    return TriageMode.ApplyLabels
  }

  // Check which mode based on an explicit template
  const triageMode = template === TriageMode.EngagementScore ? TriageMode.EngagementScore : TriageMode.ApplyLabels
  core.info(`Using template ${template} to determine triage mode: ${triageMode}`)

  return triageMode
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
    const triageMode = detectTriageMode(template)
    const projectInput = core.getInput('project')
    const issueInput = core.getInput('issue')
    const issueContext = github.context.issue?.number || 0

    // Validate inputs based on mode
    if (triageMode === TriageMode.EngagementScore) {
      if (!projectInput && !issueInput) {
        throw new Error('Either project or issue must be specified when using engagement-score template')
      }
    } else if (triageMode === TriageMode.ApplyLabels) {
      // For apply labels mode, default to current issue if not specified
      if (!issueInput && !issueContext) {
        throw new Error('Issue number is required for triage mode')
      }
      // For apply labels mode, template is also required
      if (!template) {
        throw new Error('Template is required for triage mode')
      }
    } else {
      throw new Error(`Unknown triage mode: ${triageMode}`)
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
      issueNumber: issueInput ? parseInt(issueInput, 10) : issueContext,
      label: core.getInput('label'),
      labelPrefix: core.getInput('label-prefix'),
      projectColumn: core.getInput('project-column') || DEFAULT_PROJECT_COLUMN_NAME,
      projectNumber: projectInput ? parseInt(projectInput, 10) : 0,
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
