import * as core from '@actions/core'
import * as github from '@actions/github'
import { EverythingConfig, EngagementConfig } from './triage-config.js'
import { EngagementResponse, EngagementItem } from './engagement-types.js'
import { getIssueDetails } from './github-issues.js'
import { getAllProjectItems, updateProjectWithScores } from './github-projects.js'
import { IssueDetails, calculateScore, calculatePreviousScore } from './issue-details.js'

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
  const item = await createEngagementItem(issueDetails)

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
      const item = await createEngagementItem(issueDetails, projectItem.id)
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
 * Helper function to create engagement item - avoids code duplication
 */
export async function createEngagementItem(issueDetails: IssueDetails, projectItemId?: string): Promise<any> {
  const score = calculateScore(issueDetails)
  const previousScore = await calculatePreviousScore(issueDetails)

  const item = {
    ...(projectItemId && { id: projectItemId }),
    issueNumber: issueDetails.number,
    engagement: {
      score,
      previousScore,
      classification: score > previousScore ? 'Hot' : null
    }
  }

  return item
}
