/**
 * Configuration object for the triage assistant action.
 */
export interface TriageConfig {
  /**
   * The endpoint URL for the AI service.
   */
  aiEndpoint: string

  /**
   * The AI model identifier to use for processing.
   */
  aiModel: string

  /**
   * Whether to apply comments to issues or pull requests.
   */
  applyComment: boolean

  /**
   * Whether to apply labels to issues or pull requests.
   */
  applyLabels: boolean

  /**
   * The footer text to append to comments.
   */
  commentFooter: string

  /**
   * The number of the issue to triage.
   */
  issueNumber: number

  /**
   * The name of the repository.
   */
  repoName: string

  /**
   * The owner of the repository.
   */
  repoOwner: string

  /**
   * The full repository identifier in the format "owner/name".
   */
  repository: string

  /**
   * The path to the temporary directory for intermediate files.
   */
  tempDir: string

  /**
   * The path or identifier for the template to use.
   */
  template: string

  /**
   * The authentication token for accessing the repository.
   */
  token: string

  /**
   * The specific label to work with.
   */
  label: string

  /**
   * The prefix for labels to filter or categorize them.
   */
  labelPrefix: string
}
