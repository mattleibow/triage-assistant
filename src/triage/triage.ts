import * as core from '@actions/core'
import * as path from 'path'
import * as github from '@actions/github'
import { selectLabels } from '../prompts/select-labels.js'
import { mergeResponses } from './merge.js'
import { commentOnIssue, applyLabelsToIssue, addEyes, removeEyes, upsertNeedsInfoComment } from '../github/issues.js'
import { generateSummary } from '../prompts/summary.js'
import { EverythingConfig, ApplyLabelsConfig, ApplySummaryCommentConfig, TriageConfig } from '../config.js'
import { MissingInfoPayload } from './triage-response.js'

type Octokit = ReturnType<typeof github.getOctokit>

/**
 * Run the normal triage workflow
 */
export async function runTriageWorkflow(config: EverythingConfig): Promise<string> {
  const octokit = github.getOctokit(config.token)

  const shouldAddLabels = config.template ? true : false
  const shouldAddSummary = config.applyLabels || config.applyComment
  const shouldAddReactions = shouldAddLabels || shouldAddSummary
  const shouldRemoveReactions = shouldAddSummary

  try {
    let responseFile = ''

    // Step 1: Add eyes reaction at the start
    if (shouldAddReactions) {
      await addEyes(octokit, config)
    }

    // Step 2: Select labels if template is provided
    if (shouldAddLabels) {
      responseFile = await selectLabels(config)
    }

    // Step 3: Apply labels and comment if requested
    if (shouldAddSummary) {
      await mergeAndApplyTriage(octokit, config)
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
) {
  // Merge response JSON files
  const mergedResponseFile = path.join(config.tempDir, 'triage-assistant', 'responses.json')
  const responsesDir = path.join(config.tempDir, 'triage-assistant', 'responses')
  const mergedResponse = await mergeResponses('', responsesDir, mergedResponseFile)

  // Log the merged response for debugging
  core.info(`Merged response: ${JSON.stringify(mergedResponse, null, 2)}`)

  // Check if this is a missing-info response (has structured missing info fields)
  const isMissingInfoResponse = hasMissingInfoStructure(mergedResponse)

  // Handle comments (either missing-info comment or regular summary comment)
  if (config.applyComment) {
    if (isMissingInfoResponse) {
      // Upsert missing-info comment
      await upsertNeedsInfoComment(octokit, mergedResponse as MissingInfoPayload, config)
    } else {
      // Generate summary response using AI and comment on the issue
      const summaryResponseFile = await generateSummary(config, mergedResponseFile)
      await commentOnIssue(octokit, summaryResponseFile, config, config.commentFooter)
    }
  }

  // Handle labels (collect from both regular triage and missing-info responses)
  if (config.applyLabels) {
    // Collect all the labels from the merged response
    const labels = mergedResponse.labels?.map((l) => l.label)?.filter(Boolean) || []

    // Apply labels to the issue (this will handle both regular and missing-info labels)
    await applyLabelsToIssue(octokit, labels, config)
  }
}

/**
 * Checks if a response has the structure of a missing-info response.
 */
function hasMissingInfoStructure(response: Record<string, unknown>): boolean {
  return (
    typeof response === 'object' &&
    response !== null &&
    'repro' in response &&
    'missing' in response &&
    'questions' in response
  )
}
