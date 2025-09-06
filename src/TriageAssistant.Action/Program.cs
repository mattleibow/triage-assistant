using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Utils;
using TriageAssistant.Core.GitHub;
using TriageAssistant.Core.AI;
using TriageAssistant.Core.Prompts;
using TriageAssistant.Core.Workflows;
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
        
        // Register services
        services.AddSingleton<IConfigFileService, ConfigFileService>();
        services.AddSingleton<IIssueDetailsService, IssueDetailsService>();
        services.AddSingleton<IPromptService, PromptService>();
        services.AddHttpClient();
        
        // Register GitHub services - these require tokens so will be created per request
        services.AddTransient<IGitHubIssuesService>(provider =>
        {
            var logger = provider.GetRequiredService<ILogger<GitHubIssuesService>>();
            var token = GetEnvironmentVariable("INPUT_TOKEN", GetEnvironmentVariable("GITHUB_TOKEN", ""));
            return new GitHubIssuesService(token, logger);
        });
        
        services.AddTransient<IGitHubProjectsService>(provider =>
        {
            var logger = provider.GetRequiredService<ILogger<GitHubProjectsService>>();
            var token = GetEnvironmentVariable("INPUT_TOKEN", GetEnvironmentVariable("GITHUB_TOKEN", ""));
            return new GitHubProjectsService(token, logger);
        });

        services.AddTransient<IAiInferenceService>(provider =>
        {
            var httpClient = provider.GetRequiredService<HttpClient>();
            var logger = provider.GetRequiredService<ILogger<AiInferenceService>>();
            return new AiInferenceService(httpClient, logger);
        });
        
        services.AddTransient<ILabelTriageWorkflowService, LabelTriageWorkflowService>();
        services.AddTransient<IEngagementWorkflowService, EngagementWorkflowService>();
        
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
            
            // Load configuration file
            var configFileService = serviceProvider.GetRequiredService<IConfigFileService>();
            var configFile = await configFileService.LoadConfigFileAsync();

            // Route to appropriate workflow based on mode
            string responseFile = "";
            switch (triageMode)
            {
                case TriageMode.ApplyLabels:
                    responseFile = await RunLabelTriageWorkflowAsync(config, configFile, serviceProvider, logger);
                    break;
                    
                case TriageMode.EngagementScore:
                    responseFile = await RunEngagementScoringWorkflowAsync(config, configFile, serviceProvider, logger);
                    break;
                    
                default:
                    throw new NotSupportedException($"Unsupported triage mode: {triageMode}");
            }

            // Set the response file output for GitHub Actions
            if (!string.IsNullOrEmpty(responseFile))
            {
                Environment.SetEnvironmentVariable("GITHUB_OUTPUT", $"response-file={responseFile}");
                logger.LogInformation("📄 Response file output set: {ResponseFile}", responseFile);
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

    private static async Task<string> RunLabelTriageWorkflowAsync(
        EverythingConfig config, 
        ConfigFile configFile, 
        ServiceProvider serviceProvider, 
        ILogger logger)
    {
        logger.LogInformation("🏷️ Running label triage workflow");
        
        var workflowService = serviceProvider.GetRequiredService<ILabelTriageWorkflowService>();
        
        try
        {
            // Determine if this is single issue or bulk processing
            if (!string.IsNullOrEmpty(config.IssueQuery))
            {
                // Bulk processing
                var bulkConfig = new BulkLabelTriageWorkflowConfig
                {
                    Token = config.Token,
                    RepoOwner = config.RepoOwner,
                    RepoName = config.RepoName,
                    Repository = config.Repository,
                    IssueQuery = config.IssueQuery,
                    AiEndpoint = config.AiEndpoint,
                    AiModel = config.AiModel,
                    AiToken = config.AiToken,
                    ApplyLabels = config.ApplyLabels,
                    ApplyComment = config.ApplyComment,
                    CommentFooter = config.CommentFooter,
                    DryRun = config.DryRun,
                    TempDir = config.TempDir
                };
                
                return await workflowService.RunBulkTriageAsync(bulkConfig, configFile.Labels);
            }
            else if (config.IssueNumber.HasValue)
            {
                // Single issue processing
                var singleConfig = new LabelTriageWorkflowConfig
                {
                    Token = config.Token,
                    RepoOwner = config.RepoOwner,
                    RepoName = config.RepoName,
                    Repository = config.Repository,
                    IssueNumber = config.IssueNumber,
                    AiEndpoint = config.AiEndpoint,
                    AiModel = config.AiModel,
                    AiToken = config.AiToken,
                    ApplyLabels = config.ApplyLabels,
                    ApplyComment = config.ApplyComment,
                    CommentFooter = config.CommentFooter,
                    DryRun = config.DryRun,
                    TempDir = config.TempDir
                };
                
                return await workflowService.RunSingleIssueTriageAsync(singleConfig, configFile.Labels);
            }
            else
            {
                throw new ArgumentException("Either issue number or issue query must be provided for label triage");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "❌ Label triage workflow failed: {Message}", ex.Message);
            throw;
        }
    }

    private static async Task<string> RunEngagementScoringWorkflowAsync(
        EverythingConfig config, 
        ConfigFile configFile, 
        ServiceProvider serviceProvider, 
        ILogger logger)
    {
        logger.LogInformation("📊 Running engagement scoring workflow");
        
        var workflowService = serviceProvider.GetRequiredService<IEngagementWorkflowService>();
        
        try
        {
            var engagementConfig = new EngagementWorkflowConfig
            {
                Token = config.Token,
                RepoOwner = config.RepoOwner,
                RepoName = config.RepoName,
                IssueNumber = config.IssueNumber,
                ProjectNumber = config.ProjectNumber,
                ProjectColumn = config.ProjectColumn,
                ApplyScores = config.ApplyScores,
                DryRun = config.DryRun,
                TempDir = config.TempDir
            };

            return await workflowService.RunEngagementWorkflowAsync(engagementConfig, configFile.Engagement);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "❌ Engagement scoring workflow failed: {Message}", ex.Message);
            throw;
        }
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
            IssueQuery = GetEnvironmentVariable("INPUT_ISSUE_QUERY", ""),
            
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
}
