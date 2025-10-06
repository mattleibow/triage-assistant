using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using Microsoft.Extensions.Logging;
using Octokit;
using GraphQL;
using GraphQL.Client.Http;
using GraphQL.Client.Serializer.SystemTextJson;
using System.Text.Json;

namespace TriageAssistant.Core.GitHub;

/// <summary>
/// Service for GitHub issues and repository operations
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
    Task<List<IssueBody>> SearchIssuesAsync(string query, string owner, string repo);
}

/// <summary>
/// Implementation of GitHub issues service using Octokit.NET
/// </summary>
public class GitHubIssuesService : IGitHubIssuesService
{
    private readonly GitHubClient _gitHubClient;
    private readonly GraphQLHttpClient _graphQLClient;
    private readonly ILogger<GitHubIssuesService> _logger;

    public GitHubIssuesService(string token, ILogger<GitHubIssuesService> logger)
    {
        _logger = logger;
        
        // Initialize Octokit
        _gitHubClient = new GitHubClient(new ProductHeaderValue("TriageAssistant", "1.0"))
        {
            Credentials = new Credentials(token)
        };

        // Initialize GraphQL client
        _graphQLClient = new GraphQLHttpClient("https://api.github.com/graphql", new SystemTextJsonSerializer());
        _graphQLClient.HttpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        _graphQLClient.HttpClient.DefaultRequestHeaders.Add("User-Agent", "TriageAssistant/1.0");
    }

