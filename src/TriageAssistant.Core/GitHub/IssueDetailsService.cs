using TriageAssistant.Core.Models;
using TriageAssistant.Core.Configuration;

namespace TriageAssistant.Core.GitHub;

/// <summary>
/// Service for calculating engagement metrics and scores for issues
/// </summary>
public interface IIssueDetailsService
{
    /// <summary>
    /// Get historic issue details by filtering activity to 7 days ago
    /// </summary>
    /// <param name="issue">The issue to filter</param>
    /// <returns>Historic version of the issue</returns>
    IssueDetails GetHistoricalIssueDetails(IssueDetails issue);

    /// <summary>
    /// Get unique contributors count for an issue
    /// </summary>
    /// <param name="issue">The issue to analyze</param>
    /// <returns>Number of unique contributors</returns>
    int GetUniqueContributorsCount(IssueDetails issue);

    /// <summary>
    /// Get time since last activity in days
    /// </summary>
    /// <param name="issue">The issue to analyze</param>
    /// <returns>Days since last activity</returns>
    int GetDaysSinceLastActivity(IssueDetails issue);

    /// <summary>
    /// Get issue age in days
    /// </summary>
    /// <param name="issue">The issue to analyze</param>
    /// <returns>Days since issue creation</returns>
    int GetDaysSinceCreation(IssueDetails issue);

    /// <summary>
    /// Calculate engagement score for an issue
    /// </summary>
    /// <param name="issue">The issue to score</param>
    /// <param name="weights">Custom weights for scoring components</param>
    /// <returns>Calculated engagement score</returns>
    int CalculateScore(IssueDetails issue, EngagementWeights weights);

    /// <summary>
    /// Calculate historical score (7 days ago) based on historical issue details
    /// </summary>
    /// <param name="issue">The issue to score</param>
    /// <param name="weights">Custom weights for scoring components</param>
    /// <returns>Historical engagement score</returns>
    int CalculateHistoricalScore(IssueDetails issue, EngagementWeights weights);
}

/// <summary>
/// Implementation of issue details service
/// </summary>
public class IssueDetailsService : IIssueDetailsService
{
    /// <inheritdoc/>
    public IssueDetails GetHistoricalIssueDetails(IssueDetails issue)
    {
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        // If the issue is newer than 7 days, return it as-is with empty collections
        if (issue.CreatedAt > sevenDaysAgo)
        {
            return new IssueDetails
            {
                Id = issue.Id,
                Owner = issue.Owner,
                Repo = issue.Repo,
                Number = issue.Number,
                Title = issue.Title,
                Body = issue.Body,
                State = issue.State,
                CreatedAt = issue.CreatedAt,
                UpdatedAt = issue.UpdatedAt,
                ClosedAt = issue.ClosedAt,
                User = issue.User,
                Assignees = issue.Assignees,
                Comments = new List<CommentData>(),
                Reactions = new List<ReactionData>()
            };
        }

        // Filter reactions to only include those created before 7 days ago
        var historicReactions = issue.Reactions
            .Where(reaction => reaction.CreatedAt <= sevenDaysAgo)
            .ToList();

        // Create historic snapshot by filtering comments and reactions to 7 days ago
        var historicComments = issue.Comments
            .Where(comment => comment.CreatedAt <= sevenDaysAgo)
            .Select(comment => new CommentData
            {
                User = comment.User,
                CreatedAt = comment.CreatedAt,
                Reactions = comment.Reactions
                    .Where(reaction => reaction.CreatedAt <= sevenDaysAgo)
                    .ToList()
            })
            .ToList();

        return new IssueDetails
        {
            Id = issue.Id,
            Owner = issue.Owner,
            Repo = issue.Repo,
            Number = issue.Number,
            Title = issue.Title,
            Body = issue.Body,
            State = issue.State,
            CreatedAt = issue.CreatedAt,
            UpdatedAt = sevenDaysAgo,
            ClosedAt = issue.ClosedAt,
            User = issue.User,
            Assignees = issue.Assignees,
            Comments = historicComments,
            Reactions = historicReactions
        };
    }

    /// <inheritdoc/>
    public int GetUniqueContributorsCount(IssueDetails issue)
    {
        var contributors = new HashSet<string>();

        // Add issue author
        contributors.Add(issue.User.Login);

        // Add assignees
        foreach (var assignee in issue.Assignees)
        {
            contributors.Add(assignee.Login);
        }

        // Add comment authors
        foreach (var comment in issue.Comments)
        {
            contributors.Add(comment.User.Login);
        }

        return contributors.Count;
    }

    /// <inheritdoc/>
    public int GetDaysSinceLastActivity(IssueDetails issue)
    {
        var now = DateTime.UtcNow;
        var diffMs = now - issue.UpdatedAt;
        return Math.Max(1, (int)Math.Ceiling(diffMs.TotalDays));
    }

    /// <inheritdoc/>
    public int GetDaysSinceCreation(IssueDetails issue)
    {
        var now = DateTime.UtcNow;
        var diffMs = now - issue.CreatedAt;
        return Math.Max(1, (int)Math.Ceiling(diffMs.TotalDays));
    }

    /// <inheritdoc/>
    public int CalculateScore(IssueDetails issue, EngagementWeights weights)
    {
        // Components:
        // - Number of Comments       => Indicates discussion and interest
        // - Number of Reactions      => Shows emotional engagement
        // - Number of Contributors   => Reflects the diversity of input
        // - Time Since Last Activity => More recent activity indicates higher engagement
        // - Issue Age                => Older issues might need more attention
        // - Number of Linked PRs     => Shows active work on the issue (not implemented)

        var totalComments = issue.Comments.Count;
        var totalCommentReactions = issue.Comments.Sum(comment => comment.Reactions.Count);
        var totalReactions = issue.Reactions.Count + totalCommentReactions;
        var contributors = GetUniqueContributorsCount(issue);
        var lastActivity = GetDaysSinceLastActivity(issue);
        var issueAge = GetDaysSinceCreation(issue);
        var linkedPullRequests = 0; // Not implemented yet

        var score = 
            weights.Comments * totalComments +
            weights.Reactions * totalReactions +
            weights.Contributors * contributors +
            weights.LastActivity * (1.0 / lastActivity) +
            weights.IssueAge * (1.0 / issueAge) +
            weights.LinkedPullRequests * linkedPullRequests;

        return (int)Math.Round(score);
    }

    /// <inheritdoc/>
    public int CalculateHistoricalScore(IssueDetails issue, EngagementWeights weights)
    {
        var historicIssue = GetHistoricalIssueDetails(issue);
        return CalculateScore(historicIssue, weights);
    }
}

/// <summary>
/// Weights for engagement scoring components
/// </summary>
public class EngagementWeights
{
    public double Comments { get; set; } = 3;
    public double Reactions { get; set; } = 1;
    public double Contributors { get; set; } = 4;
    public double LastActivity { get; set; } = 1;
    public double IssueAge { get; set; } = 1;
    public double LinkedPullRequests { get; set; } = 2;
}