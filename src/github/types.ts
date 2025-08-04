export interface Project {
  id: string
  owner: string
  number: number
}

export interface ProjectDetails extends Project {
  items: ProjectItem[]
}

export interface ProjectItem {
  id: string
  projectId: string
  type?: string
  content: Issue
}

export interface Issue {
  id: string
  owner: string
  repo: string
  number: number
}

export interface IssueDetails extends Issue {
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
