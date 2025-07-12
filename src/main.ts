import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import { selectLabels } from './select-labels.js'
import { applyLabelsAndComment, manageReactions } from './apply.js'
import { calculateEngagementScores, updateProjectWithScores } from './engagement.js'
import { TriageConfig } from './triage-config.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const DEFAULT_AI_ENDPOINT = 'https://models.github.ai/inference'
  const DEFAULT_AI_MODEL = 'openai/gpt-4o'

  let config: TriageConfig | undefined
  let shouldRemoveReactions = false

  try {
    const template = core.getInput('template')
    const project = core.getInput('project')

    // Determine if this is engagement scoring mode
    const isEngagementMode = template === 'engagement-score'

    // For engagement mode, don't default to current issue number and require project
    let issueNumberStr = ''
    if (isEngagementMode) {
      if (!project) {
        throw new Error('Project is required when using engagement-score template')
      }
      issueNumberStr = core.getInput('issue') // Don't default to current issue
    } else {
      // For label/comment mode, default to current issue
      issueNumberStr = core.getInput('issue') || github.context.issue.number.toString()
    }

    // Initialize configuration object
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
      template,
      token: core.getInput('token') || process.env.TRIAGE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
      label: core.getInput('label'),
      labelPrefix: core.getInput('label-prefix'),
      project,
      projectColumn: core.getInput('project-column'),
      applyScores: core.getBooleanInput('apply-scores')
    }

    let responseFile = ''

    if (isEngagementMode) {
      // Engagement scoring mode
      core.info('Running in engagement scoring mode')

      const engagementResponse = await calculateEngagementScores(config)
      core.info(`Calculated engagement scores for ${engagementResponse.totalItems} items`)

      // Update project with scores if requested
      const shouldUpdateScores = config.applyScores
      if (shouldUpdateScores) {
        await updateProjectWithScores(config, engagementResponse)
      }

      // Save engagement response to file
      const engagementFile = `${config.tempDir}/engagement-response.json`
      await core.summary.addRaw(JSON.stringify(engagementResponse, null, 2))
      core.setOutput('engagement-response', engagementFile)
    } else {
      // Label/comment triage mode
      core.info('Running in label/comment triage mode')

      if (!config.issueNumber) {
        throw new Error('Issue number is required for label/comment triage mode')
      }

      const shouldAddLabels = config.template ? true : false
      const shouldAddSummary = config.applyLabels || config.applyComment
      const shouldAddReactions = shouldAddLabels || shouldAddSummary
      shouldRemoveReactions = shouldAddSummary

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
    // Remove eyes reaction at the end if needed (only for label/comment mode)
    if (shouldRemoveReactions && config) {
      await manageReactions(config, false)
    }
  }
}
