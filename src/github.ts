import * as github from '@actions/github'
import * as fs from 'fs'
import { TriageResponse } from './triage-response.js'
import { GitHubConfig } from './triage-config.js'

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
