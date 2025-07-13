import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import { runTriageWorkflow } from './select-labels.js'
import { runEngagementWorkflow } from './engagement.js'
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

  try {
    const template = core.getInput('template')
    const project = core.getInput('project')
    const issue = core.getInput('issue')

    // Determine if this is engagement scoring mode
    const isEngagementMode = template === 'engagement-score'

    // Validate mode-specific requirements
    let issueNumberStr = ''
    if (isEngagementMode) {
      if (!project) {
        throw new Error('Project is required when using engagement-score template')
      }
      issueNumberStr = issue // Don't default to current issue
    } else {
      // For label/comment mode, default to current issue if available
      if (issue) {
        issueNumberStr = issue
      } else if (github.context.issue && github.context.issue.number) {
        issueNumberStr = github.context.issue.number.toString()
      }

      if (!issueNumberStr) {
        throw new Error('Issue number is required for label/comment triage mode')
      }
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
      responseFile = await runEngagementWorkflow(config)
      core.setOutput('engagement-response', responseFile)
    } else {
      // Label/comment triage mode
      core.info('Running in label/comment triage mode')

      if (!config.issueNumber) {
        throw new Error('Issue number is required for label/comment triage mode')
      }

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
