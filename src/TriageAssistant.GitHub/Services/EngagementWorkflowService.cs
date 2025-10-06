using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using TriageAssistant.Core.Services;
using TriageAssistant.GitHub.Services;
using System.Text.Json;

namespace TriageAssistant.GitHub.Services;

/// <summary>
/// Service for running the complete engagement scoring workflow
/// </summary>
public class EngagementWorkflowService
{
    private readonly IGitHubIssueService _issueService;
    private readonly IGitHubProjectsService _projectsService;
    private readonly EngagementScoringService _scoringService;

    public EngagementWorkflowService(
        IGitHubIssueService issueService,
        IGitHubProjectsService projectsService,
        EngagementScoringService scoringService)
    {
        _issueService = issueService;
        _projectsService = projectsService;
        _scoringService = scoringService;
    }

    /// <summary>
    /// Run the complete engagement scoring workflow
    /// </summary>
    /// <param name="config">The engagement workflow configuration</param>
    /// <param name="engagementConfig">The engagement scoring configuration</param>
    /// <returns>Path to the engagement response file</returns>
    public async Task<string> RunEngagementWorkflowAsync(
        EngagementWorkflowConfiguration config,
        EngagementConfiguration engagementConfig)
    {
        Console.WriteLine("Running in engagement scoring mode");

        var engagementResponse = await CalculateEngagementScoresAsync(config, engagementConfig);
        Console.WriteLine($"Calculated engagement scores for {engagementResponse.TotalItems} items");

        // Update project with scores if requested
        if (config.ApplyScores && config.ProjectNumber.HasValue)
        {
            await _projectsService.UpdateProjectWithScoresAsync(
                config.RepoOwner,
                config.ProjectNumber.Value,
                config.ProjectColumn,
                engagementResponse.Items,
                config.DryRun);
        }

        // Save engagement response to file
        var engagementFile = Path.Combine(config.TempDir, "engagement-response.json");
        var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
        var jsonContent = JsonSerializer.Serialize(engagementResponse, jsonOptions);
        await File.WriteAllTextAsync(engagementFile, jsonContent);

        return engagementFile;
    }

    /// <summary>
    /// Calculate engagement scores for issues in a project or single issue
    /// </summary>
    /// <param name="config">Configuration object containing project and authentication details</param>
    /// <param name="engagementConfig">Engagement scoring configuration</param>
    /// <returns>Engagement response with calculated scores</returns>
    private async Task<EngagementResponse> CalculateEngagementScoresAsync(
        EngagementWorkflowConfiguration config,
        EngagementConfiguration engagementConfig)
    {
        var items = new List<EngagementItem>();
        ProjectDetails? project = null;

        if (config.IssueNumber.HasValue)
        {
            // Single issue mode
            Console.WriteLine($"Calculating engagement score for issue #{config.IssueNumber}");
            
            var issue = await _issueService.GetIssueDetailsAsync(
                config.RepoOwner,
                config.RepoName,
                config.IssueNumber.Value);

            var engagementScore = _scoringService.GetEngagementScore(issue);
            
            items.Add(new EngagementItem
            {
                Issue = issue,
                Engagement = engagementScore
            });
        }
        else if (config.ProjectNumber.HasValue)
        {
            // Project mode
            Console.WriteLine($"Calculating engagement scores for project #{config.ProjectNumber}");
            
            project = await _projectsService.GetProjectDetailsAsync(
                config.RepoOwner,
                config.ProjectNumber.Value);

            Console.WriteLine($"Found project: {project.Title}");

            // For now, create some sample items since project integration is simplified
            // In full implementation, this would fetch all project items
            for (int i = 1; i <= 3; i++)
            {
                var issue = await _issueService.GetIssueDetailsAsync(
                    config.RepoOwner,
                    config.RepoName,
                    i); // Sample issue numbers

                var engagementScore = _scoringService.GetEngagementScore(issue);
                
                items.Add(new EngagementItem
                {
                    Id = $"project-item-{i}",
                    Issue = issue,
                    Engagement = engagementScore
                });
            }
        }
        else
        {
            throw new ArgumentException("Either IssueNumber or ProjectNumber must be specified");
        }

        // Sort by engagement score (highest first)
        items = items.OrderByDescending(item => item.Engagement.Score).ToList();

        // Log top engaged issues
        Console.WriteLine("Top engaged issues:");
        foreach (var item in items.Take(5))
        {
            var classification = item.Engagement.Classification?.ToString() ?? "Normal";
            Console.WriteLine($"  Issue #{item.Issue.Number}: {item.Engagement.Score:F2} ({classification})");
        }

        return new EngagementResponse
        {
            Project = project,
            Items = items,
            TotalItems = items.Count
        };
    }
}