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

            // Step 1: Find the project field ID for the engagement score column
            var projectFieldId = await GetProjectFieldIdAsync(config.RepoOwner, config.RepoName, 
                engagementResponse.Project.Number, config.ProjectColumn);

            if (string.IsNullOrEmpty(projectFieldId))
            {
                _logger.LogWarning("⚠️ Field '{FieldName}' not found in project #{ProjectNumber}", 
                    config.ProjectColumn, engagementResponse.Project.Number);
                return;
            }

            // Step 2: Update each project item with the calculated score
            var updatedCount = 0;
            foreach (var item in engagementResponse.Items.Where(i => !string.IsNullOrEmpty(i.Id)))
            {
                try
                {
                    await UpdateProjectItemFieldValueAsync(
                        item.Id!, 
                        projectFieldId, 
                        engagementResponse.Project.Id, 
                        item.Engagement.Score);

                    updatedCount++;
                    _logger.LogInformation("💾 Updated project item {ItemId} (Issue #{IssueNumber}) with score {Score}", 
                        item.Id, item.Issue.Number, item.Engagement.Score);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Failed to update project item {ItemId} (Issue #{IssueNumber}): {Message}", 
                        item.Id, item.Issue.Number, ex.Message);
                    // Continue with other items even if one fails
                }
            }

            _logger.LogInformation("✅ Project score updates completed. Updated {UpdatedCount} of {TotalCount} items", 
                updatedCount, engagementResponse.Items.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to update project with scores: {Message}", ex.Message);
            throw;
        }
    }

    /// <summary>
    /// Get the field ID for a project field by name
    /// </summary>
    private async Task<string?> GetProjectFieldIdAsync(string owner, string repo, int projectNumber, string fieldName)
    {
        _logger.LogInformation("🔍 Looking for field '{FieldName}' in project #{ProjectNumber}", fieldName, projectNumber);

        var query = @"
            query GetProjectFields($owner: String!, $repo: String!, $projectNumber: Int!) {
                repository(owner: $owner, name: $repo) {
                    projectV2(number: $projectNumber) {
                        id
                        fields(first: 50) {
                            nodes {
                                ... on ProjectV2Field {
                                    id
                                    name
                                    dataType
                                }
                                ... on ProjectV2SingleSelectField {
                                    id
                                    name
                                    dataType
                                }
                            }
                        }
                    }
                }
            }";

        try
        {
            var variables = new { owner, repo, projectNumber };
            var request = new GraphQLRequest { Query = query, Variables = variables };
            var response = await _graphQLClient.SendQueryAsync<JsonDocument>(request);

            if (response.Errors?.Any() == true)
            {
                var errorMessages = string.Join(", ", response.Errors.Select(e => e.Message));
                _logger.LogError("❌ GraphQL errors while getting project fields: {Errors}", errorMessages);
                return null;
            }

            // Parse the JsonDocument response to find the field
            var data = response.Data;
            if (data?.RootElement.TryGetProperty("repository", out var repository) == true &&
                repository.TryGetProperty("projectV2", out var projectV2) &&
                projectV2.TryGetProperty("fields", out var fields) &&
                fields.TryGetProperty("nodes", out var nodes))
            {
                foreach (var field in nodes.EnumerateArray())
                {
                    if (field.TryGetProperty("name", out var nameProperty) &&
                        field.TryGetProperty("id", out var idProperty))
                    {
                        var fieldNameValue = nameProperty.GetString();
                        var fieldIdValue = idProperty.GetString();
                        
                        if (fieldNameValue == fieldName && !string.IsNullOrEmpty(fieldIdValue))
                        {
                            _logger.LogInformation("✅ Found field '{FieldName}' with ID: {FieldId}", fieldName, fieldIdValue);
                            return fieldIdValue;
                        }
                    }
                }
            }

            _logger.LogWarning("⚠️ Field '{FieldName}' not found in project #{ProjectNumber}", fieldName, projectNumber);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to get project field '{FieldName}': {Message}", fieldName, ex.Message);
            return null;
        }
    }

    /// <summary>
    /// Update a project item field value using GraphQL mutation
    /// </summary>
    private async Task UpdateProjectItemFieldValueAsync(string itemId, string fieldId, string projectId, double value)
    {
        _logger.LogDebug("🔧 Updating project item {ItemId} field {FieldId} with value {Value}", itemId, fieldId, value);

        var mutation = @"
            mutation UpdateProjectItemField($projectItemId: ID!, $projectFieldId: ID!, $projectId: ID!, $engagementScoreNumber: Float!) {
                updateProjectV2ItemFieldValue(
                    input: {
                        itemId: $projectItemId
                        fieldId: $projectFieldId
                        projectId: $projectId
                        value: { number: $engagementScoreNumber }
                    }
                ) {
                    projectV2Item {
                        id
                    }
                }
            }";

        try
        {
            var variables = new 
            { 
                projectItemId = itemId,
                projectFieldId = fieldId,
                projectId = projectId,
                engagementScoreNumber = value
            };

            var request = new GraphQLRequest { Query = mutation, Variables = variables };
            var response = await _graphQLClient.SendMutationAsync<JsonDocument>(request);

            if (response.Errors?.Any() == true)
            {
                var errorMessages = string.Join(", ", response.Errors.Select(e => e.Message));
                throw new InvalidOperationException($"GraphQL mutation errors: {errorMessages}");
            }

            _logger.LogDebug("✅ Successfully updated project item {ItemId} with value {Value}", itemId, value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to update project item {ItemId}: {Message}", itemId, ex.Message);
            throw;
        }
    }

    public void Dispose()
    {
        _graphQLClient?.Dispose();
    }
}