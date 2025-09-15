using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models.Triage;
using TriageAssistant.Core.Services.Triage;

namespace TriageAssistant.Core.Services.Workflows;

/// <summary>
/// Service for orchestrating complete triage workflows
/// </summary>
public interface ITriageWorkflowService
{
    /// <summary>
    /// Runs the complete triage workflow for a single issue
    /// </summary>
    /// <param name="config">Workflow configuration</param>
    /// <param name="labelsConfig">Labels configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Path to the response file</returns>
    Task<string> RunSingleIssueTriageWorkflowAsync(SingleIssueTriageConfig config, LabelsConfiguration labelsConfig, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Runs the triage workflow for multiple issues from a search query
    /// </summary>
    /// <param name="config">Workflow configuration</param>
    /// <param name="labelsConfig">Labels configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Path to the response file</returns>
    Task<string> RunBulkTriageWorkflowAsync(BulkIssueTriageConfig config, LabelsConfiguration labelsConfig, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Merges response files and applies labels and comments to an issue
    /// </summary>
    /// <param name="config">Apply configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Path to the merged response file</returns>
    Task<string> MergeAndApplyTriageAsync(ApplyTriageConfig config, CancellationToken cancellationToken = default);
}

/// <summary>
/// Configuration for single issue triage workflow
/// </summary>
public class SingleIssueTriageConfig
{
    /// <summary>
    /// Repository owner and name (e.g., "owner/repo")
    /// </summary>
    public string Repository { get; set; } = string.Empty;
    
    /// <summary>
    /// Issue number to process
    /// </summary>
    public int IssueNumber { get; set; }
    
    /// <summary>
    /// GitHub token for API access
    /// </summary>
    public string Token { get; set; } = string.Empty;
    
    /// <summary>
    /// AI endpoint for inference
    /// </summary>
    public string AiEndpoint { get; set; } = string.Empty;
    
    /// <summary>
    /// AI model to use
    /// </summary>
    public string AiModel { get; set; } = string.Empty;
    
    /// <summary>
    /// AI token for inference
    /// </summary>
    public string AiToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Whether to apply labels to the issue
    /// </summary>
    public bool ApplyLabels { get; set; }
    
    /// <summary>
    /// Whether to apply comments to the issue
    /// </summary>
    public bool ApplyComment { get; set; }
    
    /// <summary>
    /// Comment footer text
    /// </summary>
    public string CommentFooter { get; set; } = string.Empty;
    
    /// <summary>
    /// Temporary directory for files
    /// </summary>
    public string TempDir { get; set; } = string.Empty;
    
    /// <summary>
    /// Whether to run in dry-run mode
    /// </summary>
    public bool DryRun { get; set; }
}

/// <summary>
/// Configuration for bulk issue triage workflow
/// </summary>
public class BulkIssueTriageConfig : SingleIssueTriageConfig
{
    /// <summary>
    /// GitHub search query for finding issues
    /// </summary>
    public string IssueQuery { get; set; } = string.Empty;
    
    /// <summary>
    /// Repository owner for scoping search
    /// </summary>
    public string RepoOwner { get; set; } = string.Empty;
    
    /// <summary>
    /// Repository name for scoping search
    /// </summary>
    public string RepoName { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for applying triage results
/// </summary>
public class ApplyTriageConfig
{
    /// <summary>
    /// Repository owner and name (e.g., "owner/repo")
    /// </summary>
    public string Repository { get; set; } = string.Empty;
    
    /// <summary>
    /// Issue number to apply results to
    /// </summary>
    public int IssueNumber { get; set; }
    
    /// <summary>
    /// GitHub token for API access
    /// </summary>
    public string Token { get; set; } = string.Empty;
    
    /// <summary>
    /// AI endpoint for inference
    /// </summary>
    public string AiEndpoint { get; set; } = string.Empty;
    
    /// <summary>
    /// AI model to use
    /// </summary>
    public string AiModel { get; set; } = string.Empty;
    
    /// <summary>
    /// AI token for inference
    /// </summary>
    public string AiToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Whether to apply labels to the issue
    /// </summary>
    public bool ApplyLabels { get; set; }
    
    /// <summary>
    /// Whether to apply comments to the issue
    /// </summary>
    public bool ApplyComment { get; set; }
    
    /// <summary>
    /// Comment footer text
    /// </summary>
    public string CommentFooter { get; set; } = string.Empty;
    
    /// <summary>
    /// Temporary directory for files
    /// </summary>
    public string TempDir { get; set; } = string.Empty;
    
    /// <summary>
    /// Whether to run in dry-run mode
    /// </summary>
    public bool DryRun { get; set; }
}