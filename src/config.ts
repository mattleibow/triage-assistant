// global configs

export interface EverythingConfig extends LabelTriageWorkflowConfig, EngagementWorkflowConfig {
  // Override to make issueNumber required for unified config
  issueNumber: number
}

export interface TriageConfig {
  dryRun: boolean
  tempDir: string
}

// engagement scoring configs

export interface EngagementConfig {
  token: string
  repoOwner: string
  repoName: string
  projectNumber?: number
  projectColumn: string
  applyScores: boolean
}

// ai inference configs

export interface InferenceConfig {
  aiEndpoint: string
  aiModel: string
  aiToken: string
}

// prompt generation configs

export interface PromptGenerationConfig {
  token: string
}

export interface SelectLabelsPromptConfig extends PromptGenerationConfig {
  issueNumber: number
  repository: string
  label?: string
  labelPrefix?: string
}

export interface SummaryPromptConfig extends PromptGenerationConfig {
  repository: string
  issueNumber: number
}

// GitHub interactions configs

export interface GitHubIssueConfig {
  repoOwner: string
  repoName: string
  issueNumber: number
}

export interface ApplyReactionsConfig extends GitHubIssueConfig {
  token: string
}

export interface ApplyLabelsConfig extends GitHubIssueConfig {
  token: string
  applyLabels: boolean
}

export interface ApplySummaryCommentConfig extends GitHubIssueConfig, SummaryPromptConfig, InferenceConfig {
  token: string
  applyComment: boolean
  commentFooter?: string
}

// Workflow configs

export interface LabelTriageWorkflowConfig {
  token: string
  repoOwner: string
  repoName: string
  repository: string
  issueNumber: number
  issueQuery?: string
  aiEndpoint: string
  aiModel: string
  aiToken: string
  applyLabels: boolean
  applyComment: boolean
  commentFooter?: string
  dryRun: boolean
  tempDir: string
}

export interface EngagementWorkflowConfig {
  token: string
  repoOwner: string
  repoName: string
  issueNumber?: number
  projectNumber?: number
  projectColumn: string
  applyScores: boolean
  tempDir: string
  dryRun: boolean
}