    /// <inheritdoc/>
    public async Task CommentOnIssueAsync(string summaryFile, ApplySummaryCommentConfig config, string? footer = null)
    {
        try
        {
            var summary = await File.ReadAllTextAsync(summaryFile);
            var commentBody = $"{summary}\n\n{footer ?? ""}".Trim();

            if (string.IsNullOrWhiteSpace(commentBody))
            {
                _logger.LogInformation("⚠️ Comment body is empty, skipping comment");
                return;
            }

            if (config.DryRun)
            {
                _logger.LogInformation("🔍 Dry run: Would comment on issue #{IssueNumber}: {Summary}", 
                    config.IssueNumber, commentBody[..Math.Min(100, commentBody.Length)]);
                return;
            }

            await _gitHubClient.Issue.Comment.Create(config.RepoOwner, config.RepoName, config.IssueNumber, commentBody);
            _logger.LogInformation("💬 Successfully commented on issue #{IssueNumber}", config.IssueNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to comment on issue #{IssueNumber}: {Message}", config.IssueNumber, ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task ApplyLabelsToIssueAsync(string[] labels, ApplyLabelsConfig config)
    {
        try
        {
            var filteredLabels = labels.Where(label => !string.IsNullOrWhiteSpace(label)).ToArray();

            if (filteredLabels.Length == 0)
            {
                _logger.LogInformation("⚠️ No valid labels to apply");
                return;
            }

            if (config.DryRun)
            {
                _logger.LogInformation("🔍 Dry run: Would apply labels to issue #{IssueNumber}: {Labels}", 
                    config.IssueNumber, string.Join(", ", filteredLabels));
                return;
            }

            var issue = new IssueUpdate();
            foreach (var label in filteredLabels)
            {
                issue.AddLabel(label);
            }

            await _gitHubClient.Issue.Labels.AddToIssue(config.RepoOwner, config.RepoName, config.IssueNumber, filteredLabels);
            _logger.LogInformation("🏷️ Successfully applied labels to issue #{IssueNumber}: {Labels}", 
                config.IssueNumber, string.Join(", ", filteredLabels));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to apply labels to issue #{IssueNumber}: {Message}", config.IssueNumber, ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task AddEyesAsync(ApplyReactionsConfig config)
    {
        try
        {
            if (config.DryRun)
            {
                _logger.LogInformation("🔍 Dry run: Would add eyes reaction to issue #{IssueNumber}", config.IssueNumber);
                return;
            }

            await _gitHubClient.Reaction.Issue.Create(config.RepoOwner, config.RepoName, config.IssueNumber, new NewReaction(ReactionType.Eyes));
            _logger.LogInformation("👀 Successfully added eyes reaction to issue #{IssueNumber}", config.IssueNumber);
        }
        catch (ApiException ex) when (ex.HttpResponse.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            // Reaction already exists, this is fine
            _logger.LogDebug("Eyes reaction already exists on issue #{IssueNumber}", config.IssueNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to add eyes reaction to issue #{IssueNumber}: {Message}", config.IssueNumber, ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task RemoveEyesAsync(ApplyReactionsConfig config)
    {
        try
        {
            if (config.DryRun)
            {
                _logger.LogInformation("🔍 Dry run: Would remove eyes reaction from issue #{IssueNumber}", config.IssueNumber);
                return;
            }

            var reactions = await _gitHubClient.Reaction.Issue.GetAll(config.RepoOwner, config.RepoName, config.IssueNumber);
            var eyesReaction = reactions.FirstOrDefault(r => r.Content == ReactionType.Eyes && r.User.Login == "github-actions[bot]");
            
            if (eyesReaction != null)
            {
                await _gitHubClient.Reaction.Issue.Delete(config.RepoOwner, config.RepoName, config.IssueNumber, eyesReaction.Id);
                _logger.LogInformation("🙈 Successfully removed eyes reaction from issue #{IssueNumber}", config.IssueNumber);
            }
            else
            {
                _logger.LogDebug("No eyes reaction from github-actions[bot] found on issue #{IssueNumber}", config.IssueNumber);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to remove eyes reaction from issue #{IssueNumber}: {Message}", config.IssueNumber, ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IssueDetails> GetIssueDetailsAsync(string owner, string repo, int issueNumber)
    {
        try
        {
            _logger.LogInformation("📄 Fetching issue details for {Owner}/{Repo}#{IssueNumber}", owner, repo, issueNumber);

            // GraphQL query for getting full issue details with comments and reactions
            var query = new GraphQLRequest
            {
                Query = """
                query GetIssueDetails($owner: String!, $repo: String!, $issueNumber: Int!) {
                  repository(owner: $owner, name: $repo) {
                    issue(number: $issueNumber) {
                      id
                      number
                      title
                      body
                      state
                      createdAt
                      updatedAt
                      closedAt
                      author {
                        login
                        __typename
                      }
                      assignees(first: 10) {
                        nodes {
                          login
                          __typename
                        }
                      }
                      reactions(first: 100) {
                        nodes {
                          content
                          user {
                            login
                            __typename
                          }
                          createdAt
                        }
                      }
                      comments(first: 100) {
                        nodes {
                          createdAt
                          author {
                            login
                            __typename
                          }
                          reactions(first: 50) {
                            nodes {
                              content
                              user {
                                login
                                __typename
                              }
                              createdAt
                            }
                          }
                        }
                      }
                    }
                  }
                }
                """,
                Variables = new { owner, repo, issueNumber }
            };

            var response = await _graphQLClient.SendQueryAsync<dynamic>(query);
            
            if (response.Errors?.Any() == true)
            {
                var errorMessage = string.Join(", ", response.Errors.Select(e => e.Message));
                throw new InvalidOperationException($"GraphQL errors: {errorMessage}");
            }

            var issueData = ((JsonElement)response.Data).GetProperty("repository").GetProperty("issue");
            
            // Parse the issue details from JSON
            var issue = new IssueDetails
            {
                Id = issueData.GetProperty("id").GetString() ?? string.Empty,
                Owner = owner,
                Repo = repo,
                Number = issueData.GetProperty("number").GetInt32(),
                Title = issueData.GetProperty("title").GetString() ?? string.Empty,
                Body = issueData.GetProperty("body").GetString() ?? string.Empty,
                State = issueData.GetProperty("state").GetString()?.ToLowerInvariant() ?? "unknown",
                CreatedAt = DateTime.Parse(issueData.GetProperty("createdAt").GetString() ?? DateTime.UtcNow.ToString()),
                UpdatedAt = DateTime.Parse(issueData.GetProperty("updatedAt").GetString() ?? DateTime.UtcNow.ToString()),
                ClosedAt = issueData.TryGetProperty("closedAt", out var closedAtProp) && closedAtProp.ValueKind != JsonValueKind.Null ? 
                    DateTime.Parse(closedAtProp.GetString() ?? string.Empty) : null
            };

            // Parse author
            if (issueData.TryGetProperty("author", out var authorProp) && authorProp.ValueKind != JsonValueKind.Null)
            {
                issue.User = new UserInfo
                {
                    Login = authorProp.GetProperty("login").GetString() ?? string.Empty,
                    Type = authorProp.GetProperty("__typename").GetString() ?? "User"
                };
            }

            // Parse assignees
            if (issueData.TryGetProperty("assignees", out var assigneesProp))
            {
                var assigneesNodes = assigneesProp.GetProperty("nodes");
                foreach (var assignee in assigneesNodes.EnumerateArray())
                {
                    issue.Assignees.Add(new UserInfo
                    {
                        Login = assignee.GetProperty("login").GetString() ?? string.Empty,
                        Type = assignee.GetProperty("__typename").GetString() ?? "User"
                    });
                }
            }

            // Parse reactions
            if (issueData.TryGetProperty("reactions", out var reactionsProp))
            {
                var reactionsNodes = reactionsProp.GetProperty("nodes");
                foreach (var reaction in reactionsNodes.EnumerateArray())
                {
                    issue.Reactions.Add(new ReactionData
                    {
                        Reaction = reaction.GetProperty("content").GetString() ?? string.Empty,
                        CreatedAt = DateTime.Parse(reaction.GetProperty("createdAt").GetString() ?? DateTime.UtcNow.ToString()),
                        User = new UserInfo
                        {
                            Login = reaction.GetProperty("user").GetProperty("login").GetString() ?? string.Empty,
                            Type = reaction.GetProperty("user").GetProperty("__typename").GetString() ?? "User"
                        }
                    });
                }
            }

            // Parse comments
            if (issueData.TryGetProperty("comments", out var commentsProp))
            {
                var commentsNodes = commentsProp.GetProperty("nodes");
                foreach (var comment in commentsNodes.EnumerateArray())
                {
                    var commentData = new CommentData
                    {
                        CreatedAt = DateTime.Parse(comment.GetProperty("createdAt").GetString() ?? DateTime.UtcNow.ToString()),
                        User = new UserInfo
                        {
                            Login = comment.GetProperty("author").GetProperty("login").GetString() ?? string.Empty,
                            Type = comment.GetProperty("author").GetProperty("__typename").GetString() ?? "User"
                        }
                    };

                    // Parse comment reactions
                    if (comment.TryGetProperty("reactions", out var commentReactionsProp))
                    {
                        var commentReactionsNodes = commentReactionsProp.GetProperty("nodes");
                        foreach (var commentReaction in commentReactionsNodes.EnumerateArray())
                        {
                            commentData.Reactions.Add(new ReactionData
                            {
                                Reaction = commentReaction.GetProperty("content").GetString() ?? string.Empty,
                                CreatedAt = DateTime.Parse(commentReaction.GetProperty("createdAt").GetString() ?? DateTime.UtcNow.ToString()),
                                User = new UserInfo
                                {
                                    Login = commentReaction.GetProperty("user").GetProperty("login").GetString() ?? string.Empty,
                                    Type = commentReaction.GetProperty("user").GetProperty("__typename").GetString() ?? "User"
                                }
                            });
                        }
                    }

                    issue.Comments.Add(commentData);
                }
            }

            _logger.LogInformation("✅ Successfully fetched issue details: {Title} with {Comments} comments and {Reactions} reactions", 
                issue.Title, issue.Comments.Count, issue.Reactions.Count);

            return issue;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to get issue details for {Owner}/{Repo}#{IssueNumber}: {Message}", 
                owner, repo, issueNumber, ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<List<IssueBody>> SearchIssuesAsync(string query, string owner, string repo)
    {
        try
        {
            var scopedQuery = query.Contains("repo:") ? query : $"{query} repo:{owner}/{repo}";
            _logger.LogInformation("🔍 Searching for issues with query: {Query}", scopedQuery);

            var searchRequest = new SearchIssuesRequest(scopedQuery)
            {
                SortField = IssueSearchSort.Created,
                Order = SortDirection.Descending
            };

            var searchResult = await _gitHubClient.Search.SearchIssues(searchRequest);
            
            var issues = searchResult.Items.Select(item => new IssueBody
            {
                Id = item.Id.ToString(),
                Owner = owner,
                Repo = repo,
                Number = item.Number,
                Title = item.Title,
                Body = item.Body ?? string.Empty,
                State = item.State.Value.ToString().ToLowerInvariant(),
                CreatedAt = item.CreatedAt.DateTime,
                UpdatedAt = item.UpdatedAt?.DateTime ?? DateTime.UtcNow,
                ClosedAt = item.ClosedAt?.DateTime,
                User = new UserInfo
                {
                    Login = item.User?.Login ?? string.Empty,
                    Type = item.User?.Type.ToString() ?? "User"
                },
                Assignees = item.Assignees?.Select(a => new UserInfo
                {
                    Login = a?.Login ?? string.Empty,
                    Type = a?.Type.ToString() ?? "User"
                }).ToList() ?? new List<UserInfo>()
            }).ToList();

            _logger.LogInformation("✅ Found {Count} issues matching search query", issues.Count);
            return issues;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to search issues with query '{Query}': {Message}", query, ex.Message);
            throw;
        }
    }

    public void Dispose()
    {
        _graphQLClient?.Dispose();
    }
}