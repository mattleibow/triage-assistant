export interface EngagementScore {
  score: number
  previousScore: number
  classification: 'Hot' | null
}

export interface EngagementItem {
  issueNumber: number
  engagement: EngagementScore
}

export interface EngagementResponse {
  items: EngagementItem[]
  totalItems: number
}

export interface IssueDetails {
  id: number
  number: number
  title: string
  body: string
  state: string
  created_at: string
  updated_at: string
  closed_at: string | null
  comments: number
  reactions: {
    total_count: number
  }
  comments_data?: CommentData[]
  user: {
    login: string
  }
  assignees: Array<{
    login: string
  }>
}

export interface CommentData {
  id: number
  user: {
    login: string
  }
  created_at: string
  reactions: {
    total_count: number
  }
}
