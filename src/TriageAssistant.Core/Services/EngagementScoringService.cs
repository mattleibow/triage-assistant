using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;

namespace TriageAssistant.Core.Services;

/// <summary>
/// Service for calculating engagement scores for GitHub issues
/// </summary>
public class EngagementScoringService
{
    private readonly EngagementWeights _weights;

    public EngagementScoringService(EngagementWeights weights)
    {
        _weights = weights;
    }

    /// <summary>
    /// Calculate engagement score for an issue
    /// </summary>
    /// <param name="issue">Issue details to score</param>
    /// <returns>Calculated engagement score</returns>
    public double CalculateScore(IssueDetails issue)
    {
        var commentsScore = CalculateCommentsScore(issue);
        var reactionsScore = CalculateReactionsScore(issue);
        var contributorsScore = CalculateContributorsScore(issue);
        var timeFactorsScore = CalculateTimeFactorsScore(issue);
        var pullRequestsScore = CalculatePullRequestsScore(issue);

        var totalScore = (commentsScore * _weights.Comments) +
                        (reactionsScore * _weights.Reactions) +
                        (contributorsScore * _weights.Contributors) +
                        (timeFactorsScore * (_weights.LastActivity + _weights.IssueAge)) +
                        (pullRequestsScore * _weights.LinkedPullRequests);

        return Math.Round(totalScore, 2);
    }

    /// <summary>
    /// Calculate historical engagement score based on activity from 7 days ago
    /// </summary>
    /// <param name="issue">Issue details to score</param>
    /// <returns>Historical engagement score</returns>
    public double CalculateHistoricalScore(IssueDetails issue)
    {
        var historicalIssue = GetHistoricalIssueDetails(issue);
        return CalculateScore(historicalIssue);
    }

    /// <summary>
    /// Get engagement score with both current and historical data
    /// </summary>
    /// <param name="issue">Issue details to score</param>
    /// <returns>Complete engagement score object</returns>
    public EngagementScore GetEngagementScore(IssueDetails issue)
    {
        var currentScore = CalculateScore(issue);
        var previousScore = CalculateHistoricalScore(issue);
        
        var classification = DetermineClassification(currentScore, previousScore);

        return new EngagementScore
        {
            Score = currentScore,
            PreviousScore = previousScore,
            Classification = classification
        };
    }

    /// <summary>
    /// Get historic issue details by filtering activity to 7 days ago
    /// </summary>
    private static IssueDetails GetHistoricalIssueDetails(IssueDetails issue)
    {
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        // If the issue is newer than 7 days, return it with empty activity
        if (issue.CreatedAt > sevenDaysAgo)
        {
            return issue with
            {
                Comments = new List<CommentDetails>(),
                Reactions = new List<ReactionDetails>()
            };
        }

        // Filter reactions to only include those created before 7 days ago
        var historicReactions = issue.Reactions
            .Where(reaction => reaction.CreatedAt <= sevenDaysAgo)
            .ToList();

        // Create historic snapshot by filtering comments and reactions to 7 days ago
        var historicComments = issue.Comments
            .Where(comment => comment.CreatedAt <= sevenDaysAgo)
            .Select(comment => comment with
            {
                Reactions = comment.Reactions
                    .Where(reaction => reaction.CreatedAt <= sevenDaysAgo)
                    .ToList()
            })
            .ToList();

        return issue with
        {
            Comments = historicComments,
            Reactions = historicReactions,
            UpdatedAt = sevenDaysAgo
        };
    }

    /// <summary>
    /// Calculate score based on number of comments
    /// </summary>
    private static double CalculateCommentsScore(IssueDetails issue)
    {
        return issue.Comments.Count;
    }

    /// <summary>
    /// Calculate score based on reactions (both issue and comment reactions)
    /// </summary>
    private static double CalculateReactionsScore(IssueDetails issue)
    {
        var issueReactions = issue.Reactions.Count;
        var commentReactions = issue.Comments.Sum(c => c.Reactions.Count);
        return issueReactions + commentReactions;
    }

    /// <summary>
    /// Calculate score based on number of unique contributors
    /// </summary>
    private static double CalculateContributorsScore(IssueDetails issue)
    {
        var contributors = new HashSet<string>();
        
        // Add issue author
        contributors.Add(issue.Author.Id);
        
        // Add comment authors
        foreach (var comment in issue.Comments)
        {
            contributors.Add(comment.Author.Id);
        }
        
        // Add reaction users
        foreach (var reaction in issue.Reactions)
        {
            contributors.Add(reaction.User.Id);
        }
        
        // Add comment reaction users
        foreach (var comment in issue.Comments)
        {
            foreach (var reaction in comment.Reactions)
            {
                contributors.Add(reaction.User.Id);
            }
        }

        return contributors.Count;
    }

    /// <summary>
    /// Calculate score based on time factors (recency and age)
    /// </summary>
    private static double CalculateTimeFactorsScore(IssueDetails issue)
    {
        var now = DateTime.UtcNow;
        
        // Last activity factor (more recent = higher score)
        var daysSinceUpdate = (now - issue.UpdatedAt).TotalDays;
        var lastActivityScore = Math.Max(0, 30 - daysSinceUpdate) / 30.0; // 0-1 scale

        // Issue age factor (not too old, not too new)
        var daysSinceCreation = (now - issue.CreatedAt).TotalDays;
        var ageScore = daysSinceCreation > 365 ? 0.1 : Math.Max(0.1, 1 - (daysSinceCreation / 365.0));

        return (lastActivityScore + ageScore) / 2.0;
    }

    /// <summary>
    /// Calculate score based on linked pull requests
    /// </summary>
    private static double CalculatePullRequestsScore(IssueDetails issue)
    {
        return issue.LinkedPullRequests.Count;
    }

    /// <summary>
    /// Determine engagement classification based on current and previous scores
    /// </summary>
    private static EngagementClassification? DetermineClassification(double currentScore, double previousScore)
    {
        // Classify as "Hot" if current score is significantly higher than previous
        if (currentScore > previousScore * 1.5 && currentScore > 10)
        {
            return EngagementClassification.Hot;
        }

        return null;
    }
}