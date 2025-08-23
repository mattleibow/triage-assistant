import * as core from '@actions/core'
import * as path from 'path'
import * as github from '@actions/github'
import { selectLabels } from '../prompts/select-labels.js'
import { mergeResponses } from './merge.js'
import { commentOnIssue, applyLabelsToIssue, addEyes, removeEyes, searchIssues } from '../github/issues.js'
import { generateSummary } from '../prompts/summary.js'
import { ConfigFileLabels } from '../config-file.js'
import { ApplyLabelsConfig, ApplySummaryCommentConfig, LabelTriageWorkflowConfig, TriageConfig } from '../config.js'
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

  // Check if we need to process multiple issues from a query
  if (config.issueQuery) {
    return await runBulkTriageWorkflow(octokit, config, configFile)
  } else {
    return await runSingleIssueTriageWorkflow(octokit, config, configFile)
  }
}

/**
 * Run triage workflow for a single issue
 */
async function runSingleIssueTriageWorkflow(
  octokit: Octokit,
  config: LabelTriageWorkflowConfig,
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
  config: LabelTriageWorkflowConfig,
  configFile: ConfigFileLabels
): Promise<string> {
  core.info(`Running bulk triage workflow with query: ${config.issueQuery}`)

  // Search for issues using the provided query
  const issues = await searchIssues(octokit, config.issueQuery!, config.repoOwner, config.repoName)

  if (issues.length === 0) {
    core.info('No issues found matching the search query')
    // Return an empty results file
    const finalResponseFile = path.join(config.tempDir, 'triage-assistant', 'bulk-responses.json')
    await fs.promises.mkdir(path.dirname(finalResponseFile), { recursive: true })
    await fs.promises.writeFile(finalResponseFile, JSON.stringify({}))
    return finalResponseFile
  }

  core.info(`Processing ${issues.length} issues`)

  const issueResults: Record<number, TriageResponse> = {}

  // Process each issue individually
  for (const issue of issues) {
    core.info(`Processing issue #${issue.number}`)

    try {
      // Create a separate config for this issue with a unique working directory
      const issueConfig = {
        ...config,
        issueNumber: issue.number,
        tempDir: path.join(config.tempDir, `issue-${issue.number}`)
      }

      // Run the single issue workflow for this issue
      const responseFile = await runSingleIssueTriageWorkflow(octokit, issueConfig, configFile)

      // If we got a response file, load it and store the result
      if (responseFile) {
        try {
          const responseContent = await fs.promises.readFile(responseFile, 'utf8')
          const response = JSON.parse(responseContent) as TriageResponse
          issueResults[issue.number] = response
          core.info(`Successfully processed issue #${issue.number}`)
        } catch (error) {
          core.warning(`Failed to read response file for issue #${issue.number}: ${error}`)
        }
      }
    } catch (error) {
      core.error(`Failed to process issue #${issue.number}: ${error}`)
      // Continue with other issues even if one fails
    }
  }

  // Create final merged response file
  const finalResponseFile = path.join(config.tempDir, 'triage-assistant', 'bulk-responses.json')
  await fs.promises.mkdir(path.dirname(finalResponseFile), { recursive: true })
  await fs.promises.writeFile(finalResponseFile, JSON.stringify(issueResults, null, 2))

  core.info(
    `Bulk triage complete. Processed ${Object.keys(issueResults).length} of ${issues.length} issues successfully`
  )
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
