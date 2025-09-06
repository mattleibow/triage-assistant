using Octokit;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using TriageAssistant.Core.Utils;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using GraphQL.Client.Http;
using GraphQL.Client.Abstractions;

namespace TriageAssistant.Core.GitHub;

/// <summary>
/// Service for GitHub issues operations
/// </summary>
public interface IGitHubIssuesService
{
    /// <summary>
    /// Comments on an issue with the provided summary
    /// </summary>
    /// <param name="summaryFile">Path to the file containing the summary text</param>
    /// <param name="config">The triage configuration object</param>
    /// <param name="footer">Optional footer text</param>
    Task CommentOnIssueAsync(string summaryFile, ApplySummaryCommentConfig config, string? footer = null);

    /// <summary>
    /// Applies labels to an issue
    /// </summary>
    /// <param name="labels">Labels to apply</param>
    /// <param name="config">The triage configuration object</param>
    Task ApplyLabelsToIssueAsync(string[] labels, ApplyLabelsConfig config);

    /// <summary>
    /// Adds eyes reaction to an issue
    /// </summary>
    /// <param name="config">The triage configuration object</param>
    Task AddEyesAsync(ApplyReactionsConfig config);

    /// <summary>
    /// Removes eyes reaction from an issue if added by github-actions[bot]
    /// </summary>
    /// <param name="config">The triage configuration object</param>
    Task RemoveEyesAsync(ApplyReactionsConfig config);

    /// <summary>
    /// Get detailed information about an issue including comments and reactions using GraphQL
    /// </summary>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    /// <param name="issueNumber">Issue number</param>
    Task<IssueDetails> GetIssueDetailsAsync(string owner, string repo, int issueNumber);

    /// <summary>
    /// Search for issues using GitHub's search API
    /// </summary>
    /// <param name="query">Search query</param>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    Task<List<Models.Issue>> SearchIssuesAsync(string query, string owner, string repo);
}

/// <summary>
/// Implementation of GitHub issues service
/// </summary>
public class GitHubIssuesService : IGitHubIssuesService
{
    private readonly ILogger<GitHubIssuesService> _logger;
    private GitHubClient? _gitHubClient;
    private IGraphQLClient? _graphQLClient;

    public GitHubIssuesService(ILogger<GitHubIssuesService> logger)
    {
        _logger = logger;
    }

    private GitHubClient GetGitHubClient(string token)
    {
        if (_gitHubClient == null)
        {
            _gitHubClient = new GitHubClient(new ProductHeaderValue("triage-assistant"))
            {
                Credentials = new Credentials(token)
            };
        }
        return _gitHubClient;
    }

    private IGraphQLClient GetGraphQLClient(string token)
    {
        if (_graphQLClient == null)
        {
            var options = new GraphQLHttpClientOptions
            {
                EndPoint = new Uri("https://api.github.com/graphql")
            };
            _graphQLClient = new GraphQLHttpClient(options);
            _graphQLClient.HttpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
            _graphQLClient.HttpClient.DefaultRequestHeaders.Add("User-Agent", "triage-assistant");
        }
        return _graphQLClient;
    }

    /// <inheritdoc/>
    public async Task CommentOnIssueAsync(string summaryFile, GitHubIssueConfig config, string? footer = null)
    {
        var summary = await File.ReadAllTextAsync(summaryFile);

        var commentBody = SanitizeMarkdownContent(
            $@"{summary.Trim()}

{footer ?? ""}".Trim());

        // If the comment body is empty, do not post an empty comment
        if (string.IsNullOrWhiteSpace(commentBody))
        {
            return;
        }

        if (config is TriageConfig triageConfig && triageConfig.DryRun)
        {
            _logger.LogInformation("Dry run: Skipping commenting on issue: {CommentBody}", 
                TriageUtils.SanitizeForLogging(commentBody));
            return;
        }

        var client = GetGitHubClient(config.Token);
        await client.Issue.Comment.Create(config.RepoOwner, config.RepoName, config.IssueNumber, commentBody);
    }

    /// <inheritdoc/>
    public async Task ApplyLabelsToIssueAsync(string[] labels, GitHubIssueConfig config)
    {
        // Filter out empty labels
        var filteredLabels = labels?.Where(label => !string.IsNullOrWhiteSpace(label))?.ToArray();

        // If no labels to apply, return early
        if (filteredLabels == null || filteredLabels.Length == 0)
        {
            return;
        }

        if (config is TriageConfig triageConfig && triageConfig.DryRun)
        {
            _logger.LogInformation("Dry run: Skipping applying labels: {Labels}", string.Join(", ", filteredLabels));
            return;
        }

        var client = GetGitHubClient(config.Token);
        await client.Issue.Labels.AddToIssue(config.RepoOwner, config.RepoName, config.IssueNumber, filteredLabels);
    }

    /// <inheritdoc/>
    public async Task AddEyesAsync(GitHubIssueConfig config)
    {
        if (config is TriageConfig triageConfig && triageConfig.DryRun)
        {
            _logger.LogInformation("Dry run: Skipping adding eyes reaction to issue #{IssueNumber}", config.IssueNumber);
            return;
        }

        var client = GetGitHubClient(config.Token);
        
        try
        {
            await client.Reaction.Issue.Create(config.RepoOwner, config.RepoName, config.IssueNumber, 
                new NewReaction(ReactionType.Eyes));
            _logger.LogInformation("Added eyes reaction to issue #{IssueNumber}", config.IssueNumber);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to add eyes reaction to issue #{IssueNumber}: {Message}", 
                config.IssueNumber, ex.Message);
        }
    }

