namespace TriageAssistant.Action.Models;

/// <summary>
/// Represents the operation mode for the triage assistant
/// </summary>
public enum TriageMode
{
    ApplyLabels,
    EngagementScore
}

/// <summary>
/// Contains all GitHub Action inputs parsed from command line and environment variables
/// </summary>
public class ActionInputs
{
    // Mode selection
    public TriageMode Mode { get; set; } = TriageMode.ApplyLabels;
    
    // GitHub token inputs
    public string Token { get; set; } = string.Empty;
    public string FallbackToken { get; set; } = string.Empty;
    
    // AI model and endpoint inputs
    public string AiEndpoint { get; set; } = string.Empty;
    public string AiModel { get; set; } = string.Empty;
    public string AiToken { get; set; } = string.Empty;
    
    // Issue processing inputs
    public int? Issue { get; set; }
    public string IssueQuery { get; set; } = string.Empty;
    
    // Engagement scoring inputs
    public int? Project { get; set; }
    public string ProjectColumn { get; set; } = "Engagement Score";
    public bool ApplyScores { get; set; } = false;
    
    // Label and comment posting inputs
    public bool ApplyLabels { get; set; } = false;
    public bool ApplyComment { get; set; } = false;
    public string CommentFooter { get; set; } = string.Empty;
    public bool DryRun { get; set; } = false;
    
    // Repository context (from environment)
    public string RepoOwner { get; set; } = string.Empty;
    public string RepoName { get; set; } = string.Empty;
    public string Repository { get; set; } = string.Empty;
    public string TempDir { get; set; } = string.Empty;
    
    /// <summary>
    /// Gets the effective GitHub token (primary or fallback)
    /// </summary>
    public string EffectiveToken => !string.IsNullOrEmpty(Token) ? Token : FallbackToken;
    
    /// <summary>
    /// Gets the effective AI token (AI-specific or GitHub token)
    /// </summary>
    public string EffectiveAiToken => !string.IsNullOrEmpty(AiToken) ? AiToken : EffectiveToken;
}

/// <summary>
/// Contains output information from the action execution
/// </summary>
public class ActionOutputs
{
    public string ResponseFile { get; set; } = string.Empty;
}