namespace TriageAssistant.Core.Configuration;

/// <summary>
/// Global configuration that extends all other configuration types
/// </summary>
public class EverythingConfig : LabelTriageWorkflowConfig
{
    public int? ProjectNumber { get; set; }
    public string ProjectColumn { get; set; } = string.Empty;
    public bool ApplyScores { get; set; }
}

/// <summary>
/// Base configuration for triage operations
/// </summary>
public class TriageConfig
{
    public bool DryRun { get; set; }
    public string TempDir { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for engagement scoring
/// </summary>
public class EngagementConfig
{
    public string Token { get; set; } = string.Empty;
    public string RepoOwner { get; set; } = string.Empty;
    public string RepoName { get; set; } = string.Empty;
    public int? ProjectNumber { get; set; }
    public string ProjectColumn { get; set; } = string.Empty;
    public bool ApplyScores { get; set; }
}

/// <summary>
/// Configuration for AI inference operations
/// </summary>
public class InferenceConfig
{
    public string AiEndpoint { get; set; } = string.Empty;
    public string AiModel { get; set; } = string.Empty;
    public string AiToken { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for prompt generation
/// </summary>
public class PromptGenerationConfig
{
    public string Token { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for select labels prompt
/// </summary>
public class SelectLabelsPromptConfig : PromptGenerationConfig
{
    public int IssueNumber { get; set; }
    public string Repository { get; set; } = string.Empty;
    public string? Label { get; set; }
    public string? LabelPrefix { get; set; }
    public string AiEndpoint { get; set; } = string.Empty;
    public string AiModel { get; set; } = string.Empty;
    public string AiToken { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for summary prompt
/// </summary>
public class SummaryPromptConfig : PromptGenerationConfig
{
    public string Repository { get; set; } = string.Empty;
    public int IssueNumber { get; set; }
}

/// <summary>
/// Base configuration for GitHub issue operations
/// </summary>
public class GitHubIssueConfig
{
    public string RepoOwner { get; set; } = string.Empty;
    public string RepoName { get; set; } = string.Empty;
    public int IssueNumber { get; set; }
}

/// <summary>
/// Configuration for applying reactions
/// </summary>
public class ApplyReactionsConfig : GitHubIssueConfig
{
    public string Token { get; set; } = string.Empty;
    public bool DryRun { get; set; }
    public string TempDir { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for applying labels
/// </summary>
public class ApplyLabelsConfig : GitHubIssueConfig
{
    public string Token { get; set; } = string.Empty;
    public bool ApplyLabels { get; set; }
    public bool DryRun { get; set; }
    public string TempDir { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for applying summary comments
/// </summary>
public class ApplySummaryCommentConfig : GitHubIssueConfig
{
    public string Token { get; set; } = string.Empty;
    public bool ApplyComment { get; set; }
    public string? CommentFooter { get; set; }
    public string Repository { get; set; } = string.Empty;
    public string AiEndpoint { get; set; } = string.Empty;
    public string AiModel { get; set; } = string.Empty;
    public string AiToken { get; set; } = string.Empty;
    public bool DryRun { get; set; }
    public string TempDir { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for single issue triage
/// </summary>
public class SingleLabelTriageWorkflowConfig : LabelTriageWorkflowConfig
{
    public new int IssueNumber { get; set; }
}

/// <summary>
/// Configuration for bulk issue triage
/// </summary>
public class BulkLabelTriageWorkflowConfig : LabelTriageWorkflowConfig
{
    public new string IssueQuery { get; set; } = string.Empty;
}

/// <summary>
/// Configuration for label triage workflow
/// </summary>
public class LabelTriageWorkflowConfig : TriageConfig
{
    public string Token { get; set; } = string.Empty;
    public string RepoOwner { get; set; } = string.Empty;
    public string RepoName { get; set; } = string.Empty;
    public string Repository { get; set; } = string.Empty;
    public int? IssueNumber { get; set; }
    public string? IssueQuery { get; set; }
    public string AiEndpoint { get; set; } = string.Empty;
    public string AiModel { get; set; } = string.Empty;
    public string AiToken { get; set; } = string.Empty;
    public bool ApplyLabels { get; set; }
    public bool ApplyComment { get; set; }
    public string? CommentFooter { get; set; }
}

/// <summary>
/// Configuration for engagement workflow
/// </summary>
public class EngagementWorkflowConfig : TriageConfig
{
    public string Token { get; set; } = string.Empty;
    public string RepoOwner { get; set; } = string.Empty;
    public string RepoName { get; set; } = string.Empty;
    public int? IssueNumber { get; set; }
    public int? ProjectNumber { get; set; }
    public string ProjectColumn { get; set; } = string.Empty;
    public bool ApplyScores { get; set; }
}