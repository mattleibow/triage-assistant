export interface IssueDetails {
  id: string
  number: number
  title: string
  body: string
  state: string
  created_at: string
  updated_at: string
  closed_at: string | null
  comments: number
  reactions: ReactionsInfo
  comments_data: CommentData[]
  user: UserInfo
  assignees: UserInfo[]
}

export interface CommentData {
  id: number
  user: UserInfo
  created_at: string
  reactions: ReactionsInfo
}

export interface ReactionsInfo {
  total_count: number
  '+1': number
  '-1': number
  laugh: number
  hooray: number
  confused: number
  heart: number
  rocket: number
  eyes: number
}

export interface UserInfo {
  login: string
  id: number
  type: string
}

/**
 * Get historic issue details by filtering activity to 7 days ago
 */
export function getHistoricalIssueDetails(issue: IssueDetails): IssueDetails {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // If the issue is newer than 7 days, return it as-is
  if (new Date(issue.created_at) > sevenDaysAgo) {
    return {
      ...issue,
      comments: 0,
      comments_data: [],
      reactions: {
        ...issue.reactions,
        total_count: 0
      }
    }
  }

  // Create historic snapshot by filtering comments and reactions to 7 days ago
  const historicComments =
    issue.comments_data
      ?.filter((comment) => {
        const commentDate = new Date(comment.created_at)
        return commentDate <= sevenDaysAgo
      })
      .map((comment) => ({
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

  return historicIssue
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
