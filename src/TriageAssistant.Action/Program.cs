using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.CommandLine;
using TriageAssistant.Action.Services;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Services;
using TriageAssistant.Core.Services.AI;
using TriageAssistant.Core.Services.Prompts;
using TriageAssistant.Core.Services.Triage;
using TriageAssistant.Core.Services.Workflows;
using TriageAssistant.GitHub.Services;

namespace TriageAssistant.Action;

/// <summary>
/// Main entry point for the Triage Assistant GitHub Action
/// </summary>
public class Program
{
    public static async Task<int> Main(string[] args)
    {
        try
        {
            var builder = Host.CreateApplicationBuilder(args);
            
            // Configure logging
            builder.Logging.ClearProviders();
            builder.Logging.AddConsole();
            
            // Register services
            RegisterServices(builder.Services);
            
            var host = builder.Build();
            
            // Create and run the command line interface
            var rootCommand = CreateRootCommand(host.Services);
            return await rootCommand.InvokeAsync(args);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Fatal error: {ex.Message}");
            Console.Error.WriteLine(ex.StackTrace);
            return 1;
        }
    }
    
    private static void RegisterServices(IServiceCollection services)
    {
        // Core services
        services.AddSingleton<IConfigurationService, ConfigurationService>();
        
        // Register EngagementWeights with default values (will be overridden by configuration)
        services.AddSingleton<EngagementWeights>(_ => new EngagementWeights());
        services.AddSingleton<EngagementScoringService>();
        
        // AI services
        services.AddSingleton<IPromptService, PromptService>();
        services.AddSingleton<ITriageService, TriageService>();
        services.AddSingleton<ITriageWorkflowService, TriageWorkflowService>();
        
        // GitHub services
        services.AddSingleton<IGitHubIssueService, GitHubIssueService>();
        services.AddSingleton<IGitHubProjectsService, GitHubProjectsService>();
        services.AddSingleton<EngagementWorkflowService>();
        
        // Action-specific services
        services.AddSingleton<IWorkflowOrchestrator, WorkflowOrchestrator>();
        services.AddSingleton<IActionInputService, ActionInputService>();
        services.AddSingleton<IActionOutputService, ActionOutputService>();
    }
    
    private static RootCommand CreateRootCommand(IServiceProvider serviceProvider)
    {
        var rootCommand = new RootCommand("AI Triage Assistant - GitHub Action for automated issue triage and engagement scoring");
        
        // Add mode option
        var modeOption = new Option<string>(
            name: "--mode",
            description: "Operation mode: apply-labels or engagement-score",
            getDefaultValue: () => "apply-labels");
        
        // Add all GitHub Action inputs as options
        var tokenOption = new Option<string>("--token", "GitHub token for API access");
        var fallbackTokenOption = new Option<string>("--fallback-token", "Fallback GitHub token");
        var aiEndpointOption = new Option<string>("--ai-endpoint", "AI inference endpoint");
        var aiModelOption = new Option<string>("--ai-model", "AI model to use");
        var aiTokenOption = new Option<string>("--ai-token", "AI inference token");
        var issueOption = new Option<int?>("--issue", "Issue number to process");
        var issueQueryOption = new Option<string>("--issue-query", "GitHub search query for issues");
        var projectOption = new Option<int?>("--project", "Project number for engagement scoring");
        var projectColumnOption = new Option<string>("--project-column", "Project column to update");
        var applyScoresOption = new Option<bool>("--apply-scores", "Apply engagement scores to project");
        var applyLabelsOption = new Option<bool>("--apply-labels", "Apply labels to issues");
        var applyCommentOption = new Option<bool>("--apply-comment", "Apply comments to issues");
        var commentFooterOption = new Option<string>("--comment-footer", "Comment footer text");
        var dryRunOption = new Option<bool>("--dry-run", "Run in dry-run mode");
        
        rootCommand.AddOption(modeOption);
        rootCommand.AddOption(tokenOption);
        rootCommand.AddOption(fallbackTokenOption);
        rootCommand.AddOption(aiEndpointOption);
        rootCommand.AddOption(aiModelOption);
        rootCommand.AddOption(aiTokenOption);
        rootCommand.AddOption(issueOption);
        rootCommand.AddOption(issueQueryOption);
        rootCommand.AddOption(projectOption);
        rootCommand.AddOption(projectColumnOption);
        rootCommand.AddOption(applyScoresOption);
        rootCommand.AddOption(applyLabelsOption);
        rootCommand.AddOption(applyCommentOption);
        rootCommand.AddOption(commentFooterOption);
        rootCommand.AddOption(dryRunOption);
        
        rootCommand.SetHandler(async () =>
        {
            var orchestrator = serviceProvider.GetRequiredService<IWorkflowOrchestrator>();
            var inputService = serviceProvider.GetRequiredService<IActionInputService>();
            
            // Parse inputs from environment variables (GitHub Actions style)
            var inputs = inputService.ParseInputs();
            
            // Run the appropriate workflow
            await orchestrator.RunWorkflowAsync(inputs);
        });
        
        return rootCommand;
    }
}