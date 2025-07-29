export interface IssueDetails {
  id: string
  owner: string
  repo: string
  number: number
  title: string
  body: string
  state: string
  createdAt: Date
  updatedAt: Date
  closedAt: Date | null
  reactions: ReactionData[]
  comments: CommentData[]
  user: UserInfo
  assignees: UserInfo[]
}

export interface CommentData {
  user: UserInfo
  createdAt: Date
  reactions: ReactionData[]
}

export interface ReactionData {
  user: UserInfo
  reaction: string
  createdAt: Date
}

export interface UserInfo {
  login: string
  type: string
}

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
 */
export function calculateScore(issue: IssueDetails): number {
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

  // Weights
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
 * Calculate previous score (7 days ago) based on historical issue details
 */
export async function calculateHistoricalScore(issue: IssueDetails): Promise<number> {
  const historicIssue = getHistoricalIssueDetails(issue)
  return calculateScore(historicIssue)
}
