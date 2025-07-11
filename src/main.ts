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
    // Initialize configuration object
    const issueNumberStr = core.getInput('issue') || github.context.issue.number.toString()
    config = {
      aiEndpoint: core.getInput('ai-endpoint') || process.env.TRIAGE_AI_ENDPOINT || DEFAULT_AI_ENDPOINT,
      aiModel: core.getInput('ai-model') || process.env.TRIAGE_AI_MODEL || DEFAULT_AI_MODEL,
      applyComment: core.getBooleanInput('apply-comment'),
      commentFooter: core.getInput('comment-footer'),
      applyLabels: core.getBooleanInput('apply-labels'),
      issueNumber: parseInt(issueNumberStr, 10),
      repoName: github.context.repo.repo,
      repoOwner: github.context.repo.owner,
      repository: `${github.context.repo.owner}/${github.context.repo.repo}`,
      tempDir: process.env.RUNNER_TEMP || os.tmpdir(),
      template: core.getInput('template'),
      token: core.getInput('token') || process.env.TRIAGE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
      label: core.getInput('label'),
      labelPrefix: core.getInput('label-prefix'),
      project: core.getInput('project'),
      projectColumn: core.getInput('project-column'),
      projectToken: core.getInput('project-token') || core.getInput('token') || process.env.TRIAGE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
      updateProject: core.getBooleanInput('update-project')
    }

    let responseFile = ''

    const shouldAddLabels = config.template ? true : false
    const shouldAddSummary = config.applyLabels || config.applyComment
    const shouldAddReactions = shouldAddLabels || shouldAddSummary
    const shouldCalculateEngagement = config.project ? true : false
    shouldRemoveReactions = shouldAddSummary

    // Step 1: Add eyes reaction at the start
    if (shouldAddReactions) {
      await manageReactions(config, true)
    }

    // Step 2: Calculate engagement scores if project is specified
    if (shouldCalculateEngagement) {
      const engagementResponse = await calculateEngagementScores(config)
      core.info(`Calculated engagement scores for ${engagementResponse.totalItems} items`)
      
      // Update project with scores if requested
      if (config.updateProject) {
        await updateProjectWithScores(config, engagementResponse)
      }
      
      // Save engagement response to file
      const engagementFile = `${config.tempDir}/engagement-response.json`
      await core.summary.addRaw(JSON.stringify(engagementResponse, null, 2))
      core.setOutput('engagement-response', engagementFile)
    }

    // Step 3: Select labels if template is provided
    if (shouldAddLabels) {
      responseFile = await selectLabels(config)
    }

    // Step 4: Apply labels and comment if requested
    if (shouldAddSummary) {
      await applyLabelsAndComment(config)
    }

    // Step 5: Set the response file output
    core.setOutput('response-file', responseFile)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(`An unknown error occurred: ${JSON.stringify(error)}`)
    }
  } finally {
    // Step 6: Remove eyes reaction at the end if needed
    if (shouldRemoveReactions && config) {
      await manageReactions(config, false)
    }
  }
}
