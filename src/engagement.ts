import * as core from '@actions/core'
import * as github from '@actions/github'
import { EngagementConfig } from './triage-config.js'
import {
  EngagementResponse,
  EngagementResponseItem,
  EngagementResponseEngagementClassification,
  IssueDetails,
  CommentData,
  ProjectItem,
  ProjectDetails
} from './engagement-types.js'

/**
 * Calculate engagement scores for issues in a project
 * @param config - Configuration object containing project and authentication details
 * @returns Promise<EngagementResponse> - The engagement response with scores
 */
export async function calculateEngagementScores(config: EngagementConfig): Promise<EngagementResponse> {
  const octokit = github.getOctokit(config.projectToken)

  if (config.project) {
    return await calculateProjectEngagementScores(config, octokit)
  } else {
    return await calculateIssueEngagementScores(config, octokit)
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
  const previousScore = calculatePreviousScore(issueDetails)

  const item: EngagementResponseItem = {
    id: null,
    issue: {
      id: issueDetails.id,
      owner: config.repoOwner,
      repo: config.repoName,
      number: issueDetails.number
    },
    engagement: {
      score,
      previousScore,
      classification: score > previousScore ? EngagementResponseEngagementClassification.Hot : null
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
  const projectDetails = await getProjectDetails(octokit, config.repoOwner, projectNumber)
  const projectItems = await getProjectItems(octokit, config.repoOwner, projectNumber)

  const items: EngagementResponseItem[] = []

  for (const projectItem of projectItems) {
    if (projectItem.content) {
      const issueDetails = await getIssueDetails(
        octokit,
        config.repoOwner,
        config.repoName,
        projectItem.content.number
      )
      const score = calculateScore(issueDetails)
      const previousScore = calculatePreviousScore(issueDetails)

      const item: EngagementResponseItem = {
        id: projectItem.id,
        issue: {
          id: projectItem.content.id,
          owner: config.repoOwner,
          repo: config.repoName,
          number: projectItem.content.number
        },
        engagement: {
          score,
          previousScore,
          classification: score > previousScore ? EngagementResponseEngagementClassification.Hot : null
        }
      }

      items.push(item)
    }
  }

  return {
    items,
    totalItems: items.length,
    project: {
      id: projectDetails.id,
      owner: config.repoOwner,
      number: projectNumber
    }
  }
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

  const commentsData: CommentData[] = comments.map(comment => ({
    id: comment.id,
    user: comment.user!,
    created_at: comment.created_at,
    reactions: comment.reactions!
  }))

  return {
    id: issue.id,
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
 * Get project details using GraphQL API
 */
async function getProjectDetails(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  projectNumber: number
): Promise<ProjectDetails> {
  // Since the REST API for projects has changed, we'll use a simplified approach
  // In a real implementation, you'd use GraphQL API
  return {
    id: `project-${projectNumber}`,
    number: projectNumber,
    title: `Project ${projectNumber}`,
    url: `https://github.com/orgs/${owner}/projects/${projectNumber}`,
    owner: {
      login: owner
    }
  }
}

/**
 * Get all items in a project using GraphQL API
 */
async function getProjectItems(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  projectNumber: number
): Promise<ProjectItem[]> {
  // Note: This requires GraphQL API to get project items
  // For this implementation, we'll use a workaround by getting repository issues
  // In a real scenario, you'd need to use the GraphQL API
  
  core.info('Using repository issues as project items (simplified implementation)')
  
  try {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo: github.context.repo.repo,
      state: 'all',
      per_page: 100
    })

    return issues.map(issue => ({
      id: `item-${issue.id}`,
      content: {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        body: issue.body || '',
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at,
        comments: issue.comments,
        reactions: issue.reactions!,
        user: issue.user!,
        assignees: issue.assignees!
      }
    }))
  } catch (error) {
    core.warning(`Failed to get project items: ${error}`)
    return []
  }
}

/**
 * Calculate engagement score for an issue based on the C# service algorithm
 */
function calculateScore(issue: IssueDetails): number {
  // Components from the C# service:
  // - Number of Comments       => Indicates discussion and interest
  // - Number of Reactions      => Shows emotional engagement
  // - Number of Contributors   => Reflects the diversity of input
  // - Time Since Last Activity => More recent activity indicates higher engagement
  // - Issue Age                => Older issues might need more attention
  // - Number of Linked PRs     => Shows active work on the issue (not implemented)

  const totalComments = issue.comments
  const totalReactions = issue.reactions.total_count + (issue.comments_data?.reduce((sum, comment) => sum + comment.reactions.total_count, 0) || 0)
  const contributors = getUniqueContributors(issue)
  const lastActivity = Math.max(1, getTimeSinceLastActivity(issue))
  const issueAge = Math.max(1, getIssueAge(issue))
  const linkedPullRequests = 0 // Not implemented yet

  // Weights from the C# service:
  const CommentsWeight = 3
  const ReactionsWeight = 1
  const ContributorsWeight = 2
  const LastActivityWeight = 1
  const IssueAgeWeight = 1
  const LinkedPullRequestsWeight = 2

  const score = (CommentsWeight * totalComments) +
    (ReactionsWeight * totalReactions) +
    (ContributorsWeight * contributors) +
    (LastActivityWeight * (1 / lastActivity)) +
    (IssueAgeWeight * (1 / issueAge)) +
    (LinkedPullRequestsWeight * linkedPullRequests)

  return Math.round(score)
}

/**
 * Calculate previous score (7 days ago) - simplified implementation
 */
function calculatePreviousScore(issue: IssueDetails): number {
  // This is a simplified implementation
  // In a real scenario, you'd need to get historical data
  // For now, we'll return 0 as a placeholder
  return 0
}

/**
 * Get unique contributors to an issue
 */
function getUniqueContributors(issue: IssueDetails): number {
  const contributors = new Set<string>()
  
  // Add issue author
  contributors.add(issue.user.login)
  
  // Add assignees
  issue.assignees.forEach(assignee => contributors.add(assignee.login))
  
  // Add comment authors
  issue.comments_data?.forEach(comment => contributors.add(comment.user.login))
  
  return contributors.size
}

/**
 * Get time since last activity in days
 */
function getTimeSinceLastActivity(issue: IssueDetails): number {
  const lastUpdate = new Date(issue.updated_at)
  const now = new Date()
  const diffMs = now.getTime() - lastUpdate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.ceil(diffDays)
}

/**
 * Get issue age in days
 */
function getIssueAge(issue: IssueDetails): number {
  const created = new Date(issue.created_at)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.ceil(diffDays)
}

/**
 * Update project field with engagement scores
 */
export async function updateProjectWithScores(config: EngagementConfig, response: EngagementResponse): Promise<void> {
  if (!config.updateProject || !response.project) {
    core.info('Skipping project update')
    return
  }

  core.info(`Updating project #${config.project} with engagement scores`)
  
  // Note: This would require GraphQL API to update project fields
  // For now, we'll just log the actions that would be taken
  core.info(`Would update ${response.totalItems} items in project with engagement scores`)
  
  for (const item of response.items) {
    core.info(`Would update item ${item.id} with score ${item.engagement.score}`)
  }
}