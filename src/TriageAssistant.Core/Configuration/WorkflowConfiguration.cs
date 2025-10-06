namespace TriageAssistant.Core.Configuration;

/// <summary>
/// Base configuration for all workflows
/// </summary>
public record WorkflowConfiguration
{
    public required string Token { get; init; }
    public required string RepoOwner { get; init; }
    public required string RepoName { get; init; }
    public bool DryRun { get; init; }
    public required string TempDir { get; init; }
}

/// <summary>
/// Configuration for AI inference operations
/// </summary>
public record InferenceConfiguration
{
    public required string AiEndpoint { get; init; }
    public required string AiModel { get; init; }
    public required string AiToken { get; init; }
}

/// <summary>
/// Configuration for label triage workflows
/// </summary>
public record LabelTriageWorkflowConfiguration : WorkflowConfiguration
{
    public required string Repository { get; init; }
    public int? IssueNumber { get; init; }
    public string? IssueQuery { get; init; }
    public required string AiEndpoint { get; init; }
    public required string AiModel { get; init; }
    public required string AiToken { get; init; }
    public bool ApplyLabels { get; init; }
    public bool ApplyComment { get; init; }
    public string? CommentFooter { get; init; }
}

/// <summary>
/// Configuration for engagement scoring workflows
/// </summary>
public record EngagementWorkflowConfiguration : WorkflowConfiguration
{
    public int? IssueNumber { get; init; }
    public int? ProjectNumber { get; init; }
    public required string ProjectColumn { get; init; }
    public bool ApplyScores { get; init; }
}

/// <summary>
/// Configuration for single issue label triage
/// </summary>
public record SingleLabelTriageWorkflowConfiguration : LabelTriageWorkflowConfiguration
{
    public required new int IssueNumber { get; init; }
}

/// <summary>
/// Configuration for bulk label triage
/// </summary>
public record BulkLabelTriageWorkflowConfiguration : LabelTriageWorkflowConfiguration
{
    public required new string IssueQuery { get; init; }
}

/// <summary>
/// Unified configuration interface that combines all workflow configurations
/// </summary>
public record EverythingConfiguration : WorkflowConfiguration
{
    // Label triage properties
    public required string Repository { get; init; }
    public int? IssueNumber { get; init; }
    public string? IssueQuery { get; init; }
    public required string AiEndpoint { get; init; }
    public required string AiModel { get; init; }
    public required string AiToken { get; init; }
    public bool ApplyLabels { get; init; }
    public bool ApplyComment { get; init; }
    public string? CommentFooter { get; init; }
    
    // Engagement workflow properties
    public int? ProjectNumber { get; init; }
    public required string ProjectColumn { get; init; }
    public bool ApplyScores { get; init; }
}