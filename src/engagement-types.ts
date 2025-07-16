export interface EngagementResponse {
  items: EngagementItem[]
  totalItems: number
  project?: ProjectInfo
}

export interface EngagementItem {
  id?: string
  issueNumber: number
  engagement: EngagementScore
}

export interface EngagementScore {
  score: number
  previousScore: number
  classification: 'Hot' | null
}

export interface ProjectInfo {
  id: string
  owner: string
  number: number
}

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
