export interface EngagementResponse {
  project?: EngagementProject
  items: EngagementItem[]
  totalItems: number
}

export interface EngagementProject {
  id: string
  owner: string
  number: number
}

export interface EngagementItem {
  id?: string
  issue: EngagementIssue
  engagement: EngagementScore
}

export interface EngagementIssue {
  id: string
  owner: string
  repo: string
  number: number
}

export interface EngagementScore {
  score: number
  previousScore: number
  classification?: EngagementClassification
}

export enum EngagementClassification {
  Hot = 'Hot'
}