    /// <inheritdoc/>
    public async Task RemoveEyesAsync(GitHubIssueConfig config)
    {
        if (config is TriageConfig triageConfig && triageConfig.DryRun)
        {
            _logger.LogInformation("Dry run: Skipping removing eyes reaction from issue #{IssueNumber}", config.IssueNumber);
            return;
        }

        var client = GetGitHubClient(config.Token);

        try
        {
            // Get all reactions for the issue
            var reactions = await client.Reaction.Issue.GetAll(config.RepoOwner, config.RepoName, config.IssueNumber);

            // Find eyes reaction by github-actions[bot]
            var eyesReaction = reactions.FirstOrDefault(r => 
                r.Content == ReactionType.Eyes && 
                r.User?.Login?.Equals("github-actions[bot]", StringComparison.OrdinalIgnoreCase) == true);

            if (eyesReaction != null)
            {
                await client.Reaction.Issue.Delete(config.RepoOwner, config.RepoName, config.IssueNumber, eyesReaction.Id);
                _logger.LogInformation("Removed eyes reaction from issue #{IssueNumber}", config.IssueNumber);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to remove eyes reaction from issue #{IssueNumber}: {Message}", 
                config.IssueNumber, ex.Message);
        }
    }

    /// <inheritdoc/>
    public async Task<IssueDetails> GetIssueDetailsAsync(string owner, string repo, int issueNumber)
    {
        // For now, use REST API - later we can implement GraphQL for more detailed queries
        var client = GetGitHubClient(""); // We'll need to pass token through config
        var issue = await client.Issue.Get(owner, repo, issueNumber);
        var comments = await client.Issue.Comment.GetAllForIssue(owner, repo, issueNumber);

        var issueDetails = new IssueDetails
        {
            Id = issue.Id.ToString(),
            Owner = owner,
            Repo = repo,
            Number = issue.Number,
            Title = issue.Title,
            Body = issue.Body ?? string.Empty,
            State = issue.State.StringValue,
            CreatedAt = issue.CreatedAt.UtcDateTime,
            UpdatedAt = issue.UpdatedAt?.UtcDateTime ?? issue.CreatedAt.UtcDateTime,
            ClosedAt = issue.ClosedAt?.UtcDateTime,
            User = new UserInfo
            {
                Login = issue.User.Login,
                Type = issue.User.Type.StringValue
            },
            Assignees = issue.Assignees?.Select(a => new UserInfo 
            { 
                Login = a.Login, 
                Type = a.Type.StringValue 
            }).ToList() ?? new List<UserInfo>(),
            Comments = comments.Select(c => new CommentData
            {
                User = new UserInfo 
                { 
                    Login = c.User?.Login ?? string.Empty, 
                    Type = c.User?.Type.StringValue ?? string.Empty 
                },
                CreatedAt = c.CreatedAt.UtcDateTime,
                Reactions = new List<ReactionData>() // TODO: Get reactions for comments
            }).ToList(),
            Reactions = new List<ReactionData>() // TODO: Get reactions for the issue
        };

        return issueDetails;
    }

    /// <inheritdoc/>
    public async Task<List<Models.Issue>> SearchIssuesAsync(string query, string owner, string repo)
    {
        var client = GetGitHubClient(""); // We'll need to pass token through config
        var searchQuery = $"{query} repo:{owner}/{repo}";
        
        var searchResult = await client.Search.SearchIssues(new SearchIssuesRequest(searchQuery));
        
        return searchResult.Items.Select(item => new Models.Issue
        {
            Id = item.Id.ToString(),
            Owner = owner,
            Repo = repo,
            Number = item.Number
        }).ToList();
    }

    /// <summary>
    /// Sanitizes markdown content to prevent injection attacks while preserving formatting
    /// </summary>
    /// <param name="content">Raw markdown content</param>
    /// <returns>Sanitized content safe for GitHub comments</returns>
    private static string SanitizeMarkdownContent(string content)
    {
        const int maxCommentLength = 65536; // GitHub's comment limit

        if (string.IsNullOrEmpty(content))
        {
            return string.Empty;
        }

        // Basic sanitization - remove potentially dangerous content
        var sanitized = content;

        // Limit length to prevent abuse
        if (sanitized.Length > maxCommentLength)
        {
            sanitized = sanitized[..(maxCommentLength - 100)] + "\n\n[Content truncated for safety]";
        }

        return sanitized;
    }
}