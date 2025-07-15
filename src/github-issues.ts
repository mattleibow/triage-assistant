import * as github from '@actions/github'
import * as fs from 'fs'
import { TriageResponse } from './triage-response.js'
import { GitHubConfig, ReactionsConfig } from './triage-config.js'

/**
 * Comments on an issue with the provided summary.
 *
 * @param summaryFile Path to the file containing the summary text.
 * @param config The triage configuration object.
 * @param octokit The GitHub API client.
 */
export async function commentOnIssue(
  octokit: ReturnType<typeof github.getOctokit>,
  summaryFile: string,
  config: GitHubConfig,
  footer?: string
): Promise<void> {
  const summary = await fs.promises.readFile(summaryFile, 'utf8')

  const commentBody = `
${summary}

${footer}
`

  await octokit.rest.issues.createComment({
    owner: config.repoOwner,
    repo: config.repoName,
    issue_number: config.issueNumber,
    body: commentBody
  })
}

/**
 * Applies labels to an issue based on the merged response data.
 *
 * @param mergedResponse The merged response containing labels to apply.
 * @param config The triage configuration object.
 * @param octokit The GitHub API client.
 */
export async function applyLabelsToIssue(
  octokit: ReturnType<typeof github.getOctokit>,
  mergedResponse: TriageResponse,
  config: GitHubConfig
): Promise<void> {
  const labels = mergedResponse.labels?.map((l) => l.label)?.filter(Boolean) || []

  if (labels.length > 0) {
    await octokit.rest.issues.addLabels({
      owner: config.repoOwner,
      repo: config.repoName,
      issue_number: config.issueNumber,
      labels
    })
  }
}

/**
 * Adds an 'eyes' reaction to the specified issue using the provided Octokit instance and config.
 * Ignores errors if the reaction already exists or is successfully created.
 *
 * @param octokit - An authenticated Octokit instance
 * @param config - The configuration for the repository and issue
 */
export async function addEyes(octokit: ReturnType<typeof github.getOctokit>, config: ReactionsConfig) {
  try {
    await octokit.rest.reactions.createForIssue({
      owner: config.repoOwner,
      repo: config.repoName,
      issue_number: config.issueNumber,
      content: 'eyes'
    })
  } catch (e) {
    const err = e as { status?: number }
    if (!err.status || (err.status !== 200 && err.status !== 201 && err.status !== 409)) {
      throw e
    }
  }
}

/**
 * Removes the 'eyes' reaction from the specified issue if it was added by github-actions[bot].
 *
 * @param octokit - An authenticated Octokit instance
 * @param config - The configuration for the repository and issue
 */
export async function removeEyes(octokit: ReturnType<typeof github.getOctokit>, config: ReactionsConfig) {
  const reactions = await octokit.rest.reactions.listForIssue({
    owner: config.repoOwner,
    repo: config.repoName,
    issue_number: config.issueNumber
  })
  for (const reaction of reactions.data) {
    if (reaction.content === 'eyes' && reaction.user?.login === 'github-actions[bot]') {
      await octokit.rest.reactions.deleteForIssue({
        owner: config.repoOwner,
        repo: config.repoName,
        issue_number: config.issueNumber,
        reaction_id: reaction.id
      })
    }
  }
}
