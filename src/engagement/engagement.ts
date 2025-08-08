import * as core from '@actions/core'
import * as fs from 'fs'
import { GraphQLClient } from 'graphql-request'
import { getSdk, Sdk as GraphQLSdk } from '../generated/graphql.js'
import { EverythingConfig, EngagementConfig } from '../config.js'
import { EngagementResponse, EngagementItem, EngagementClassification } from './engagement-types.js'
import { getIssueDetails } from '../github/issues.js'
import { getProjectDetails, updateProjectWithScores } from '../github/projects.js'
import { calculateScore, calculateHistoricalScore } from '../github/issue-details.js'
import { IssueDetails } from '../github/types.js'
import { loadTriageConfig, EngagementWeights } from './engagement-config.js'

/**
 * Run the complete engagement scoring workflow
 * @param config - The triage configuration
 * @returns Promise<string> - The engagement response file path
 */
export async function runEngagementWorkflow(config: EverythingConfig): Promise<string> {
  core.info('Running in engagement scoring mode')

  // Load engagement weights from configuration file
  const weights = await loadTriageConfig(process.cwd())

  const graphql = new GraphQLClient('https://api.github.com/graphql', {
    headers: {
      Authorization: `Bearer ${config.token}`
    }
  })
  const sdk = getSdk(graphql)

  const engagementResponse = await calculateEngagementScores(config, sdk, weights)
  core.info(`Calculated engagement scores for ${engagementResponse.totalItems} items`)

  // Update project with scores if requested
  if (config.applyScores) {
    await updateProjectWithScores(config, sdk, engagementResponse)
  }

  // Save engagement response to file
  const engagementFile = `${config.tempDir}/engagement-response.json`
  await fs.promises.writeFile(engagementFile, JSON.stringify(engagementResponse, null, 2))

  return engagementFile
}

/**
 * Calculate engagement scores for issues in a project or single issue
 * @param config - Configuration object containing project and authentication details
 * @param graphql - GraphQL SDK instance for making API calls
 * @param weights - Engagement scoring weights configuration
 * @returns Promise<EngagementResponse> - The engagement response with scores
 */
export async function calculateEngagementScores(
  config: EngagementConfig,
  graphql: GraphQLSdk,
  weights: Required<EngagementWeights>
): Promise<EngagementResponse> {
  if (config.projectNumber && config.projectNumber > 0) {
    return await calculateProjectEngagementScores(config, graphql, weights)
  } else if (config.issueNumber && config.issueNumber > 0) {
    return await calculateIssueEngagementScores(config, graphql, weights)
  } else {
    throw new Error('Either project number or issue number must be specified')
  }
}

/**
 * Calculate engagement scores for a single issue
 */
async function calculateIssueEngagementScores(
  config: EngagementConfig,
  graphql: GraphQLSdk,
  weights: Required<EngagementWeights>
): Promise<EngagementResponse> {
  core.info(`Calculating engagement score for issue #${config.issueNumber}`)

  const issueDetails = await getIssueDetails(graphql, config.repoOwner, config.repoName, config.issueNumber!)
  const item = await createEngagementItem(issueDetails, undefined, weights)

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
  graphql: GraphQLSdk,
  weights: Required<EngagementWeights>
): Promise<EngagementResponse> {
  core.info(`Calculating engagement scores for project #${config.projectNumber}`)

  const projectNumber = config.projectNumber!
  const project = await getProjectDetails(graphql, config.repoOwner, config.repoName, projectNumber)

  if (!project || !project.items || project.items.length === 0) {
    core.warning('No project items found or unable to determine project ID')
    return {
      items: [],
      totalItems: 0
    }
  }

  core.info(`Found ${project.items.length} items in project #${projectNumber}`)

  const items: EngagementItem[] = []
  for (const projectItem of project.items) {
    const issueDetails = await getIssueDetails(
      graphql,
      projectItem.content.owner,
      projectItem.content.repo,
      projectItem.content.number
    )
    const item = await createEngagementItem(issueDetails, projectItem.id, weights)
    items.push(item)
  }

  return {
    items,
    totalItems: items.length,
    project: {
      id: project.id,
      owner: project.owner,
      number: project.number
    }
  }
}

/**
 * Helper function to create engagement item - avoids code duplication
 */
export async function createEngagementItem(
  issueDetails: IssueDetails,
  projectItemId?: string,
  weights?: Required<EngagementWeights>
): Promise<EngagementItem> {
  const score = calculateScore(issueDetails, weights)
  const previousScore = await calculateHistoricalScore(issueDetails, weights)

  const item: EngagementItem = {
    ...(projectItemId && { id: projectItemId }),
    issue: {
      id: issueDetails.id,
      owner: issueDetails.owner,
      repo: issueDetails.repo,
      number: issueDetails.number
    },
    engagement: {
      score,
      previousScore,
      classification: score > previousScore ? EngagementClassification.Hot : undefined
    }
  }

  return item
}
