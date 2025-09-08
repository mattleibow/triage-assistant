import * as core from '@actions/core'
import * as path from 'path'
import * as github from '@actions/github'
import { selectLabels } from '../prompts/select-labels.js'
import { mergeResponses } from './merge.js'
import { commentOnIssue, applyLabelsToIssue, addEyes, removeEyes, searchIssues } from '../github/issues.js'
import { generateSummary } from '../prompts/summary.js'
import { ConfigFileLabels } from '../config-file.js'
import {
  ApplyLabelsConfig,
  ApplySummaryCommentConfig,
  LabelTriageWorkflowConfig,
  BulkLabelTriageWorkflowConfig,
  SingleLabelTriageWorkflowConfig,
  TriageConfig
} from '../config.js'
import { TriageResponse } from './triage-response.js'
import * as fs from 'fs'

type Octokit = ReturnType<typeof github.getOctokit>

/**
 * Run the normal triage workflow
 */
export async function runTriageWorkflow(
  config: LabelTriageWorkflowConfig,
  configFile: ConfigFileLabels
): Promise<string> {
  const octokit = github.getOctokit(config.token)

  if (config.issueQuery) {
    // Process all issues based on the query
    return await runBulkTriageWorkflow(octokit, config as BulkLabelTriageWorkflowConfig, configFile)
  } else if (config.issueNumber && config.issueNumber > 0) {
    // Process a single issue based on the number
    return await runSingleIssueTriageWorkflow(octokit, config as SingleLabelTriageWorkflowConfig, configFile)
  } else {
    throw new Error('Either issue number or issue query must be provided for triage workflow')
  }
}

/**
 * Run triage workflow for a single issue
 */
async function runSingleIssueTriageWorkflow(
  octokit: Octokit,
  config: SingleLabelTriageWorkflowConfig,
  configFile: ConfigFileLabels
): Promise<string> {
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
 * Run triage workflow for multiple issues from a search query
 */
async function runBulkTriageWorkflow(
  octokit: Octokit,
  config: BulkLabelTriageWorkflowConfig,
  configFile: ConfigFileLabels
): Promise<string> {
  core.info(`Running bulk triage workflow with query: ${config.issueQuery}`)

  // Search for issues and pull requests using the provided query
  const items = await searchIssues(octokit, config.issueQuery, config.repoOwner, config.repoName)

  if (items.length === 0) {
    core.info('No items found matching the search query')

    // Return an empty results file
    const finalResponseFile = path.join(config.tempDir, 'triage-assistant', 'bulk-responses.json')
    await fs.promises.mkdir(path.dirname(finalResponseFile), { recursive: true })
    await fs.promises.writeFile(finalResponseFile, JSON.stringify({}))
    return finalResponseFile
  }

  core.info(`Processing ${items.length} items (issues and pull requests)`)

  const itemResults: Record<number, TriageResponse> = {}

  // Process each item individually
  for (const item of items) {
    core.info(`Processing item #${item.number}`)

    try {
      // Create a separate config for this item with a unique working directory
      const itemConfig = {
        ...config,
        issueNumber: item.number,
        tempDir: path.join(config.tempDir, `item-${item.number}`)
      }

      // Run the single issue workflow for this item (works for both issues and PRs)
      const responseFile = await runSingleIssueTriageWorkflow(octokit, itemConfig, configFile)

      // If we got a response file, load it and store the result
      if (responseFile) {
        try {
          const responseContent = await fs.promises.readFile(responseFile, 'utf8')
          const response = JSON.parse(responseContent) as TriageResponse
          itemResults[item.number] = response

          core.info(`Successfully processed item #${item.number}`)
        } catch (error) {
          core.warning(`Failed to read response file for item #${item.number}: ${error}`)
        }
      }
    } catch (error) {
      core.error(`Failed to process item #${item.number}: ${error}`)
      // Continue with other items even if one fails
    }
  }

  // Create final merged response file
  const finalResponseFile = path.join(config.tempDir, 'triage-assistant', 'bulk-responses.json')
  await fs.promises.mkdir(path.dirname(finalResponseFile), { recursive: true })
  await fs.promises.writeFile(finalResponseFile, JSON.stringify(itemResults, null, 2))

  core.info(`Bulk triage complete. Processed ${Object.keys(itemResults).length} of ${items.length} items successfully`)

  return finalResponseFile
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

  // Check if this is a missing-info response (has structured missing info fields)
  const isMissingInfoResponse = hasMissingInfoStructure(mergedResponse)

  // For missing-info responses, determine which labels should be removed (only if we're applying labels)
  if (isMissingInfoResponse && config.applyLabels) {
    const labelsToRemove = await determineMissingInfoLabelsToRemove(
      octokit,
      mergedResponse as MissingInfoPayload,
      config
    )
    if (labelsToRemove.length > 0) {
      // Add labelsToRemove to the merged response
      mergedResponse.labelsToRemove = labelsToRemove
    }
  }

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

  // Handle label removal (if any labels need to be removed)
  if (config.applyLabels && mergedResponse.labelsToRemove) {
    await removeLabelsFromIssue(octokit, mergedResponse.labelsToRemove, config)
  }

  // Handle labels (collect from both regular triage and missing-info responses)
  if (config.applyLabels) {
    // Collect all the labels from the merged response
    const labels = mergedResponse.labels?.map((l) => l.label)?.filter(Boolean) || []

    // Apply labels to the issue (this will handle both regular and missing-info labels)
    await applyLabelsToIssue(octokit, labels, config)
  }

  return mergedResponseFile
}

/**
 * Determines which missing-info labels should be removed based on the current response.
 *
 * @param octokit The GitHub API client.
 * @param data The missing info payload.
 * @param config The triage configuration object.
 * @returns Array of label names that should be removed.
 */
async function determineMissingInfoLabelsToRemove(
  octokit: Octokit,
  data: MissingInfoPayload,
  config: GitHubIssueConfig & TriageConfig
): Promise<string[]> {
  const labelsToRemove: string[] = []

  // Get current labels on the issue
  const currentLabels = await octokit.rest.issues.listLabelsOnIssue({
    owner: config.repoOwner,
    repo: config.repoName,
    issue_number: config.issueNumber
  })

  const currentLabelNames = currentLabels.data.map((label) => label.name)
  const newLabelNames = new Set(data.labels?.map((l) => l.label) || [])

  // Define the needs-info related labels that we manage
  const needsInfoLabels = ['s/needs-info', 's/needs-repro']

  // Remove needs-info related labels that are currently on the issue but not in the new response
  for (const needsInfoLabel of needsInfoLabels) {
    if (currentLabelNames.includes(needsInfoLabel) && !newLabelNames.has(needsInfoLabel)) {
      labelsToRemove.push(needsInfoLabel)
    }
  }

  return labelsToRemove
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
