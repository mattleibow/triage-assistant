import * as core from '@actions/core'
import * as github from '@actions/github'
import { EverythingConfig, EngagementConfig } from './triage-config.js'
import { EngagementResponse, EngagementItem, IssueDetails, CommentData } from './engagement-types.js'

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
  if (config.project && parseInt(config.project, 10) > 0) {
    return await calculateProjectEngagementScores(config, octokit)
  } else if (config.issueNumber > 0) {
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

  const issueDetails = await getIssueDetails(octokit, config.repoOwner, config.repoName, config.issueNumber)
  const score = calculateScore(issueDetails)
  const previousScore = await calculatePreviousScore(issueDetails, octokit, config.repoOwner, config.repoName)

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
  core.info(`Calculating engagement scores for project #${config.project}`)

  const projectNumber = parseInt(config.project, 10)
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
      const previousScore = await calculatePreviousScore(issueDetails, octokit, projectItem.content.owner, projectItem.content.repo)

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
 * Get all project items using GraphQL API with pagination
 */
async function getAllProjectItems(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  projectNumber: number
): Promise<Array<{ id: string; projectId: string; content?: { type: string; owner: string; repo: string; number: number } }>> {
  const query = `
    query($owner: String!, $repo: String!, $projectNumber: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        projectV2(number: $projectNumber) {
          id
          items(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              content {
                ... on Issue {
                  number
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const allItems: Array<{ id: string; projectId: string; content?: { type: string; owner: string; repo: string; number: number } }> = []
  let cursor: string | undefined = undefined

  while (true) {
    const response: {
      repository: {
        projectV2: {
          id: string
          items: {
            pageInfo: {
              hasNextPage: boolean
              endCursor: string
            }
            nodes: Array<{
              id: string
              content?: {
                number: number
                repository: {
                  name: string
                  owner: {
                    login: string
                  }
                }
              }
            }>
          }
        }
      }
    } = await octokit.graphql(query, { owner, repo, projectNumber, cursor })

    if (!response.repository.projectV2) {
      throw new Error(`Project #${projectNumber} not found`)
    }

    const { items } = response.repository.projectV2
    
    for (const item of items.nodes) {
      if (item.content) {
        allItems.push({
          id: item.id,
          projectId: response.repository.projectV2.id,
          content: {
            type: 'Issue',
            owner: item.content.repository.owner.login,
            repo: item.content.repository.name,
            number: item.content.number
          }
        })
      }
    }

    if (!items.pageInfo.hasNextPage) {
      break
    }

    cursor = items.pageInfo.endCursor
  }

  return allItems
}

/**
 * Get detailed information about an issue including comments
 */
async function getIssueDetails(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueDetails> {
  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber
  })

  // Get issue comments
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  })

  const commentsData: CommentData[] = comments.map((comment) => ({
    id: comment.id,
    user: comment.user!,
    created_at: comment.created_at,
    reactions: comment.reactions!
  }))

  return {
    id: issue.id.toString(),
    number: issue.number,
    title: issue.title,
    body: issue.body || '',
    state: issue.state,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    comments: issue.comments,
    reactions: issue.reactions!,
    comments_data: commentsData,
    user: issue.user!,
    assignees: issue.assignees!
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
export async function calculatePreviousScore(
  issue: IssueDetails,
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string
): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const issueCreatedAt = new Date(issue.created_at)
  
  // If issue was created less than 7 days ago, return 0
  if (issueCreatedAt > sevenDaysAgo) {
    return 0
  }

  // Create historic snapshot by filtering comments and reactions to 7 days ago
  const historicComments = issue.comments_data?.filter(comment => {
    const commentDate = new Date(comment.created_at)
    return commentDate <= sevenDaysAgo
  }).map(comment => ({
    ...comment,
    reactions: {
      ...comment.reactions,
      total_count: 0 // Simplified - would need to get historic reactions
    }
  })) || []

  const historicIssue: IssueDetails = {
    ...issue,
    comments: historicComments.length,
    comments_data: historicComments,
    reactions: {
      ...issue.reactions,
      total_count: 0 // Simplified - would need to get historic reactions
    },
    updated_at: sevenDaysAgo.toISOString()
  }

  return calculateScore(historicIssue)
}

