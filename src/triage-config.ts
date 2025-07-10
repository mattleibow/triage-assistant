export interface GitHubConfig {
  issueNumber: number
  repository: string
  repoName: string
  repoOwner: string
}

export interface ReactionsConfig extends GitHubConfig {
  token: string
}

export interface PromptConfig {
  token: string
}

export interface InferenceConfig {
  aiEndpoint: string
  aiModel: string
  token: string
}

export interface AIConfig extends PromptConfig, InferenceConfig {
  tempDir: string
}

export interface SelectLabelsPromptConfig extends AIConfig, GitHubConfig {
  template: string
  label: string
  labelPrefix: string
}

export interface SummaryPromptConfig extends AIConfig, GitHubConfig {
  // no properties here, but may be later
}

export interface ApplyConfig extends SummaryPromptConfig, GitHubConfig {
  applyComment: boolean
  applyLabels: boolean
  commentFooter: string
}

export interface TriageConfig extends SelectLabelsPromptConfig, SummaryPromptConfig, ApplyConfig {
  // no properties here, but may be later
}
