using Microsoft.Extensions.Logging;
using TriageAssistant.Action.Models;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Services;
using TriageAssistant.Core.Services.AI;
using TriageAssistant.Core.Services.Workflows;
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
    private readonly ITriageWorkflowService _triageWorkflowService;
    private readonly IActionOutputService _outputService;
    private readonly IConfigurationService _configService;
    private readonly ILoggerFactory _loggerFactory;
    
    public WorkflowOrchestrator(
        ILogger<WorkflowOrchestrator> logger,
        EngagementWorkflowService engagementService,
        ITriageWorkflowService triageWorkflowService,
        IActionOutputService outputService,
        IConfigurationService configService,
        ILoggerFactory loggerFactory)
    {
        _logger = logger;
        _engagementService = engagementService;
        _triageWorkflowService = triageWorkflowService;
        _outputService = outputService;
        _configService = configService;
        _loggerFactory = loggerFactory;
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
        
        // Validate AI configuration
        if (string.IsNullOrEmpty(inputs.AiEndpoint) || string.IsNullOrEmpty(inputs.EffectiveAiToken))
        {
            throw new InvalidOperationException("AI endpoint and token are required for labeling workflow");
        }
        
        // Create AI service with actual configuration
        var aiService = new AzureAIInferenceService(
            _loggerFactory.CreateLogger<AzureAIInferenceService>(),
            inputs.AiEndpoint,
            inputs.EffectiveAiToken);
        
        if (!aiService.IsConfigured)
        {
            throw new InvalidOperationException("AI service is not properly configured");
        }
        
        // Load labels configuration
        var triageConfig = await _configService.LoadTriageConfigurationAsync();
        
        // Determine workflow type and run appropriate workflow
        if (!string.IsNullOrEmpty(inputs.IssueQuery))
        {
            // Bulk workflow
            var bulkConfig = new BulkIssueTriageConfig
            {
                Repository = inputs.Repository,
                IssueQuery = inputs.IssueQuery,
                RepoOwner = inputs.RepoOwner,
                RepoName = inputs.RepoName,
                IssueNumber = inputs.Issue ?? 0, // For demo purposes
                Token = inputs.EffectiveToken,
                AiEndpoint = inputs.AiEndpoint,
                AiModel = inputs.AiModel,
                AiToken = inputs.EffectiveAiToken,
                ApplyLabels = inputs.ApplyLabels,
                ApplyComment = inputs.ApplyComment,
                CommentFooter = inputs.CommentFooter,
                TempDir = inputs.TempDir,
                DryRun = inputs.DryRun
            };
            
            return await _triageWorkflowService.RunBulkTriageWorkflowAsync(bulkConfig, triageConfig.Labels);
        }
        else if (inputs.Issue.HasValue && inputs.Issue.Value > 0)
        {
            // Single issue workflow
            var singleConfig = new SingleIssueTriageConfig
            {
                Repository = inputs.Repository,
                IssueNumber = inputs.Issue.Value,
                Token = inputs.EffectiveToken,
                AiEndpoint = inputs.AiEndpoint,
                AiModel = inputs.AiModel,
                AiToken = inputs.EffectiveAiToken,
                ApplyLabels = inputs.ApplyLabels,
                ApplyComment = inputs.ApplyComment,
                CommentFooter = inputs.CommentFooter,
                TempDir = inputs.TempDir,
                DryRun = inputs.DryRun
            };
            
            return await _triageWorkflowService.RunSingleIssueTriageWorkflowAsync(singleConfig, triageConfig.Labels);
        }
        else
        {
            throw new InvalidOperationException("Either issue number or issue query must be provided for labeling workflow");
        }
    }
}