using System.Collections.Generic;
using TriageAssistant.Core.Models.GitHub;

namespace TriageAssistant.Core.Models.Engagement;

/// <summary>
/// Response for engagement scoring operations
/// </summary>
public class EngagementResponse
{
    public Project? Project { get; set; }
    public List<EngagementItem> Items { get; set; } = new();
    public int TotalItems { get; set; }
}

/// <summary>
/// An engagement item containing issue and scoring information
/// </summary>
public class EngagementItem
{
    public string? Id { get; set; }
    public required Issue Issue { get; set; }
    public required EngagementScore Engagement { get; set; }
}

/// <summary>
/// Engagement scoring information for an issue
/// </summary>
public class EngagementScore
{
    public required double Score { get; set; }
    public required double PreviousScore { get; set; }
    public EngagementClassification? Classification { get; set; }
}

/// <summary>
/// Classification levels for engagement scoring
/// </summary>
public enum EngagementClassification
{
    Hot
}

/// <summary>
/// Scoring factors used in engagement calculation
/// </summary>
public class ScoringFactors
{
    public int Comments { get; set; }
    public int Reactions { get; set; }
    public int Contributors { get; set; }
    public double TimeFactors { get; set; }
    public int PullRequests { get; set; }
}

/// <summary>
/// Result of engagement scoring analysis
/// </summary>
public class EngagementResult
{
    public required IssueDetails Issue { get; set; }
    public required double Score { get; set; }
    public required double PreviousScore { get; set; }
    public required ScoringFactors Factors { get; set; }
    public EngagementClassification? Classification { get; set; }
    
    /// <summary>
    /// Whether this issue is trending "hot" (increasing engagement)
    /// </summary>
    public bool IsHot => Score > PreviousScore && Classification == EngagementClassification.Hot;
}