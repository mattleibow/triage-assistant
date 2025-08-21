import * as core from '@actions/core'
import * as path from 'path'
import * as github from '@actions/github'
import { selectLabels } from '../prompts/select-labels.js'
import { mergeResponses } from './merge.js'
import {
  commentOnIssue,
  applyLabelsToIssue,
  addEyes,
  removeEyes,
  searchIssues,
  applyLabelsToBulkIssues
} from '../github/issues.js'
import { generateSummary } from '../prompts/summary.js'
import { EverythingConfig, ApplyLabelsConfig, ApplySummaryCommentConfig, TriageConfig } from '../config.js'

type Octokit = ReturnType<typeof github.getOctokit>

/**
 * Run the normal triage workflow
 */
export async function runTriageWorkflow(config: EverythingConfig): Promise<string> {
  const octokit = github.getOctokit(config.token)

  // Handle bulk labeling with search query
  if (config.searchQuery) {
    return await runBulkLabelingWorkflow(octokit, config)
  }

  // Continue with single-issue workflow
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
 * Run the bulk labeling workflow using search query
 */
async function runBulkLabelingWorkflow(octokit: Octokit, config: EverythingConfig): Promise<string> {
  if (!config.searchQuery) {
    throw new Error('Search query is required for bulk labeling')
  }

  core.info('Running bulk labeling workflow with search query')

  try {
    // Step 1: Search for issues matching the query
    const issueNumbers = await searchIssues(octokit, config.searchQuery, config.repoOwner, config.repoName)

    if (issueNumbers.length === 0) {
      core.warning('No issues found matching the search query')
      return ''
    }

    // Step 2: If we have a template, generate labels using AI for the first issue as a sample
    let labels: string[] = []
    if (config.template && issueNumbers.length > 0) {
      // Use the first issue as a sample for AI label generation
      const sampleConfig = { ...config, issueNumber: issueNumbers[0] }
      await selectLabels(sampleConfig)

      // Parse the response to extract labels
      const mergedResponseFile = path.join(config.tempDir, 'triage-assistant', 'responses.json')
      const responsesDir = path.join(config.tempDir, 'triage-assistant', 'responses')
      const mergedResponse = await mergeResponses('', responsesDir, mergedResponseFile)

      labels = mergedResponse.labels?.map((l) => l.label)?.filter(Boolean) || []
      core.info(`Generated labels from AI analysis: ${labels.join(', ')}`)
    }

    // If we have specific labels configured, use those
    if (config.label) {
      labels = [config.label]
      core.info(`Using configured label: ${config.label}`)
    }

    // Step 3: Apply labels to all found issues
    if (config.applyLabels && labels.length > 0) {
      await applyLabelsToBulkIssues(octokit, issueNumbers, labels, config)
    } else if (labels.length === 0) {
      core.warning('No labels to apply. Either specify a label or use a template for AI-generated labels.')
    }

    return ''
  } catch (error) {
    core.error(`Bulk labeling workflow failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
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
}
