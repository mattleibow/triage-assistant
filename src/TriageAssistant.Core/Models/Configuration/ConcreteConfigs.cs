namespace TriageAssistant.Core.Models.Configuration;

/// <summary>
/// Concrete implementation of the everything config that combines all configuration interfaces
/// </summary>
public class EverythingConfig : IEverythingConfig
{
    public required string Token { get; set; }
    public required string RepoOwner { get; set; }
    public required string RepoName { get; set; }
    public required string Repository { get; set; }
    public int? IssueNumber { get; set; }
    public string? IssueQuery { get; set; }
    public required string AiEndpoint { get; set; }
    public required string AiModel { get; set; }
    public required string AiToken { get; set; }
    public bool ApplyLabels { get; set; }
    public bool ApplyComment { get; set; }
    public string? CommentFooter { get; set; }
    public bool DryRun { get; set; }
    public required string TempDir { get; set; }
    
    // Engagement scoring properties
    public int? ProjectNumber { get; set; }
    public string ProjectColumn { get; set; } = "Engagement Score";
    public bool ApplyScores { get; set; }
}

/// <summary>
/// Configuration for single issue triage workflow
/// </summary>
public class SingleLabelTriageWorkflowConfig : ISingleLabelTriageWorkflowConfig
{
    public required string Token { get; set; }
    public required string RepoOwner { get; set; }
    public required string RepoName { get; set; }
    public required string Repository { get; set; }
    public required int IssueNumber { get; set; }
    public string? IssueQuery { get; set; }
    public required string AiEndpoint { get; set; }
    public required string AiModel { get; set; }
    public required string AiToken { get; set; }
    public bool ApplyLabels { get; set; }
    public bool ApplyComment { get; set; }
    public string? CommentFooter { get; set; }
    public bool DryRun { get; set; }
    public required string TempDir { get; set; }

    int? ILabelTriageWorkflowConfig.IssueNumber => IssueNumber;
}

/// <summary>
/// Configuration for bulk issue triage workflow
/// </summary>
public class BulkLabelTriageWorkflowConfig : IBulkLabelTriageWorkflowConfig
{
    public required string Token { get; set; }
    public required string RepoOwner { get; set; }
    public required string RepoName { get; set; }
    public required string Repository { get; set; }
    public int? IssueNumber { get; set; }
    public required string IssueQuery { get; set; }
    public required string AiEndpoint { get; set; }
    public required string AiModel { get; set; }
    public required string AiToken { get; set; }
    public bool ApplyLabels { get; set; }
    public bool ApplyComment { get; set; }
    public string? CommentFooter { get; set; }
    public bool DryRun { get; set; }
    public required string TempDir { get; set; }
}

/// <summary>
/// Configuration for applying labels to issues
/// </summary>
public class ApplyLabelsConfig : IApplyLabelsConfig
{
    public required string Token { get; set; }
    public required string RepoOwner { get; set; }
    public required string RepoName { get; set; }
    public required int IssueNumber { get; set; }
    public bool ApplyLabels { get; set; }
}

/// <summary>
/// Configuration for applying summary comments to issues
/// </summary>
public class ApplySummaryCommentConfig : IApplySummaryCommentConfig
{
    public required string Token { get; set; }
    public required string RepoOwner { get; set; }
    public required string RepoName { get; set; }
    public required int IssueNumber { get; set; }
    public required string Repository { get; set; }
    public bool ApplyComment { get; set; }
    public string? CommentFooter { get; set; }
    public required string AiEndpoint { get; set; }
    public required string AiModel { get; set; }
    public required string AiToken { get; set; }
}

/// <summary>
/// Configuration for applying reactions to issues
/// </summary>
public class ApplyReactionsConfig : IApplyReactionsConfig
{
    public required string Token { get; set; }
    public required string RepoOwner { get; set; }
    public required string RepoName { get; set; }
    public required int IssueNumber { get; set; }
}