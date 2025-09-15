using Microsoft.Extensions.Logging;
using TriageAssistant.Action.Models;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Services;
using TriageAssistant.GitHub.Services;

namespace TriageAssistant.Action.Services;

/// <summary>
/// Service for orchestrating different workflow modes
/// </summary>
public interface IWorkflowOrchestrator
{
    /// <summary>
    /// Runs the appropriate workflow based on the provided inputs
    /// </summary>
    Task RunWorkflowAsync(ActionInputs inputs);
}

/// <summary>
/// Implementation of workflow orchestration service
/// </summary>
public class WorkflowOrchestrator : IWorkflowOrchestrator
{
    private readonly ILogger<WorkflowOrchestrator> _logger;
    private readonly EngagementWorkflowService _engagementService;
    private readonly IActionOutputService _outputService;
    private readonly IConfigurationService _configService;
    
    public WorkflowOrchestrator(
        ILogger<WorkflowOrchestrator> logger,
        EngagementWorkflowService engagementService,
        IActionOutputService outputService,
        IConfigurationService configService)
    {
        _logger = logger;
        _engagementService = engagementService;
        _outputService = outputService;
        _configService = configService;
    }
    
    public async Task RunWorkflowAsync(ActionInputs inputs)
    {
        try
        {
            _logger.LogInformation("Starting {Mode} workflow", inputs.Mode);
            
            if (inputs.DryRun)
            {
                _logger.LogInformation("Running in dry-run mode. No changes will be made.");
            }
            
            var responseFile = "";
            
            switch (inputs.Mode)
            {
                case TriageMode.EngagementScore:
                    responseFile = await RunEngagementScoringWorkflow(inputs);
                    break;
                    
                case TriageMode.ApplyLabels:
                    responseFile = await RunLabelingWorkflow(inputs);
                    break;
                    
                default:
                    throw new InvalidOperationException($"Unsupported mode: {inputs.Mode}");
            }
            
            // Set outputs
            _outputService.SetOutput("response-file", responseFile);
            
            _logger.LogInformation("Workflow completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Workflow failed: {Message}", ex.Message);
            
            // Set GitHub Actions failure status
            Environment.ExitCode = 1;
            throw;
        }
    }
    
    private async Task<string> RunEngagementScoringWorkflow(ActionInputs inputs)
    {
        _logger.LogInformation("Running engagement scoring workflow");
        
        // Convert action inputs to service inputs
        var workflowConfig = new EngagementWorkflowConfiguration
        {
            Token = inputs.EffectiveToken,
            RepoOwner = inputs.RepoOwner,
            RepoName = inputs.RepoName,
            ProjectNumber = inputs.Project,
            IssueNumber = inputs.Issue,
            ProjectColumn = inputs.ProjectColumn,
            ApplyScores = inputs.ApplyScores,
            DryRun = inputs.DryRun,
            TempDir = inputs.TempDir
        };
        
        // Load engagement configuration
        var engagementConfig = await _configService.LoadEngagementConfigurationAsync();
        
        var responseFile = await _engagementService.RunEngagementWorkflowAsync(workflowConfig, engagementConfig);
        return responseFile;
    }
    
    private async Task<string> RunLabelingWorkflow(ActionInputs inputs)
    {
        _logger.LogInformation("Running labeling workflow");
        
        // TODO: Implement AI-powered labeling workflow in Phase 5
        // For now, create a placeholder response file
        var responseFile = Path.Combine(inputs.TempDir, $"triage-response-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.json");
        
        var placeholderResponse = new
        {
            mode = "apply-labels",
            message = "Labeling workflow not yet implemented - will be completed in Phase 5",
            issue = inputs.Issue,
            issueQuery = inputs.IssueQuery,
            timestamp = DateTimeOffset.UtcNow.ToString("O")
        };
        
        #pragma warning disable IL2026 // Disable trimming warning for JSON serialization
        await File.WriteAllTextAsync(responseFile, System.Text.Json.JsonSerializer.Serialize(placeholderResponse, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
        #pragma warning restore IL2026
        
        _logger.LogWarning("Labeling workflow is not yet implemented. This will be completed in Phase 5 of the migration.");
        
        return responseFile;
    }
}