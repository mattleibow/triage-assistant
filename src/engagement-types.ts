export interface EngagementResponseIssue {
  id: number
  owner: string
  repo: string
  number: number
}

export interface EngagementResponseProject {
  id: string
  owner: string
  number: number
}

export enum EngagementResponseEngagementClassification {
  Hot = 'Hot'
}

export interface EngagementResponseEngagement {
  score: number
  previousScore: number
  classification: EngagementResponseEngagementClassification | null
}

export interface EngagementResponseItem {
  id: string | null
  issue: EngagementResponseIssue
  engagement: EngagementResponseEngagement
}

export interface EngagementResponse {
  items: EngagementResponseItem[]
  totalItems: number
  project?: EngagementResponseProject
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

export interface ProjectItem {
  id: string
  content: {
    id: number
    number: number
    title: string
    url: string
    body: string
    state: string
    created_at: string
    updated_at: string
    closed_at: string | null
    comments: number
    reactions: {
      total_count: number
    }
    user: {
      login: string
    }
    assignees: Array<{
      login: string
    }>
  }
}

export interface ProjectField {
  id: string
  name: string
  dataType: string
}

export interface ProjectDetails {
  id: string
  number: number
  title: string
  url: string
  owner: {
    login: string
  }
}