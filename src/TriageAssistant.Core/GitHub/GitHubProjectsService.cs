using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using Microsoft.Extensions.Logging;
using GraphQL;
using GraphQL.Client.Http;
using System.Text.Json;

namespace TriageAssistant.Core.GitHub;

/// <summary>
/// Service for GitHub Projects v2 operations
/// </summary>
public interface IGitHubProjectsService
{
    /// <summary>
    /// Get project details with all items
    /// </summary>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    /// <param name="projectNumber">Project number</param>
    /// <returns>Project details with items</returns>
    Task<ProjectDetails?> GetProjectDetailsAsync(string owner, string repo, int projectNumber);

    /// <summary>
    /// Update project items with engagement scores
    /// </summary>
    /// <param name="config">Engagement workflow configuration</param>
    /// <param name="engagementResponse">Engagement response with scores</param>
    Task UpdateProjectWithScoresAsync(EngagementWorkflowConfig config, EngagementResponse engagementResponse);
}

/// <summary>
/// Implementation of GitHub Projects service using GraphQL
/// </summary>
public class GitHubProjectsService : IGitHubProjectsService
{
    private readonly GraphQLHttpClient _graphQLClient;
    private readonly ILogger<GitHubProjectsService> _logger;

    public GitHubProjectsService(string token, ILogger<GitHubProjectsService> logger)
    {
        _logger = logger;
        
        // Initialize GraphQL client for GitHub
        _graphQLClient = new GraphQLHttpClient("https://api.github.com/graphql", new GraphQL.Client.Serializer.SystemTextJson.SystemTextJsonSerializer());
        _graphQLClient.HttpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        _graphQLClient.HttpClient.DefaultRequestHeaders.Add("User-Agent", "TriageAssistant/1.0");
    }

    /// <inheritdoc/>
    public async Task<ProjectDetails?> GetProjectDetailsAsync(string owner, string repo, int projectNumber)
    {
        try
        {
            _logger.LogInformation("📊 Fetching project details for project #{ProjectNumber}", projectNumber);

            // GraphQL query to get project details with items
            var query = new GraphQLRequest
            {
                Query = """
                query GetProjectDetails($owner: String!, $projectNumber: Int!) {
                  repository(owner: $owner, name: "_") {
                    owner {
                      projectV2(number: $projectNumber) {
                        id
                        title
                        number
                        items(first: 100) {
                          nodes {
                            id
                            type
                            content {
                              ... on Issue {
                                id
                                number
                                title
                                repository {
                                  owner {
                                    login
                                  }
                                  name
                                }
                              }
                              ... on PullRequest {
                                id
                                number
                                title
                                repository {
                                  owner {
                                    login
                                  }
                                  name
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
                """,
                Variables = new { owner, projectNumber }
            };

            var response = await _graphQLClient.SendQueryAsync<dynamic>(query);

            if (response.Errors?.Any() == true)
            {
                var errorMessage = string.Join(", ", response.Errors.Select(e => e.Message));
                _logger.LogError("❌ GraphQL errors: {Errors}", errorMessage);
                return null;
            }

            var projectData = ((JsonElement)response.Data)
                .GetProperty("repository")
                .GetProperty("owner")
                .GetProperty("projectV2");

            var project = new ProjectDetails
            {
                Id = projectData.GetProperty("id").GetString() ?? string.Empty,
                Owner = owner,
                Number = projectData.GetProperty("number").GetInt32(),
                Items = new List<ProjectItem>()
            };

            // Parse project items
            var itemsNodes = projectData.GetProperty("items").GetProperty("nodes");
            foreach (var item in itemsNodes.EnumerateArray())
            {
                var content = item.GetProperty("content");
                if (!content.TryGetProperty("id", out _)) continue; // Skip items without content

                var projectItem = new ProjectItem
                {
                    Id = item.GetProperty("id").GetString() ?? string.Empty,
                    ProjectId = project.Id,
                    Type = item.GetProperty("type").GetString(),
                    Content = new Issue
                    {
                        Id = content.GetProperty("id").GetString() ?? string.Empty,
                        Number = content.GetProperty("number").GetInt32(),
                        Owner = content.GetProperty("repository").GetProperty("owner").GetProperty("login").GetString() ?? string.Empty,
                        Repo = content.GetProperty("repository").GetProperty("name").GetString() ?? string.Empty
                    }
                };

                project.Items.Add(projectItem);
            }

            _logger.LogInformation("✅ Successfully fetched project #{ProjectNumber} with {ItemCount} items", 
                projectNumber, project.Items.Count);

            return project;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to get project details for project #{ProjectNumber}: {Message}", 
                projectNumber, ex.Message);
            return null;
        }
    }

    /// <inheritdoc/>
    public async Task UpdateProjectWithScoresAsync(EngagementWorkflowConfig config, EngagementResponse engagementResponse)
    {
        if (engagementResponse.Project == null)
        {
            _logger.LogWarning("⚠️ No project information in engagement response, skipping update");
            return;
        }

        try
        {
            _logger.LogInformation("💾 Updating project items with engagement scores");

            if (config.DryRun)
            {
                _logger.LogInformation("🔍 Dry run: Would update {Count} project items with engagement scores", 
                    engagementResponse.Items.Count);
                
                foreach (var item in engagementResponse.Items)
                {
                    _logger.LogInformation("🔍 Dry run: Item {IssueNumber} would get score {Score} in column '{Column}'", 
                        item.Issue.Number, item.Engagement.Score, config.ProjectColumn);
                }
                return;
            }

            // In a real implementation, we would need to:
            // 1. Find the project field ID for the engagement score column
            // 2. Update each project item with the calculated score
            // 3. Handle field types (number, text, etc.)

            // For now, log what we would do
            foreach (var item in engagementResponse.Items.Where(i => !string.IsNullOrEmpty(i.Id)))
            {
                _logger.LogInformation("💾 Would update project item {ItemId} (Issue #{IssueNumber}) with score {Score}", 
                    item.Id, item.Issue.Number, item.Engagement.Score);

                // TODO: Implement actual GraphQL mutation to update project item field
                // This requires finding the field ID and using the updateProjectV2ItemFieldValue mutation
            }

            _logger.LogInformation("✅ Project score updates completed (placeholder implementation)");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to update project with scores: {Message}", ex.Message);
            throw;
        }
    }

    public void Dispose()
    {
        _graphQLClient?.Dispose();
    }
}