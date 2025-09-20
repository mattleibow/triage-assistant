namespace TriageAssistant.Core.Models.Configuration;

/// <summary>
/// Global configuration that extends all specific configs
/// </summary>
public interface IEverythingConfig : ILabelTriageWorkflowConfig, IEngagementWorkflowConfig
{
}

/// <summary>
/// Base triage configuration
/// </summary>
public interface ITriageConfig
{
    bool DryRun { get; }
    string TempDir { get; }
}

/// <summary>
/// Configuration for engagement scoring
/// </summary>
public interface IEngagementConfig
{
    string Token { get; }
    string RepoOwner { get; }
    string RepoName { get; }
    int? ProjectNumber { get; }
    string ProjectColumn { get; }
    bool ApplyScores { get; }
}

/// <summary>
/// Configuration for engagement workflow
/// </summary>
public interface IEngagementWorkflowConfig : IEngagementConfig, ITriageConfig
{
    int? IssueNumber { get; }
}

/// <summary>
/// Configuration for AI inference
/// </summary>
public interface IInferenceConfig
{
    string AiEndpoint { get; }
    string AiModel { get; }
    string AiToken { get; }
}

/// <summary>
/// Configuration for prompt generation
/// </summary>
public interface IPromptGenerationConfig
{
    string Token { get; }
}

/// <summary>
/// Configuration for label selection prompts
/// </summary>
public interface ISelectLabelsPromptConfig : IPromptGenerationConfig
{
    int IssueNumber { get; }
    string Repository { get; }
    string? Label { get; }
    string? LabelPrefix { get; }
}

/// <summary>
/// Configuration for summary prompts
/// </summary>
public interface ISummaryPromptConfig : IPromptGenerationConfig
{
    string Repository { get; }
    int IssueNumber { get; }
}

/// <summary>
/// Configuration for GitHub issue operations
/// </summary>
public interface IGitHubIssueConfig
{
    string RepoOwner { get; }
    string RepoName { get; }
    int IssueNumber { get; }
}

/// <summary>
/// Configuration for applying reactions
/// </summary>
public interface IApplyReactionsConfig : IGitHubIssueConfig
{
    string Token { get; }
}

/// <summary>
/// Configuration for applying labels
/// </summary>
public interface IApplyLabelsConfig : IGitHubIssueConfig
{
    string Token { get; }
    bool ApplyLabels { get; }
}

/// <summary>
/// Configuration for applying summary comments
/// </summary>
public interface IApplySummaryCommentConfig : IGitHubIssueConfig, ISummaryPromptConfig, IInferenceConfig
{
    new string Token { get; }
    bool ApplyComment { get; }
    string? CommentFooter { get; }
}

/// <summary>
/// Configuration for single issue triage workflow
/// </summary>
public interface ISingleLabelTriageWorkflowConfig : ILabelTriageWorkflowConfig
{
    new int IssueNumber { get; }
}

/// <summary>
/// Configuration for bulk triage workflow
/// </summary>
public interface IBulkLabelTriageWorkflowConfig : ILabelTriageWorkflowConfig
{
    new string IssueQuery { get; }
}

/// <summary>
/// Configuration for label triage workflow
/// </summary>
public interface ILabelTriageWorkflowConfig
{
    string Token { get; }
    string RepoOwner { get; }
    string RepoName { get; }
    string Repository { get; }
    int? IssueNumber { get; }
    string? IssueQuery { get; }
    string AiEndpoint { get; }
    string AiModel { get; }
    string AiToken { get; }
    bool ApplyLabels { get; }
    bool ApplyComment { get; }
    string? CommentFooter { get; }
    bool DryRun { get; }
    string TempDir { get; }
}