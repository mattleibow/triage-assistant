export interface EngagementResponse {
  items: EngagementItem[]
  totalItems: number
  project?: EngagementProjectInfo
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

export interface EngagementProjectInfo {
  id: string
  owner: string
  number: number
}

export interface EngagementConfig {
  repoOwner: string
  repoName: string
  token: string
  projectNumber?: number
  issueNumber?: number
  projectColumn: string
  applyScores: boolean
}
