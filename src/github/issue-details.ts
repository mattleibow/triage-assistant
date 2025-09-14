import { IssueDetails } from './types.js'
import { ConfigFileEngagementWeights } from '../config-file.js'
import { EngagementWeights, getWeightForRole, UserGroups } from '../engagement/engagement-config.js'
import { detectUserRole, RepoInfo } from './role-detection.js'
import { Sdk as GraphQLSdk } from '../generated/graphql.js'

/**
 * Get historic issue details by filtering activity to 7 days ago
 */
export function getHistoricalIssueDetails(issue: IssueDetails): IssueDetails {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // If the issue is newer than 7 days, return it as-is
  if (issue.createdAt > sevenDaysAgo) {
    return {
      ...issue,
      comments: [],
      reactions: []
    }
  }

  // Filter reactions to only include those created before 7 days ago
  const historicReactions = (issue.reactions || []).filter((reaction) => {
    return reaction.createdAt <= sevenDaysAgo
  })

  // Create historic snapshot by filtering comments and reactions to 7 days ago
  const historicComments = (issue.comments || [])
    .filter((comment) => {
      return comment.createdAt <= sevenDaysAgo
    })
    .map((comment) => {
      // Filter comment reactions to only include those created before 7 days ago
      const commentHistoricReactions = (comment.reactions || []).filter((reaction) => {
        return reaction.createdAt <= sevenDaysAgo
      })

      return {
        ...comment,
        reactions: commentHistoricReactions
      }
    })

  const historicIssue: IssueDetails = {
    ...issue,
    comments: historicComments || [],
    reactions: historicReactions || [],
    updatedAt: sevenDaysAgo
  }

  return historicIssue
}

/**
 * Get unique contributors to an issue
 */
export function getUniqueContributorsCount(issue: IssueDetails): number {
  const contributors = new Set<string>()

  // Add issue author
  contributors.add(issue.user.login)

  // Add assignees
  issue.assignees.forEach((assignee) => contributors.add(assignee.login))

  // Add comment authors
  issue.comments?.forEach((comment) => contributors.add(comment.user.login))

  return contributors.size
}

/**
 * Get time since last activity in days
 */
export function getDaysSinceLastActivity(issue: IssueDetails): number {
  const lastUpdate = issue.updatedAt
  const now = new Date()
  const diffMs = now.getTime() - lastUpdate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.ceil(diffDays)
}

/**
 * Get issue age in days
 */
export function getDaysSinceCreation(issue: IssueDetails): number {
  const created = issue.createdAt
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.ceil(diffDays)
}

/**
 * Calculate engagement score for an issue based on the engagement algorithm
 * @param issue - The issue details to score
 * @param weights - Custom weights for scoring components
 */
export function calculateScore(issue: IssueDetails, weights: ConfigFileEngagementWeights): number {
  // Components:
  // - Number of Comments       => Indicates discussion and interest
  // - Number of Reactions      => Shows emotional engagement
  // - Number of Contributors   => Reflects the diversity of input
  // - Time Since Last Activity => More recent activity indicates higher engagement
  // - Issue Age                => Older issues might need more attention
  // - Number of Linked PRs     => Shows active work on the issue (not implemented)

  const totalComments = (issue.comments || []).length
  const totalCommentReactions = (issue.comments || []).reduce(
    (sum, comment) => sum + (comment.reactions || []).length,
    0
  )
  const totalReactions = (issue.reactions || []).length + totalCommentReactions
  const contributors = getUniqueContributorsCount(issue)
  const lastActivity = Math.max(1, getDaysSinceLastActivity(issue))
  const issueAge = Math.max(1, getDaysSinceCreation(issue))
  const linkedPullRequests = 0 // Not implemented yet

  const score =
    weights.comments * totalComments +
    weights.reactions * totalReactions +
    weights.contributors * contributors +
    weights.lastActivity * (1 / lastActivity) +
    weights.issueAge * (1 / issueAge) +
    weights.linkedPullRequests * linkedPullRequests

  return Math.round(score)
}

/**
 * Calculate engagement score with role-based weights
 * @param issue - The issue details to score
 * @param weights - Role-based weights for scoring components
 * @param groups - User groups configuration
 * @param graphql - GraphQL SDK instance for role detection
 * @returns Promise<number> - The calculated score
 */
export async function calculateScoreWithRoles(
  issue: IssueDetails,
  weights: EngagementWeights,
  groups: UserGroups | undefined,
  graphql: GraphQLSdk
): Promise<number> {
  const repoInfo: RepoInfo = {
    owner: issue.owner,
    name: issue.repo
  }

  // Calculate role-based comment scores
  let commentScore = 0
  for (const comment of issue.comments || []) {
    const role = await detectUserRole(comment.user.login, repoInfo, groups, graphql)
    const weight = getWeightForRole(weights.comments, role)
    commentScore += weight
  }

  // Calculate role-based reaction scores
  let reactionScore = 0
  
  // Issue reactions
  for (const reaction of issue.reactions || []) {
    const role = await detectUserRole(reaction.user.login, repoInfo, groups, graphql)
    const weight = getWeightForRole(weights.reactions, role)
    reactionScore += weight
  }

  // Comment reactions
  for (const comment of issue.comments || []) {
    for (const reaction of comment.reactions || []) {
      const role = await detectUserRole(reaction.user.login, repoInfo, groups, graphql)
      const weight = getWeightForRole(weights.reactions, role)
      reactionScore += weight
    }
  }

  // Calculate role-based contributor scores
  const uniqueContributors = new Set<string>()
  
  // Add issue author
  uniqueContributors.add(issue.user.login)
  
  // Add assignees
  issue.assignees.forEach((assignee) => uniqueContributors.add(assignee.login))
  
  // Add comment authors
  issue.comments?.forEach((comment) => uniqueContributors.add(comment.user.login))

  let contributorScore = 0
  for (const contributor of uniqueContributors) {
    const role = await detectUserRole(contributor, repoInfo, groups, graphql)
    const weight = getWeightForRole(weights.contributors, role)
    contributorScore += weight
  }

  // Calculate time-based factors (no role weighting needed)
  const lastActivity = Math.max(1, getDaysSinceLastActivity(issue))
  const issueAge = Math.max(1, getDaysSinceCreation(issue))
  const linkedPullRequests = 0 // Not implemented yet

  const score =
    commentScore +
    reactionScore +
    contributorScore +
    weights.lastActivity * (1 / lastActivity) +
    weights.issueAge * (1 / issueAge) +
    weights.linkedPullRequests * linkedPullRequests

  return Math.round(score)
}

/**
 * Calculate previous score (7 days ago) based on historical issue details
 * @param issue - The issue details to score
 * @param weights - Custom weights for scoring components
 */
export async function calculateHistoricalScore(
  issue: IssueDetails,
  weights: ConfigFileEngagementWeights
): Promise<number> {
  const historicIssue = getHistoricalIssueDetails(issue)
  return calculateScore(historicIssue, weights)
}

/**
 * Calculate historical score with role-based weights
 * @param issue - The issue details to score
 * @param weights - Role-based weights for scoring components
 * @param groups - User groups configuration
 * @param graphql - GraphQL SDK instance for role detection
 * @returns Promise<number> - The calculated historical score
 */
export async function calculateHistoricalScoreWithRoles(
  issue: IssueDetails,
  weights: EngagementWeights,
  groups: UserGroups | undefined,
  graphql: GraphQLSdk
): Promise<number> {
  const historicIssue = getHistoricalIssueDetails(issue)
  return calculateScoreWithRoles(historicIssue, weights, groups, graphql)
}
