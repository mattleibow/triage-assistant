namespace TriageAssistant.Core.Models;

/// <summary>
/// Represents an issue engagement score
/// </summary>
public record EngagementScore
{
    public double Score { get; init; }
    public double PreviousScore { get; init; }
    public EngagementClassification? Classification { get; init; }
}

/// <summary>
/// Classification levels for engagement
/// </summary>
public enum EngagementClassification
{
    Hot
}

/// <summary>
/// Represents an issue with engagement scoring data
/// </summary>
public record EngagementItem
{
    public string? Id { get; init; }
    public required IssueDetails Issue { get; init; }
    public required EngagementScore Engagement { get; init; }
}

/// <summary>
/// Response object for engagement scoring operations
/// </summary>
public record EngagementResponse
{
    public ProjectDetails? Project { get; init; }
    public required IList<EngagementItem> Items { get; init; }
    public int TotalItems { get; init; }
}

/// <summary>
/// Detailed information about a GitHub issue
/// </summary>
public record IssueDetails
{
    public required string Id { get; init; }
    public required int Number { get; init; }
    public required string Title { get; init; }
    public required string Body { get; init; }
    public required string Url { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required string State { get; init; }
    public required UserDetails Author { get; init; }
    public required IList<CommentDetails> Comments { get; init; }
    public required IList<ReactionDetails> Reactions { get; init; }
    public required IList<string> Labels { get; init; }
    public required IList<PullRequestDetails> LinkedPullRequests { get; init; }
}

/// <summary>
/// GitHub user details
/// </summary>
public record UserDetails
{
    public required string Id { get; init; }
    public required string Login { get; init; }
    public required string Url { get; init; }
}

/// <summary>
/// GitHub issue comment details
/// </summary>
public record CommentDetails
{
    public required string Id { get; init; }
    public required string Body { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required UserDetails Author { get; init; }
    public required IList<ReactionDetails> Reactions { get; init; }
}

/// <summary>
/// GitHub reaction details
/// </summary>
public record ReactionDetails
{
    public required string Content { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required UserDetails User { get; init; }
}

/// <summary>
/// GitHub pull request details
/// </summary>
public record PullRequestDetails
{
    public required string Id { get; init; }
    public required int Number { get; init; }
    public required string Title { get; init; }
    public required string Url { get; init; }
    public required string State { get; init; }
}

/// <summary>
/// GitHub project details
/// </summary>
public record ProjectDetails
{
    public required string Id { get; init; }
    public required int Number { get; init; }
    public required string Title { get; init; }
    public required string Url { get; init; }
}