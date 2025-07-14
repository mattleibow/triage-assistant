export interface EngagementScore {
  score: number
  previousScore: number
  classification: 'Hot' | null
}

export interface EngagementItem {
  id: string
  issue: {
    id: number
    owner: string
    repo: string
    number: number
  }
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
  user: {
    login: string
  }
  assignees: Array<{
    login: string
  }>
  comments: CommentData[]
  reactions: any[]
  commentReactions: any[]
}

export interface CommentData {
  id: number
  user: {
    login: string
  }
  created_at: string
  updated_at: string
}
