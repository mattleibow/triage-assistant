import * as core from '@actions/core'
import * as github from '@actions/github'
import { EngagementConfig, TriageConfig } from './triage-config.js'
import { EngagementResponse, EngagementItem, IssueDetails, CommentData } from './engagement-types.js'

/**
 * Run the complete engagement scoring workflow
 * @param config - The triage configuration
 * @returns Promise<string> - The engagement response file path
 */
export async function runEngagementWorkflow(config: TriageConfig): Promise<string> {
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
  await core.summary.addRaw(JSON.stringify(engagementResponse, null, 2))

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
  if (config.project) {
    return await calculateProjectEngagementScores(config, octokit)
  } else if (config.issueNumber) {
    return await calculateIssueEngagementScores(config, octokit)
  } else {
    throw new Error('Either project or issue number must be specified')
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

  const issue = await getIssueDetails(octokit, config.repoOwner, config.repoName, config.issueNumber)
  const score = calculateScore(issue)
  const previousScore = calculatePreviousScore(issue)

  const engagementItem: EngagementItem = {
    id: issue.id.toString(),
    issue: {
      id: issue.id,
      owner: config.repoOwner,
      repo: config.repoName,
      number: issue.number
    },
    engagement: {
      score,
      previousScore,
      classification: score > previousScore ? 'Hot' : null
    }
  }

  return {
    items: [engagementItem],
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

  // Get project items
  const projectItems = await getAllProjectItems(octokit, config.repoOwner, config.project)
  core.info(`Found ${projectItems.length} items in project`)

  const engagementItems: EngagementItem[] = []

  for (const projectItem of projectItems) {
    if (projectItem.content && projectItem.content.number) {
      try {
        const issue = await getIssueDetails(octokit, config.repoOwner, config.repoName, projectItem.content.number)
        const score = calculateScore(issue)
        const previousScore = calculatePreviousScore(issue)

        const engagementItem: EngagementItem = {
          id: projectItem.id,
          issue: {
            id: issue.id,
            owner: config.repoOwner,
            repo: config.repoName,
            number: issue.number
          },
          engagement: {
            score,
            previousScore,
            classification: score > previousScore ? 'Hot' : null
          }
        }

        engagementItems.push(engagementItem)
      } catch (error) {
        core.warning(`Failed to calculate engagement for issue #${projectItem.content.number}: ${error}`)
      }
    }
  }

  return {
    items: engagementItems,
    totalItems: engagementItems.length
  }
}

/**
 * Get all project items with pagination
 */
async function getAllProjectItems(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  projectNumber: number
): Promise<any[]> {
  const query = `
    query($owner: String!, $projectNumber: Int!, $cursor: String) {
      user(login: $owner) {
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
                    owner {
                      login
                    }
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const allItems: any[] = []
  let cursor: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    const result: any = await octokit.graphql(query, {
      owner,
      projectNumber,
      cursor
    })

    const items = result.user.projectV2.items
    allItems.push(...items.nodes)

    hasNextPage = items.pageInfo.hasNextPage
    cursor = items.pageInfo.endCursor
  }

  return allItems
}

/**
 * Get detailed issue information including comments and reactions
 */
async function getIssueDetails(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueDetails> {
  // Get issue details
  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber
  })

  // Get comments
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  })

  // Get issue reactions
  const { data: issueReactions } = await octokit.rest.reactions.listForIssue({
    owner,
    repo,
    issue_number: issueNumber
  })

  // Get comment reactions
  const commentReactions: any[] = []
  for (const comment of comments) {
    const { data: reactions } = await octokit.rest.reactions.listForIssueComment({
      owner,
      repo,
      comment_id: comment.id
    })
    commentReactions.push(...reactions)
  }

  // Convert to our format
  const commentData: CommentData[] = comments.map(comment => ({
    id: comment.id,
    user: { login: comment.user?.login || 'unknown' },
    created_at: comment.created_at,
    updated_at: comment.updated_at
  }))

  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body || '',
    state: issue.state,
    user: { login: issue.user?.login || 'unknown' },
    assignees: issue.assignees?.map(a => ({ login: a.login })) || [],
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    comments: commentData,
    reactions: issueReactions,
    commentReactions
  }
}

/**
 * Calculate engagement score for an issue
 */
export function calculateScore(issue: IssueDetails): number {
  // Components:
  //  - Number of Comments       => Indicates discussion and interest
  //  - Number of Reactions      => Shows emotional engagement  
  //  - Number of Contributors   => Reflects the diversity of input
  //  - Time Since Last Activity => More recent activity indicates higher engagement
  //  - Issue Age                => Older issues might need more attention
  //  - Number of Linked PRs     => Shows active work on the issue
  
  const totalComments = issue.comments.length
  const totalReactions = issue.reactions.length + issue.commentReactions.length
  const contributors = getUniqueContributors(issue)
  const lastActivity = Math.max(1, getDaysSince(getLastActivityDate(issue)))
  const issueAge = Math.max(1, getDaysSince(issue.created_at))
  const linkedPullRequests = 0 // Placeholder - not implemented yet

  // Weights:
  const CommentsWeight = 3
  const ReactionsWeight = 1
  const ContributorsWeight = 2
  const LastActivityWeight = 1
  const IssueAgeWeight = 1
  const LinkedPullRequestsWeight = 2

  const score = 
    (CommentsWeight * totalComments) +
    (ReactionsWeight * totalReactions) +
    (ContributorsWeight * contributors) +
    (LastActivityWeight * Math.floor(1 / lastActivity)) +
    (IssueAgeWeight * Math.floor(1 / issueAge)) +
    (LinkedPullRequestsWeight * linkedPullRequests)

  return Math.round(score)
}

/**
 * Calculate previous score (7 days ago)
 */
export function calculatePreviousScore(issue: IssueDetails): number {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  // Filter out activities after 7 days ago
  const historicIssue = tryGetHistoricIssue(issue, sevenDaysAgo)
  
  if (!historicIssue) {
    return 0
  }
  
  return calculateScore(historicIssue)
}

/**
 * Get historic version of issue at a specific point in time
 */
function tryGetHistoricIssue(issue: IssueDetails, cutoffDate: Date): IssueDetails | null {
  const issueCreated = new Date(issue.created_at)
  
  // If issue was created after cutoff date, return null
  if (issueCreated > cutoffDate) {
    return null
  }
  
  // Filter comments and reactions to only include those before cutoff
  const filteredComments = issue.comments.filter(comment => new Date(comment.created_at) <= cutoffDate)
  const filteredReactions = issue.reactions.filter(reaction => new Date(reaction.created_at) <= cutoffDate)
  const filteredCommentReactions = issue.commentReactions.filter(reaction => new Date(reaction.created_at) <= cutoffDate)
  
  return {
    ...issue,
    comments: filteredComments,
    reactions: filteredReactions,
    commentReactions: filteredCommentReactions
  }
}

/**
 * Get unique contributors to an issue
 */
function getUniqueContributors(issue: IssueDetails): number {
  const contributors = new Set<string>()

  // Add issue author
  contributors.add(issue.user.login)

  // Add assignees
  issue.assignees.forEach(assignee => {
    contributors.add(assignee.login)
  })

  // Add commenters
  issue.comments.forEach(comment => {
    contributors.add(comment.user.login)
  })

  return contributors.size
}

/**
 * Get the date of last activity on an issue
 */
function getLastActivityDate(issue: IssueDetails): string {
  let lastDate = issue.updated_at

  // Check comments for more recent activity
  issue.comments.forEach(comment => {
    if (comment.updated_at > lastDate) {
      lastDate = comment.updated_at
    }
  })

  return lastDate
}

/**
 * Get number of days since a date
 */
function getDaysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
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

  try {
    // Get project field information
    const projectField = await getProjectField(octokit, config.repoOwner, config.project, config.projectColumn)
    
    if (!projectField) {
      core.warning(`Project field '${config.projectColumn}' not found`)
      return
    }

    // Update each item with its engagement score
    for (const item of response.items) {
      await updateProjectItem(octokit, config.repoOwner, config.project, item.id, projectField.id, item.engagement.score)
    }

    core.info(`Successfully updated ${response.items.length} project items`)
  } catch (error) {
    core.warning(`Failed to update project: ${error}`)
  }
}

/**
 * Get project field by name
 */
async function getProjectField(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  projectNumber: number,
  fieldName: string
): Promise<{ id: string; name: string } | null> {
  const query = `
    query($owner: String!, $projectNumber: Int!) {
      user(login: $owner) {
        projectV2(number: $projectNumber) {
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

  const result: any = await octokit.graphql(query, {
    owner,
    projectNumber
  })

  const fields = result.user.projectV2.fields.nodes
  const field = fields.find((f: any) => f.name === fieldName)

  return field || null
}

/**
 * Update a project item with a field value
 */
async function updateProjectItem(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  projectNumber: number,
  itemId: string,
  fieldId: string,
  value: number
): Promise<void> {
  const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: {
            text: $value
          }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `

  // First get the project ID
  const projectQuery = `
    query($owner: String!, $projectNumber: Int!) {
      user(login: $owner) {
        projectV2(number: $projectNumber) {
          id
        }
      }
    }
  `

  const projectResult: any = await octokit.graphql(projectQuery, {
    owner,
    projectNumber
  })

  const projectId = projectResult.user.projectV2.id

  await octokit.graphql(mutation, {
    projectId,
    itemId,
    fieldId,
    value: value.toString()
  })
}