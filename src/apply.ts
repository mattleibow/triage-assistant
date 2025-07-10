import * as core from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import { commentOnIssue, applyLabelsToIssue } from './issues.js'
import { ApplyConfig, ReactionsConfig } from './triage-config.js'
import { addEyes, removeEyes } from './reactions.js'
import { generateSummary, mergeResponses } from './summary.js'

/**
 * Manages reactions (such as eyes) for an issue or PR.
 *
 * @param config The reactions configuration object.
 * @param addReaction If true, add the reaction; if false, remove it.
 */
export async function manageReactions(config: ReactionsConfig, addReaction: boolean): Promise<void> {
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
export async function applyLabelsAndComment(config: ApplyConfig): Promise<void> {
  const octokit = github.getOctokit(config.token)

  // Merge response JSON files
  const mergedResponseFile = path.join(config.tempDir, 'triage-assistant', 'responses.json')
  const responseDir = path.join(config.tempDir, 'triage-assistant', 'responses')
  const mergedResponse = await mergeResponses('', responseDir, mergedResponseFile)

  // Log the merged response for debugging
  core.info(`Merged response: ${JSON.stringify(mergedResponse, null, 2)}`)

  if (config.applyComment) {
    // Generate summary using AI
    const summaryResponseFile = await generateSummary(config, mergedResponseFile)

    // Comment on the issue
    await commentOnIssue(octokit, summaryResponseFile, config, config.commentFooter)
  }

  if (config.applyLabels) {
    // Apply labels to the issue
    await applyLabelsToIssue(octokit, mergedResponse, config)
  }
}
