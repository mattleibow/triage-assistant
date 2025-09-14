using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using TriageAssistant.Core.Models.Configuration;
using TriageAssistant.Core.Models.Engagement;
using TriageAssistant.Core.Models.GitHub;

namespace TriageAssistant.Core.Services;

/// <summary>
/// Service for calculating engagement scores and analyzing trends
/// </summary>
public class EngagementScoringService
{
    private readonly ILogger<EngagementScoringService> _logger;

    public EngagementScoringService(ILogger<EngagementScoringService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Calculate engagement score for an issue based on the engagement algorithm
    /// </summary>
    /// <param name="issue">The issue details to score</param>
    /// <param name="weights">Custom weights for scoring components</param>
    /// <returns>Calculated engagement score</returns>
    public double CalculateScore(IssueDetails issue, ConfigFileEngagementWeights weights)
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
        var lastActivity = Math.Max(1, GetDaysSinceLastActivity(issue));
        var issueAge = Math.Max(1, GetDaysSinceCreation(issue));
        var linkedPullRequests = 0; // Not implemented yet

        var score = weights.Comments * totalComments +
                    weights.Reactions * totalReactions +
                    weights.Contributors * contributors +
                    weights.LastActivity * (1.0 / lastActivity) +
                    weights.IssueAge * (1.0 / issueAge) +
                    weights.LinkedPullRequests * linkedPullRequests;

        return Math.Round(score);
    }

    /// <summary>
    /// Calculate previous score (7 days ago) based on historical issue details
    /// </summary>
    /// <param name="issue">The issue details to score</param>
    /// <param name="weights">Custom weights for scoring components</param>
    /// <returns>Historical engagement score</returns>
    public double CalculateHistoricalScore(IssueDetails issue, ConfigFileEngagementWeights weights)
    {
        var historicIssue = GetHistoricalIssueDetails(issue);
        return CalculateScore(historicIssue, weights);
    }

    /// <summary>
    /// Analyze engagement trends and calculate both current and historical scores
    /// </summary>
    /// <param name="issue">The issue to analyze</param>
    /// <param name="weights">Scoring weights</param>
    /// <returns>Complete engagement analysis result</returns>
    public EngagementResult AnalyzeEngagement(IssueDetails issue, ConfigFileEngagementWeights weights)
    {
        var currentScore = CalculateScore(issue, weights);
        var previousScore = CalculateHistoricalScore(issue, weights);

        var factors = new ScoringFactors
        {
            Comments = issue.Comments.Count,
            Reactions = issue.Reactions.Count + issue.Comments.Sum(c => c.Reactions.Count),
            Contributors = GetUniqueContributorsCount(issue),
            TimeFactors = 1.0 / Math.Max(1, GetDaysSinceLastActivity(issue)),
            PullRequests = 0 // Not implemented yet
        };

        var classification = DetermineClassification(currentScore, previousScore);

        return new EngagementResult
        {
            Issue = issue,
            Score = currentScore,
            PreviousScore = previousScore,
            Factors = factors,
            Classification = classification
        };
    }

    /// <summary>
    /// Get historic issue details by filtering activity to 7 days ago
    /// </summary>
    /// <param name="issue">Current issue details</param>
    /// <returns>Historical snapshot of the issue</returns>
    private static IssueDetails GetHistoricalIssueDetails(IssueDetails issue)
    {
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        // If the issue is newer than 7 days, return empty historical data
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
                UpdatedAt = sevenDaysAgo,
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

    /// <summary>
    /// Get unique contributors to an issue
    /// </summary>
    /// <param name="issue">Issue to analyze</param>
    /// <returns>Count of unique contributors</returns>
    private static int GetUniqueContributorsCount(IssueDetails issue)
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

    /// <summary>
    /// Get time since last activity in days
    /// </summary>
    /// <param name="issue">Issue to analyze</param>
    /// <returns>Days since last activity</returns>
    private static int GetDaysSinceLastActivity(IssueDetails issue)
    {
        var lastUpdate = issue.UpdatedAt;
        var now = DateTime.UtcNow;
        var diffDays = (now - lastUpdate).TotalDays;
        return (int)Math.Ceiling(diffDays);
    }

    /// <summary>
    /// Get issue age in days
    /// </summary>
    /// <param name="issue">Issue to analyze</param>
    /// <returns>Days since issue creation</returns>
    private static int GetDaysSinceCreation(IssueDetails issue)
    {
        var created = issue.CreatedAt;
        var now = DateTime.UtcNow;
        var diffDays = (now - created).TotalDays;
        return (int)Math.Ceiling(diffDays);
    }

    /// <summary>
    /// Determine engagement classification based on score trends
    /// </summary>
    /// <param name="currentScore">Current engagement score</param>
    /// <param name="previousScore">Previous engagement score</param>
    /// <returns>Classification or null if no special classification applies</returns>
    private static EngagementClassification? DetermineClassification(double currentScore, double previousScore)
    {
        // Mark as "Hot" if engagement has increased significantly
        if (currentScore > previousScore && (currentScore - previousScore) >= 5)
        {
            return EngagementClassification.Hot;
        }

        return null;
    }
}