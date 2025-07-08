import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import { selectLabels } from './select-labels.js'
import { applyLabelsAndComment } from './apply.js'
import { TriageConfig } from './triage-config.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const DEFAULT_AI_ENDPOINT = 'https://models.github.ai/inference'
    const DEFAULT_AI_MODEL = 'openai/gpt-4o'

    // Initialize configuration object
    const issueNumberStr = core.getInput('issue') || github.context.issue.number.toString()
    const config: TriageConfig = {
      aiEndpoint: core.getInput('ai-endpoint') || DEFAULT_AI_ENDPOINT,
      aiModel: core.getInput('ai-model') || DEFAULT_AI_MODEL,
      applyComment: core.getBooleanInput('apply-comment'),
      commentFooter: core.getInput('comment-footer'),
      applyLabels: core.getBooleanInput('apply-labels'),
      issueNumber: parseInt(issueNumberStr, 10),
      repoName: github.context.repo.repo,
      repoOwner: github.context.repo.owner,
      repository: `${github.context.repo.owner}/${github.context.repo.repo}`,
      tempDir: process.env.RUNNER_TEMP || os.tmpdir(),
      template: core.getInput('template'),
      token: core.getInput('token') || process.env.GITHUB_TOKEN || '',
      label: core.getInput('label'),
      labelPrefix: core.getInput('label-prefix')
    }

    let responseFile = ''

    // Step 1: Select labels if template is provided
    if (config.template) {
      responseFile = await selectLabels(config)
    }

    // Step 2: Apply labels and comment if requested
    if (config.applyLabels || config.applyComment) {
      await applyLabelsAndComment(config)
    }

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
