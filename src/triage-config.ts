// global configs

export interface EverythingConfig
  extends TriageConfig,
    InferenceConfig,
    PromptGenerationConfig,
    SelectLabelsPromptConfig,
    SummaryPromptConfig,
    GitHubIssueConfig,
    ApplyReactionsConfig,
    ApplyLabelsConfig,
    ApplySummaryCommentConfig {}

export interface TriageConfig {
  dryRun: boolean
  tempDir: string
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
  template: string
  label: string
  labelPrefix: string
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
