import * as core from '@actions/core'
import * as path from 'path'
import * as github from '@actions/github'
import { selectLabels } from '../prompts/select-labels.js'
import { mergeResponses } from './merge.js'
import { commentOnIssue, applyLabelsToIssue, addEyes, removeEyes } from '../github/issues.js'
import { generateSummary } from '../prompts/summary.js'
import { ConfigFileLabels } from '../config-file.js'
import { ApplyLabelsConfig, ApplySummaryCommentConfig, LabelTriageWorkflowConfig, TriageConfig } from '../config.js'

type Octokit = ReturnType<typeof github.getOctokit>

/**
 * Run the normal triage workflow
 */
export async function runTriageWorkflow(
  config: LabelTriageWorkflowConfig,
  configFile: ConfigFileLabels
): Promise<string> {
  const octokit = github.getOctokit(config.token)

  const shouldAddLabels = Object.keys(configFile.groups).length > 0
  const shouldAddSummary = config.applyLabels || config.applyComment
  const shouldAddReactions = shouldAddLabels || shouldAddSummary
  const shouldRemoveReactions = shouldAddSummary

  try {
    // Step 1: Add eyes reaction at the start
    if (shouldAddReactions) {
      await addEyes(octokit, config)
    }

    // Step 2: Select labels
    if (shouldAddLabels) {
      for (const [groupName, groupConfig] of Object.entries(configFile.groups)) {
        core.info(`Selecting labels for group ${groupName} with configuration: ${JSON.stringify(groupConfig)}`)
        await selectLabels(groupConfig.template, {
          ...config,
          labelPrefix: groupConfig.labelPrefix,
          label: groupConfig.label
        })
      }
    }

    let responseFile = ''

    // Step 3: Apply labels and comment if requested
    if (shouldAddSummary) {
      responseFile = await mergeAndApplyTriage(octokit, config)
    }

    return responseFile
  } finally {
    // Step 4: Remove eyes reaction at the end if needed
    if (shouldRemoveReactions) {
      await removeEyes(octokit, config)
    }
  }
}

/**
 * Merges response JSON files and applies labels and comments to the issue.
 *
 * @param octokit The GitHub API client.
 * @param config The triage configuration object.
 * @returns Promise that resolves with the path to the merged response file.
 */
export async function mergeAndApplyTriage(
  octokit: Octokit,
  config: ApplyLabelsConfig & ApplySummaryCommentConfig & TriageConfig
): Promise<string> {
  // Merge response JSON files
  const mergedResponseFile = path.join(config.tempDir, 'triage-assistant', 'responses.json')
  const responsesDir = path.join(config.tempDir, 'triage-assistant', 'responses')
  const mergedResponse = await mergeResponses('', responsesDir, mergedResponseFile)

  // Log the merged response for debugging
  core.info(`Merged response: ${JSON.stringify(mergedResponse, null, 2)}`)

  if (config.applyComment) {
    // Generate summary response using AI
    const summaryResponseFile = await generateSummary(config, mergedResponseFile)

    // Comment on the issue
    await commentOnIssue(octokit, summaryResponseFile, config, config.commentFooter)
  }

  if (config.applyLabels) {
    // Collect all the labels from the merged response
    const labels = mergedResponse.labels?.map((l) => l.label)?.filter(Boolean) || []

    // Apply labels to the issue
    await applyLabelsToIssue(octokit, labels, config)
  }

  return mergedResponseFile
}
