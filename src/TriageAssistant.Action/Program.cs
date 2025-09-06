using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Utils;
using TriageAssistant.Core.GitHub;
using TriageAssistant.Core.Models;

namespace TriageAssistant.Action;

/// <summary>
/// Main entry point for the Triage Assistant GitHub Action
/// </summary>
public class Program
{
    public static async Task<int> Main(string[] args)
    {
        // Set up dependency injection and logging
        var services = new ServiceCollection();
        services.AddLogging(builder => builder.AddConsole());
        services.AddTransient<IIssueDetailsService, IssueDetailsService>();
        
        var serviceProvider = services.BuildServiceProvider();
        var logger = serviceProvider.GetRequiredService<ILogger<Program>>();

        try
        {
            logger.LogInformation("🚀 Starting Triage Assistant (C# Version)");

            // Parse command line arguments or environment variables
            var mode = GetEnvironmentVariable("INPUT_MODE", "apply-labels");
            var triageMode = TriageUtils.ValidateMode(mode);

            logger.LogInformation("Operating in mode: {Mode}", triageMode.GetDescription());

            // Create basic configuration from environment
            var config = CreateConfigurationFromEnvironment();

            // Route to appropriate workflow based on mode
            switch (triageMode)
            {
                case TriageMode.ApplyLabels:
                    await RunLabelTriageWorkflow(config, serviceProvider, logger);
                    break;
                    
                case TriageMode.EngagementScore:
                    await RunEngagementScoringWorkflow(config, serviceProvider, logger);
                    break;
                    
                default:
                    throw new NotSupportedException($"Unsupported triage mode: {triageMode}");
            }

            logger.LogInformation("✅ Triage Assistant completed successfully");
            return 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "❌ Triage Assistant failed: {Message}", ex.Message);
            return 1;
        }
    }

    private static async Task RunLabelTriageWorkflow(EverythingConfig config, ServiceProvider serviceProvider, ILogger logger)
    {
        logger.LogInformation("🏷️  Running label triage workflow");
        
        // TODO: Implement label triage workflow
        if (config.DryRun)
        {
            logger.LogInformation("🔍 Dry run: Would process issue #{IssueNumber} in {Repository}", 
                config.IssueNumber, config.Repository);
        }
        else
        {
            logger.LogInformation("📝 Processing issue #{IssueNumber} in {Repository}", 
                config.IssueNumber, config.Repository);
        }
        
        await Task.CompletedTask;
    }

    private static async Task RunEngagementScoringWorkflow(EverythingConfig config, ServiceProvider serviceProvider, ILogger logger)
    {
        logger.LogInformation("📊 Running engagement scoring workflow");
        
        var issueDetailsService = serviceProvider.GetRequiredService<IIssueDetailsService>();
        
        // Demo the engagement scoring system
        if (config.IssueNumber.HasValue)
        {
            logger.LogInformation("📈 Calculating engagement score for issue #{IssueNumber}", config.IssueNumber);
            
            // Create a sample issue for demonstration
            var sampleIssue = CreateSampleIssue(config.IssueNumber.Value);
            var weights = new EngagementWeights();
            
            var score = issueDetailsService.CalculateScore(sampleIssue, weights);
            var historicalScore = issueDetailsService.CalculateHistoricalScore(sampleIssue, weights);
            
            logger.LogInformation("📊 Current engagement score: {Score}", score);
            logger.LogInformation("📉 Historical engagement score: {HistoricalScore}", historicalScore);
            
            if (config.DryRun)
            {
                logger.LogInformation("🔍 Dry run: Would update project with engagement score");
            }
            else
            {
                logger.LogInformation("💾 Would update project column '{Column}' with score {Score}", 
                    config.ProjectColumn, score);
            }
        }
        
        await Task.CompletedTask;
    }

    private static EverythingConfig CreateConfigurationFromEnvironment()
    {
        var config = new EverythingConfig
        {
            // Basic configuration
            DryRun = GetEnvironmentVariable("INPUT_DRY_RUN", "false").ToLowerInvariant() == "true",
            TempDir = GetEnvironmentVariable("RUNNER_TEMP", Path.GetTempPath()),
            
            // Repository information
            RepoOwner = GetEnvironmentVariable("GITHUB_REPOSITORY_OWNER", ""),
            RepoName = GetEnvironmentVariable("GITHUB_REPOSITORY", "").Split('/').LastOrDefault() ?? "",
            Repository = GetEnvironmentVariable("GITHUB_REPOSITORY", ""),
            
            // Issue information
            IssueNumber = ParseOptionalInt(GetEnvironmentVariable("INPUT_ISSUE", "")),
            
            // Project information
            ProjectNumber = ParseOptionalInt(GetEnvironmentVariable("INPUT_PROJECT", "")),
            ProjectColumn = GetEnvironmentVariable("INPUT_PROJECT_COLUMN", "Engagement Score"),
            ApplyScores = GetEnvironmentVariable("INPUT_APPLY_SCORES", "false").ToLowerInvariant() == "true",
            
            // Labels and comments
            ApplyLabels = GetEnvironmentVariable("INPUT_APPLY_LABELS", "false").ToLowerInvariant() == "true",
            ApplyComment = GetEnvironmentVariable("INPUT_APPLY_COMMENT", "false").ToLowerInvariant() == "true",
            CommentFooter = GetEnvironmentVariable("INPUT_COMMENT_FOOTER", ""),
            
            // AI configuration
            AiEndpoint = GetEnvironmentVariable("INPUT_AI_ENDPOINT", "https://models.github.ai/inference"),
            AiModel = GetEnvironmentVariable("INPUT_AI_MODEL", "openai/gpt-4o"),
            AiToken = GetEnvironmentVariable("INPUT_AI_TOKEN", GetEnvironmentVariable("GITHUB_TOKEN", "")),
            
            // GitHub token
            Token = GetEnvironmentVariable("INPUT_TOKEN", GetEnvironmentVariable("GITHUB_TOKEN", ""))
        };

        return config;
    }

    private static string GetEnvironmentVariable(string name, string defaultValue)
    {
        return Environment.GetEnvironmentVariable(name) ?? defaultValue;
    }

    private static int? ParseOptionalInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
            
        return int.TryParse(value, out var result) ? result : null;
    }

    private static IssueDetails CreateSampleIssue(int issueNumber)
    {
        // Create a sample issue for demonstration
        return new IssueDetails
        {
            Id = issueNumber.ToString(),
            Owner = "example",
            Repo = "repo", 
            Number = issueNumber,
            Title = $"Sample Issue #{issueNumber}",
            Body = "This is a sample issue for testing engagement scoring.",
            State = "open",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1),
            User = new UserInfo { Login = "user1", Type = "User" },
            Assignees = new List<UserInfo> 
            { 
                new() { Login = "assignee1", Type = "User" } 
            },
            Comments = new List<CommentData>
            {
                new() 
                { 
                    User = new UserInfo { Login = "commenter1", Type = "User" },
                    CreatedAt = DateTime.UtcNow.AddDays(-5),
                    Reactions = new List<ReactionData>()
                },
                new() 
                { 
                    User = new UserInfo { Login = "commenter2", Type = "User" },
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    Reactions = new List<ReactionData>()
                }
            },
            Reactions = new List<ReactionData>
            {
                new() 
                { 
                    User = new UserInfo { Login = "reactor1", Type = "User" },
                    Reaction = "👍",
                    CreatedAt = DateTime.UtcNow.AddDays(-3)
                }
            }
        };
    }
}
