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
