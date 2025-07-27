/**
 * Real configuration test data fixtures
 * These represent realistic configuration scenarios for the triage assistant
 */

import { TriageConfig, GitHubIssueConfig, InferenceConfig, SelectLabelsPromptConfig, PromptGenerationConfig } from '../src/triage-config.js'

/**
 * Base configuration that can be extended for different test scenarios
 */
export const baseConfig: TriageConfig & GitHubIssueConfig & InferenceConfig & PromptGenerationConfig = {
  dryRun: false,
  token: 'ghp_test1234567890abcdef1234567890abcdef12',
  tempDir: '/tmp/triage-test',
  issueNumber: 1234,
  repoOwner: 'example',
  repoName: 'awesome-project',
  aiEndpoint: 'https://models.inference.ai.azure.com',
  aiModel: 'gpt-4',
  aiToken: 'test-ai-token-1234567890abcdef'
}

/**
 * Configuration for single-label triage template
 */
export const singleLabelConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...baseConfig,
  repository: 'example/awesome-project',
  template: 'single-label',
  labelPrefix: 'type/',
  label: 'bug'
}

/**
 * Configuration for multi-label triage template
 */
export const multiLabelConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...baseConfig,
  repository: 'example/awesome-project',
  template: 'multi-label',
  labelPrefix: '',
  label: ''
}

/**
 * Configuration for regression detection template
 */
export const regressionConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...baseConfig,
  repository: 'example/awesome-project',
  template: 'regression',
  labelPrefix: 'type/',
  label: 'bug'
}

/**
 * Configuration for missing information template
 */
export const missingInfoConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...baseConfig,
  repository: 'example/awesome-project',
  template: 'missing-info',
  labelPrefix: 'needs-',
  label: 'more-info'
}

/**
 * Dry run configuration for testing without side effects
 */
export const dryRunConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  dryRun: true
}

/**
 * Configuration for different repository scenarios
 */
export const publicRepoConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig & GitHubIssueConfig = {
  ...singleLabelConfig,
  repository: 'microsoft/vscode',
  repoOwner: 'microsoft',
  repoName: 'vscode',
  issueNumber: 12345
}

export const privateRepoConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig & GitHubIssueConfig = {
  ...singleLabelConfig,
  repository: 'company/internal-project',
  repoOwner: 'company',
  repoName: 'internal-project',
  issueNumber: 567
}

/**
 * Configuration with different AI models
 */
export const gpt35Config: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  aiModel: 'gpt-3.5-turbo'
}

export const claudeConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  aiModel: 'claude-3-sonnet',
  aiEndpoint: 'https://api.anthropic.com'
}

/**
 * Configuration for different label prefix scenarios
 */
export const typeLabelConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  labelPrefix: 'type/',
  label: 'enhancement'
}

export const priorityLabelConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  labelPrefix: 'priority/',
  label: 'high'
}

export const areaLabelConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  labelPrefix: 'area/',
  label: 'ui'
}

export const noLabelPrefixConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  labelPrefix: '',
  label: 'bug'
}

/**
 * Configuration for different temporary directory scenarios
 */
export const customTempDirConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  tempDir: '/custom/temp/directory'
}

export const windowsTempDirConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
  ...singleLabelConfig,
  tempDir: 'C:\\temp\\triage-assistant'
}

/**
 * Configuration for high-volume scenarios
 */
export const highVolumeConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig & GitHubIssueConfig = {
  ...singleLabelConfig,
  issueNumber: 999999,
  repository: 'facebook/react',
  repoOwner: 'facebook',
  repoName: 'react'
}

/**
 * Configuration for edge case scenarios
 */
export const edgeCaseConfigs = {
  emptyRepository: {
    ...singleLabelConfig,
    repository: '',
    repoOwner: '',
    repoName: ''
  },
  
  zeroIssueNumber: {
    ...singleLabelConfig,
    issueNumber: 0
  },
  
  negativeIssueNumber: {
    ...singleLabelConfig,
    issueNumber: -1
  },
  
  specialCharacters: {
    ...singleLabelConfig,
    repository: 'user/repo-with-special_chars.123',
    repoOwner: 'user',
    repoName: 'repo-with-special_chars.123'
  },
  
  longRepoName: {
    ...singleLabelConfig,
    repository: 'organization/this-is-a-very-long-repository-name-that-exceeds-normal-limits',
    repoOwner: 'organization',
    repoName: 'this-is-a-very-long-repository-name-that-exceeds-normal-limits'
  }
}

/**
 * Apply configuration for testing the apply phase
 */
export const applyConfig = {
  ...baseConfig,
  applyLabels: true,
  applyComment: true,
  commentFooter: '<!-- Generated by AI Triage Assistant -->'
}

export const applyLabelsOnlyConfig = {
  ...applyConfig,
  applyComment: false
}

export const applyCommentsOnlyConfig = {
  ...applyConfig,
  applyLabels: false
}

export const applyNothingConfig = {
  ...applyConfig,
  applyLabels: false,
  applyComment: false
}

/**
 * Configuration factory functions for dynamic test creation
 */
export function createConfigForIssue(issueNumber: number, template: string = 'single-label'): SelectLabelsPromptConfig & InferenceConfig & TriageConfig {
  return {
    ...baseConfig,
    repository: 'example/awesome-project',
    issueNumber,
    template,
    labelPrefix: 'type/',
    label: 'bug'
  }
}

export function createConfigForRepo(owner: string, name: string): SelectLabelsPromptConfig & InferenceConfig & TriageConfig & GitHubIssueConfig {
  return {
    ...singleLabelConfig,
    repository: `${owner}/${name}`,
    repoOwner: owner,
    repoName: name
  }
}

export function createConfigWithPrefix(prefix: string): SelectLabelsPromptConfig & InferenceConfig & TriageConfig {
  return {
    ...singleLabelConfig,
    labelPrefix: prefix,
    label: prefix ? 'bug' : 'bug'
  }
}

/**
 * All template configurations for testing different triage strategies
 */
export const allTemplateConfigs = [
  singleLabelConfig,
  multiLabelConfig,
  regressionConfig,
  missingInfoConfig
]

/**
 * Environment-specific configurations
 */
export const environmentConfigs = {
  development: {
    ...singleLabelConfig,
    dryRun: true,
    tempDir: '/tmp/dev-triage'
  },
  
  testing: {
    ...singleLabelConfig,
    tempDir: '/tmp/test-triage',
    aiEndpoint: 'https://test-models.example.com'
  },
  
  staging: {
    ...singleLabelConfig,
    tempDir: '/var/staging/triage',
    aiEndpoint: 'https://staging-models.example.com'
  },
  
  production: {
    ...singleLabelConfig,
    tempDir: '/var/triage',
    aiEndpoint: 'https://models.inference.ai.azure.com'
  }
}