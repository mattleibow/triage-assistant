namespace TriageAssistant.Core.Configuration;

/// <summary>
/// Configuration interface for engagement scoring weights
/// </summary>
public record EngagementWeights
{
    public double Comments { get; init; } = 3.0;
    public double Reactions { get; init; } = 1.0;
    public double Contributors { get; init; } = 2.0;
    public double LastActivity { get; init; } = 1.0;
    public double IssueAge { get; init; } = 1.0;
    public double LinkedPullRequests { get; init; } = 2.0;
}

/// <summary>
/// Configuration for engagement scoring
/// </summary>
public record EngagementConfiguration
{
    public EngagementWeights Weights { get; init; } = new();
}

/// <summary>
/// Configuration for a single label group
/// </summary>
public record LabelGroup
{
    /// <summary>Label prefix for searching (e.g., 'area-', 'platform-')</summary>
    public string? LabelPrefix { get; init; }
    
    /// <summary>Template to use for this label group</summary>
    public required string Template { get; init; }
    
    /// <summary>Specific label to use (for regression type)</summary>
    public string? Label { get; init; }
}

/// <summary>
/// Configuration for batch label processing
/// </summary>
public record LabelsConfiguration
{
    public Dictionary<string, LabelGroup> Groups { get; init; } = new();
}

/// <summary>
/// Root configuration interface for .triagerc.yml file
/// </summary>
public record TriageConfiguration
{
    public EngagementConfiguration Engagement { get; init; } = new();
    public LabelsConfiguration Labels { get; init; } = new();
}