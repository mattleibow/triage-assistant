using TriageAssistant.Core.Models;

namespace TriageAssistant.GitHub.Services;

/// <summary>
/// Service interface for GitHub issue operations
/// </summary>
public interface IGitHubIssueService
{
    /// <summary>
    /// Get detailed information about a specific issue
    /// </summary>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    /// <param name="issueNumber">Issue number</param>
    /// <returns>Detailed issue information</returns>
    Task<IssueDetails> GetIssueDetailsAsync(string owner, string repo, int issueNumber);

    /// <summary>
    /// Search for issues using GitHub's search API
    /// </summary>
    /// <param name="query">Search query</param>
    /// <returns>List of matching issues</returns>
    Task<IList<IssueDetails>> SearchIssuesAsync(string query);

    /// <summary>
    /// Apply labels to an issue
    /// </summary>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    /// <param name="issueNumber">Issue number</param>
    /// <param name="labels">Labels to apply</param>
    /// <param name="dryRun">If true, don't actually apply labels</param>
    Task ApplyLabelsAsync(string owner, string repo, int issueNumber, IList<string> labels, bool dryRun = false);

    /// <summary>
    /// Add a comment to an issue
    /// </summary>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    /// <param name="issueNumber">Issue number</param>
    /// <param name="comment">Comment text</param>
    /// <param name="dryRun">If true, don't actually post the comment</param>
    Task AddCommentAsync(string owner, string repo, int issueNumber, string comment, bool dryRun = false);

    /// <summary>
    /// Add reactions to an issue
    /// </summary>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    /// <param name="issueNumber">Issue number</param>
    /// <param name="reactions">Reactions to add</param>
    /// <param name="dryRun">If true, don't actually add reactions</param>
    Task AddReactionsAsync(string owner, string repo, int issueNumber, IList<string> reactions, bool dryRun = false);
}

/// <summary>
/// Service interface for GitHub Projects v2 operations
/// </summary>
public interface IGitHubProjectsService
{
    /// <summary>
    /// Get project details including all items
    /// </summary>
    /// <param name="owner">Project owner</param>
    /// <param name="projectNumber">Project number</param>
    /// <returns>Project details with items</returns>
    Task<ProjectDetails> GetProjectDetailsAsync(string owner, int projectNumber);

    /// <summary>
    /// Update project items with engagement scores
    /// </summary>
    /// <param name="owner">Project owner</param>
    /// <param name="projectNumber">Project number</param>
    /// <param name="columnName">Column name to update</param>
    /// <param name="items">Items with engagement scores</param>
    /// <param name="dryRun">If true, don't actually update the project</param>
    Task UpdateProjectWithScoresAsync(string owner, int projectNumber, string columnName, IList<EngagementItem> items, bool dryRun = false);
}

/// <summary>
/// Service interface for GitHub GraphQL operations
/// </summary>
public interface IGitHubGraphQLService
{
    /// <summary>
    /// Execute a GraphQL query
    /// </summary>
    /// <typeparam name="T">Response type</typeparam>
    /// <param name="query">GraphQL query</param>
    /// <param name="variables">Query variables</param>
    /// <returns>Query result</returns>
    Task<T> QueryAsync<T>(string query, object? variables = null);
}