/**
 * Get unique contributors to an issue
 */
export function getUniqueContributors(issue: IssueDetails): number {
  const contributors = new Set<string>()

  // Add issue author
  contributors.add(issue.user.login)

  // Add assignees
  issue.assignees.forEach((assignee) => contributors.add(assignee.login))

  // Add comment authors
  issue.comments_data?.forEach((comment) => contributors.add(comment.user.login))

  return contributors.size
}

/**
 * Get time since last activity in days
 */
export function getTimeSinceLastActivity(issue: IssueDetails): number {
  const lastUpdate = new Date(issue.updated_at)
  const now = new Date()
  const diffMs = now.getTime() - lastUpdate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.ceil(diffDays)
}

/**
 * Get issue age in days
 */
export function getIssueAge(issue: IssueDetails): number {
  const created = new Date(issue.created_at)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.ceil(diffDays)
}

/**
 * Update project field with engagement scores
 */
export async function updateProjectWithScores(
  config: EngagementConfig,
  response: EngagementResponse,
  octokit: ReturnType<typeof github.getOctokit>
): Promise<void> {
  if (!config.applyScores || !config.project) {
    core.info('Skipping project update')
    return
  }

  core.info(`Updating project #${config.project} with engagement scores`)

  const projectNumber = parseInt(config.project, 10)
  const projectField = await getProjectField(octokit, config.repoOwner, config.repoName, projectNumber, config.projectColumn)

  if (!projectField) {
    core.warning(`Field "${config.projectColumn}" not found in project`)
    return
  }

  // Update each issue's engagement score
  let updatedCount = 0
  for (const item of response.items) {
    if (item.id) {
      try {
        await updateProjectItem(octokit, item.id, projectField.id, item.engagement.score.toString())
        updatedCount++
      } catch (error) {
        core.warning(`Failed to update item ${item.id}: ${error}`)
      }
    }
  }

  core.info(`Updated ${updatedCount} project items with engagement scores`)
}

/**
 * Get project field information
 */
async function getProjectField(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  projectNumber: number,
  fieldName: string
): Promise<{ id: string; name: string } | null> {
  const query = `
    query($owner: String!, $repo: String!, $projectNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        projectV2(number: $projectNumber) {
          id
          fields(first: 100) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
            }
          }
        }
      }
    }
  `

  const response: {
    repository: {
      projectV2: {
        id: string
        fields: {
          nodes: Array<{
            id: string
            name: string
            dataType: string
          }>
        }
      }
    }
  } = await octokit.graphql(query, { owner, repo, projectNumber })

  if (!response.repository.projectV2) {
    throw new Error(`Project #${projectNumber} not found`)
  }

  const field = response.repository.projectV2.fields.nodes.find((f) => f.name === fieldName)
  
  if (!field) {
    const availableFields = response.repository.projectV2.fields.nodes.map(f => f.name).join(', ')
    core.warning(`Field "${fieldName}" not found. Available fields: ${availableFields}`)
    return null
  }

  return { id: field.id, name: field.name }
}

/**
 * Update a project item field
 */
async function updateProjectItem(
  octokit: ReturnType<typeof github.getOctokit>,
  itemId: string,
  fieldId: string,
  value: string
): Promise<void> {
  const mutation = `
    mutation($itemId: ID!, $fieldId: ID!, $value: String!) {
      updateProjectV2ItemFieldValue(input: {
        itemId: $itemId
        fieldId: $fieldId
        value: {
          text: $value
        }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `

  await octokit.graphql(mutation, {
    itemId,
    fieldId,
    value
  })
}