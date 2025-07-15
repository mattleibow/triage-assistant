import * as core from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import { commentOnIssue, applyLabelsToIssue, addEyes, removeEyes } from './github-issues.js'
import { generateSummary, mergeResponses } from './prompts-summary.js'
import { TriageResponse } from './triage-response.js'
import { ApplyLabelsConfig, ApplyReactionsConfig, ApplySummaryCommentConfig, TriageConfig } from './triage-config.js'

/**
 * Manages reactions (such as eyes) for an issue or PR.
 *
 * @param config The reactions configuration object.
 * @param addReaction If true, add the reaction; if false, remove it.
 */
export async function manageReactions(
  config: ApplyReactionsConfig & TriageConfig,
  addReaction: boolean
): Promise<void> {
  const octokit = github.getOctokit(config.token)
  if (addReaction) {
    await addEyes(octokit, config)
  } else {
    await removeEyes(octokit, config)
  }
}

/**
 * Applies labels and comments to an issue based on merged response data.
 *
 * @param inputFiles Comma or newline separated list of input files.
 * @param config The triage configuration object.
 */
export async function applyLabelsAndComment(
  config: ApplyLabelsConfig & ApplySummaryCommentConfig & TriageConfig
): Promise<void> {
  const octokit = github.getOctokit(config.token)

  // Merge response JSON files
  const mergedResponseFile = path.join(config.tempDir, 'triage-assistant', 'responses.json')
  const responseDir = path.join(config.tempDir, 'triage-assistant', 'responses')
  const mergedResponse = await mergeResponses('', responseDir, mergedResponseFile)

  // Log the merged response for debugging
  core.info(`Merged response: ${JSON.stringify(mergedResponse, null, 2)}`)

  // Generate summary using AI
  if (config.applyComment) {
    await applyComment(octokit, mergedResponseFile, config)
  }

  // Apply labels to the issue
  if (config.applyLabels) {
    await applyLabels(octokit, mergedResponse, config)
  }
}

async function applyComment(
  octokit: ReturnType<typeof github.getOctokit>,
  mergedResponseFile: string,
  config: ApplySummaryCommentConfig & TriageConfig
): Promise<void> {
  const summaryResponseFile = await generateSummary(config, mergedResponseFile)

  // Comment on the issue
  await commentOnIssue(octokit, summaryResponseFile, config, config.commentFooter)
}

async function applyLabels(
  octokit: ReturnType<typeof github.getOctokit>,
  mergedResponse: TriageResponse,
  config: ApplyLabelsConfig & TriageConfig
): Promise<void> {
  await applyLabelsToIssue(octokit, mergedResponse, config)
}
