import * as core from '@actions/core'
import * as github from '@actions/github'
import { EverythingConfig, EngagementConfig } from './triage-config.js'
import { EngagementResponse, EngagementItem } from './engagement-types.js'
import {
  IssueDetails,
  getHistoricalIssueDetails,
  getUniqueContributors,
  getTimeSinceLastActivity,
  getIssueAge
} from './issue-details.js'
import { getIssueDetails } from './github-issues.js'
import { getAllProjectItems, updateProjectWithScores } from './github-projects.js'

/**
 * Run the complete engagement scoring workflow
 * @param config - The triage configuration
 * @returns Promise<string> - The engagement response file path
 */
export async function runEngagementWorkflow(config: EverythingConfig): Promise<string> {
  core.info('Running in engagement scoring mode')

  const octokit = github.getOctokit(config.token)
  const engagementResponse = await calculateEngagementScores(config, octokit)
  core.info(`Calculated engagement scores for ${engagementResponse.totalItems} items`)

  // Update project with scores if requested
  if (config.applyScores) {
    await updateProjectWithScores(config, engagementResponse, octokit)
  }

  // Save engagement response to file
  const engagementFile = `${config.tempDir}/engagement-response.json`
  const fs = await import('fs')
  await fs.promises.writeFile(engagementFile, JSON.stringify(engagementResponse, null, 2))

  return engagementFile
}

/**
 * Calculate engagement scores for issues in a project or single issue
 * @param config - Configuration object containing project and authentication details
 * @param octokit - GitHub API client
 * @returns Promise<EngagementResponse> - The engagement response with scores
 */
export async function calculateEngagementScores(
  config: EngagementConfig,
  octokit: ReturnType<typeof github.getOctokit>
): Promise<EngagementResponse> {
  if (config.projectNumber && config.projectNumber > 0) {
    return await calculateProjectEngagementScores(config, octokit)
  } else if (config.issueNumber && config.issueNumber > 0) {
    return await calculateIssueEngagementScores(config, octokit)
  } else {
    throw new Error('Either project number or issue number must be specified')
  }
}

/**
 * Calculate engagement scores for a single issue
 */
async function calculateIssueEngagementScores(
  config: EngagementConfig,
  octokit: ReturnType<typeof github.getOctokit>
): Promise<EngagementResponse> {
  core.info(`Calculating engagement score for issue #${config.issueNumber}`)

  const issueDetails = await getIssueDetails(octokit, config.repoOwner, config.repoName, config.issueNumber!)
  const score = calculateScore(issueDetails)
  const previousScore = await calculatePreviousScore(issueDetails)

  const item: EngagementItem = {
    issueNumber: issueDetails.number,
    engagement: {
      score,
      previousScore,
      classification: score > previousScore ? 'Hot' : null
    }
  }

  return {
    items: [item],
    totalItems: 1
  }
}

/**
 * Calculate engagement scores for all issues in a project
 */
async function calculateProjectEngagementScores(
  config: EngagementConfig,
  octokit: ReturnType<typeof github.getOctokit>
): Promise<EngagementResponse> {
  core.info(`Calculating engagement scores for project #${config.projectNumber}`)

  const projectNumber = config.projectNumber!
  const projectItems = await getAllProjectItems(octokit, config.repoOwner, config.repoName, projectNumber)

  const items: EngagementItem[] = []

  for (const projectItem of projectItems) {
    if (projectItem.content?.type === 'Issue') {
      const issueDetails = await getIssueDetails(
        octokit,
        projectItem.content.owner,
        projectItem.content.repo,
        projectItem.content.number
      )
      const score = calculateScore(issueDetails)
      const previousScore = await calculatePreviousScore(issueDetails)

      const item: EngagementItem = {
        id: projectItem.id,
        issueNumber: issueDetails.number,
        engagement: {
          score,
          previousScore,
          classification: score > previousScore ? 'Hot' : null
        }
      }

      items.push(item)
    }
  }

  return {
    items,
    totalItems: items.length,
    project: {
      id: projectItems[0]?.projectId || '',
      owner: config.repoOwner,
      number: projectNumber
    }
  }
}

/**
 * Calculate engagement score for an issue based on the engagement algorithm
 */
export function calculateScore(issue: IssueDetails): number {
  // Components based on C# reference implementation:
  // - Number of Comments       => Indicates discussion and interest
  // - Number of Reactions      => Shows emotional engagement
  // - Number of Contributors   => Reflects the diversity of input
  // - Time Since Last Activity => More recent activity indicates higher engagement
  // - Issue Age                => Older issues might need more attention
  // - Number of Linked PRs     => Shows active work on the issue (not implemented)

  const totalComments = issue.comments
  const totalReactions =
    issue.reactions.total_count +
    (issue.comments_data?.reduce((sum, comment) => sum + comment.reactions.total_count, 0) || 0)
  const contributors = getUniqueContributors(issue)
  const lastActivity = Math.max(1, getTimeSinceLastActivity(issue))
  const issueAge = Math.max(1, getIssueAge(issue))
  const linkedPullRequests = 0 // Not implemented yet

  // Weights from C# implementation:
  const CommentsWeight = 3
  const ReactionsWeight = 1
  const ContributorsWeight = 2
  const LastActivityWeight = 1
  const IssueAgeWeight = 1
  const LinkedPullRequestsWeight = 2

  const score =
    CommentsWeight * totalComments +
    ReactionsWeight * totalReactions +
    ContributorsWeight * contributors +
    LastActivityWeight * (1 / lastActivity) +
    IssueAgeWeight * (1 / issueAge) +
    LinkedPullRequestsWeight * linkedPullRequests

  return Math.round(score)
}

/**
 * Calculate previous score (7 days ago) based on C# reference implementation
 */
export async function calculatePreviousScore(issue: IssueDetails): Promise<number> {
  const historicIssue = getHistoricalIssueDetails(issue)
  return calculateScore(historicIssue)
}
