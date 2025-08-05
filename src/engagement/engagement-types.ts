import { Issue, Project } from '../github/types.js'

export interface EngagementResponse {
  project?: Project
  items: EngagementItem[]
  totalItems: number
}

export interface EngagementItem {
  id?: string
  issue: Issue
  engagement: EngagementScore
}

export interface EngagementScore {
  score: number
  previousScore: number
  classification?: EngagementClassification
}

export enum EngagementClassification {
  Hot = 'Hot'
}
