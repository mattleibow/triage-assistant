import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import { selectLabels } from './prompts-select-labels.js'
import { applyLabelsAndComment, manageReactions } from './github-apply.js'
import { runEngagementWorkflow } from './engagement.js'
import { EverythingConfig } from './triage-config.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const DEFAULT_AI_ENDPOINT = 'https://models.github.ai/inference'
  const DEFAULT_AI_MODEL = 'openai/gpt-4o'

  let config: EverythingConfig | undefined
  const shouldRemoveReactions = false

  try {
    // Get inputs for mode determination
    const template = core.getInput('template')
    const project = core.getInput('project')
    const issue = core.getInput('issue')

    // Determine if this is engagement scoring mode
    const isEngagementMode = template === 'engagement-score'

    // Validate inputs based on mode
    if (isEngagementMode) {
      if (!project && !issue) {
        throw new Error('Either project or issue must be specified when using engagement-score template')
      }
    } else {
      // For normal triage mode, default to current issue if not specified
      if (!issue && !github.context.issue.number) {
        throw new Error('Issue number is required for triage mode')
      }
    }

    // Initialize configuration object
    const issueNumberStr = issue || (github.context.issue.number ? github.context.issue.number.toString() : '')
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
      applyComment: core.getBooleanInput('apply-comment'),
      commentFooter: core.getInput('comment-footer'),
      applyLabels: core.getBooleanInput('apply-labels'),
      issueNumber: issueNumberStr ? parseInt(issueNumberStr, 10) : 0,
      repoName: github.context.repo.repo,
      repoOwner: github.context.repo.owner,
      repository: `${github.context.repo.owner}/${github.context.repo.repo}`,
      tempDir: process.env.RUNNER_TEMP || os.tmpdir(),
      template: template,
      token: token,
      aiToken: aiToken,
      label: core.getInput('label'),
      labelPrefix: core.getInput('label-prefix'),
      dryRun: core.getBooleanInput('dry-run') || false,
      // Engagement scoring config
      project: project,
      projectColumn: core.getInput('project-column') || 'Engagement Score',
      applyScores: core.getBooleanInput('apply-scores')
    }

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

    if (isEngagementMode) {
      // Run engagement scoring workflow
      responseFile = await runEngagementWorkflow(config)
    } else {
      // Run normal triage workflow
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
  } finally {
    // Remove eyes reaction at the end if needed (only for normal triage mode)
    if (shouldRemoveReactions && config && config.template !== 'engagement-score') {
      await manageReactions(config, false)
    }
  }
}

/**
 * Run the normal triage workflow
 */
async function runTriageWorkflow(config: EverythingConfig): Promise<string> {
  const shouldAddLabels = config.template ? true : false
  const shouldAddSummary = config.applyLabels || config.applyComment
  const shouldAddReactions = shouldAddLabels || shouldAddSummary
  let shouldRemoveReactions = shouldAddSummary

  let responseFile = ''

  try {
    // Step 1: Add eyes reaction at the start
    if (shouldAddReactions) {
      await manageReactions(config, true)
    }

    // Step 2: Select labels if template is provided
    if (shouldAddLabels) {
      responseFile = await selectLabels(config)
    }

    // Step 3: Apply labels and comment if requested
    if (shouldAddSummary) {
      await applyLabelsAndComment(config)
    }

    return responseFile
  } catch (error) {
    // Don't remove reactions on error
    shouldRemoveReactions = false
    throw error
  } finally {
    // Step 4: Remove eyes reaction at the end if needed
    if (shouldRemoveReactions) {
      await manageReactions(config, false)
    }
  }
}
