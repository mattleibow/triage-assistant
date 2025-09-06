using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using TriageAssistant.Core.GitHub;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace TriageAssistant.Core.Workflows;

/// <summary>
/// Service for running the engagement scoring workflow
/// </summary>
public interface IEngagementWorkflowService
{
    /// <summary>
    /// Run the complete engagement scoring workflow
    /// </summary>
    /// <param name="config">Engagement workflow configuration</param>
    /// <param name="configFile">Configuration file for engagement weights</param>
    /// <returns>Engagement response file path</returns>
    Task<string> RunEngagementWorkflowAsync(EngagementWorkflowConfig config, ConfigFileEngagement configFile);
}

/// <summary>
/// Implementation of the engagement workflow service
/// </summary>
public class EngagementWorkflowService : IEngagementWorkflowService
{
    private readonly IGitHubIssuesService _githubIssuesService;
    private readonly IGitHubProjectsService _githubProjectsService;
    private readonly IIssueDetailsService _issueDetailsService;
    private readonly ILogger<EngagementWorkflowService> _logger;

    public EngagementWorkflowService(
        IGitHubIssuesService githubIssuesService,
        IGitHubProjectsService githubProjectsService,
        IIssueDetailsService issueDetailsService,
        ILogger<EngagementWorkflowService> logger)
    {
        _githubIssuesService = githubIssuesService;
        _githubProjectsService = githubProjectsService;
        _issueDetailsService = issueDetailsService;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<string> RunEngagementWorkflowAsync(EngagementWorkflowConfig config, ConfigFileEngagement configFile)
    {
        _logger.LogInformation("📊 Running engagement scoring workflow");

        // Calculate engagement scores
        var engagementResponse = await CalculateEngagementScoresAsync(config, configFile.Weights);
        
        _logger.LogInformation("📈 Calculated engagement scores for {Count} items", engagementResponse.TotalItems);

        // Update project with scores if requested and applicable
        if (config.ApplyScores && engagementResponse.Project != null)
        {
            await _githubProjectsService.UpdateProjectWithScoresAsync(config, engagementResponse);
        }

        // Save engagement response to file
        var responseFile = Path.Combine(config.TempDir, "engagement-response.json");
        Directory.CreateDirectory(Path.GetDirectoryName(responseFile)!);
        await File.WriteAllTextAsync(responseFile, JsonSerializer.Serialize(engagementResponse, new JsonSerializerOptions { WriteIndented = true }));

        _logger.LogInformation("💾 Engagement response saved to: {ResponseFile}", responseFile);
        return responseFile;
    }

    private async Task<EngagementResponse> CalculateEngagementScoresAsync(EngagementWorkflowConfig config, ConfigFileEngagementWeights weights)
    {
        if (config.ProjectNumber.HasValue && config.ProjectNumber > 0)
        {
            return await CalculateProjectEngagementScoresAsync(config, weights);
        }
        else if (config.IssueNumber.HasValue && config.IssueNumber > 0)
        {
            return await CalculateIssueEngagementScoresAsync(config, weights);
        }
        else
        {
            throw new ArgumentException("Either project number or issue number must be specified for engagement scoring");
        }
    }

    private async Task<EngagementResponse> CalculateIssueEngagementScoresAsync(EngagementWorkflowConfig config, ConfigFileEngagementWeights weights)
    {
        var issueNumber = config.IssueNumber!.Value;
        _logger.LogInformation("📊 Calculating engagement score for issue #{IssueNumber}", issueNumber);

        // Get issue details
        var issueDetails = await _githubIssuesService.GetIssueDetailsAsync(config.RepoOwner, config.RepoName, issueNumber);
        
        // Create engagement weights from config
        var engagementWeights = new EngagementWeights
        {
            Comments = weights.Comments,
            Reactions = weights.Reactions,
            Contributors = weights.Contributors,
            LastActivity = weights.LastActivity,
            IssueAge = weights.IssueAge,
            LinkedPullRequests = weights.LinkedPullRequests
        };

        // Create engagement item
        var item = CreateEngagementItem(issueDetails, null, engagementWeights);

        return new EngagementResponse
        {
            Items = new List<EngagementItem> { item },
            TotalItems = 1
        };
    }

    private async Task<EngagementResponse> CalculateProjectEngagementScoresAsync(EngagementWorkflowConfig config, ConfigFileEngagementWeights weights)
    {
        var projectNumber = config.ProjectNumber!.Value;
        _logger.LogInformation("📊 Calculating engagement scores for project #{ProjectNumber}", projectNumber);

        // Get project details
        var project = await _githubProjectsService.GetProjectDetailsAsync(config.RepoOwner, config.RepoName, projectNumber);
        
        if (project == null || project.Items.Count == 0)
        {
            _logger.LogWarning("⚠️ No project items found for project #{ProjectNumber}", projectNumber);
            return new EngagementResponse
            {
                Items = new List<EngagementItem>(),
                TotalItems = 0
            };
        }

        _logger.LogInformation("📋 Found {ItemCount} items in project #{ProjectNumber}", project.Items.Count, projectNumber);

        // Create engagement weights from config
        var engagementWeights = new EngagementWeights
        {
            Comments = weights.Comments,
            Reactions = weights.Reactions,
            Contributors = weights.Contributors,
            LastActivity = weights.LastActivity,
            IssueAge = weights.IssueAge,
            LinkedPullRequests = weights.LinkedPullRequests
        };

        var items = new List<EngagementItem>();

        // Process each project item
        foreach (var projectItem in project.Items)
        {
            try
            {
                _logger.LogDebug("📊 Processing project item: Issue #{IssueNumber}", projectItem.Content.Number);

                // Get detailed issue information
                var issueDetails = await _githubIssuesService.GetIssueDetailsAsync(
                    projectItem.Content.Owner, 
                    projectItem.Content.Repo, 
                    projectItem.Content.Number);

                // Create engagement item
                var item = CreateEngagementItem(issueDetails, projectItem.Id, engagementWeights);
                items.Add(item);

                _logger.LogDebug("📈 Issue #{IssueNumber} scored {Score} (previous: {PreviousScore})", 
                    issueDetails.Number, item.Engagement.Score, item.Engagement.PreviousScore);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to process project item {ItemId} (Issue #{IssueNumber}): {Message}", 
                    projectItem.Id, projectItem.Content.Number, ex.Message);
                
                // Continue with other items even if one fails
                continue;
            }
        }

        return new EngagementResponse
        {
            Items = items,
            TotalItems = items.Count,
            Project = new Project
            {
                Id = project.Id,
                Owner = project.Owner,
                Number = project.Number
            }
        };
    }

    private EngagementItem CreateEngagementItem(IssueDetails issueDetails, string? projectItemId, EngagementWeights weights)
    {
        // Calculate current score
        var currentScore = _issueDetailsService.CalculateScore(issueDetails, weights);
        
        // Calculate historical score (7 days ago)
        var previousScore = _issueDetailsService.CalculateHistoricalScore(issueDetails, weights);

        // Determine classification
        EngagementClassification? classification = null;
        if (currentScore > previousScore)
        {
            classification = EngagementClassification.Hot;
            _logger.LogDebug("🔥 Issue #{IssueNumber} classified as Hot (score increased from {Previous} to {Current})", 
                issueDetails.Number, previousScore, currentScore);
        }

        var item = new EngagementItem
        {
            Id = projectItemId,
            Issue = new Issue
            {
                Id = issueDetails.Id,
                Owner = issueDetails.Owner,
                Repo = issueDetails.Repo,
                Number = issueDetails.Number
            },
            Engagement = new EngagementInfo
            {
                Score = currentScore,
                PreviousScore = previousScore,
                Classification = classification
            }
        };

        return item;
    }
}