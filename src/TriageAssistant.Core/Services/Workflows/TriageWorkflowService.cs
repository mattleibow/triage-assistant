using System.Text.Json;
using Microsoft.Extensions.Logging;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models.Triage;
using TriageAssistant.Core.Services.Triage;

namespace TriageAssistant.Core.Services.Workflows;

/// <summary>
/// Implementation of triage workflow service
/// </summary>
public class TriageWorkflowService : ITriageWorkflowService
{
    private readonly ILogger<TriageWorkflowService> _logger;
    private readonly ITriageService _triageService;
    
    public TriageWorkflowService(
        ILogger<TriageWorkflowService> logger,
        ITriageService triageService)
    {
        _logger = logger;
        _triageService = triageService;
    }
    
    /// <inheritdoc />
    public async Task<string> RunSingleIssueTriageWorkflowAsync(SingleIssueTriageConfig config, LabelsConfiguration labelsConfig, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Running single issue triage workflow for issue #{IssueNumber}", config.IssueNumber);
        
        var shouldAddLabels = labelsConfig.Groups.Count > 0;
        var shouldAddSummary = config.ApplyLabels || config.ApplyComment;
        
        if (!shouldAddLabels && !shouldAddSummary)
        {
            _logger.LogWarning("No label groups configured and no apply actions requested. Nothing to do.");
            return await CreateEmptyResponseFileAsync(config.TempDir);
        }
        
        try
        {
            // TODO: Add eyes reaction at the start (requires GitHub service integration)
            
            // Step 1: Select labels for each group
            if (shouldAddLabels)
            {
                await ProcessLabelGroupsAsync(config, labelsConfig, cancellationToken);
            }
            
            // Step 2: Apply labels and comment if requested
            string responseFile = "";
            if (shouldAddSummary)
            {
                var applyConfig = new ApplyTriageConfig
                {
                    Repository = config.Repository,
                    IssueNumber = config.IssueNumber,
                    Token = config.Token,
                    AiEndpoint = config.AiEndpoint,
                    AiModel = config.AiModel,
                    AiToken = config.AiToken,
                    ApplyLabels = config.ApplyLabels,
                    ApplyComment = config.ApplyComment,
                    CommentFooter = config.CommentFooter,
                    TempDir = config.TempDir,
                    DryRun = config.DryRun
                };
                
                responseFile = await MergeAndApplyTriageAsync(applyConfig, cancellationToken);
            }
            
            // TODO: Remove eyes reaction at the end (requires GitHub service integration)
            
            return responseFile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Single issue triage workflow failed: {Message}", ex.Message);
            throw;
        }
    }
    
    /// <inheritdoc />
    public async Task<string> RunBulkTriageWorkflowAsync(BulkIssueTriageConfig config, LabelsConfiguration labelsConfig, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Running bulk triage workflow with query: {Query}", config.IssueQuery);
        
        // TODO: Search for issues using GitHub service (requires GitHub service integration)
        // For now, create a placeholder that shows the workflow structure
        
        var finalResponseFile = Path.Combine(config.TempDir, "triage-assistant", "bulk-responses.json");
        Directory.CreateDirectory(Path.GetDirectoryName(finalResponseFile)!);
        
        var bulkResults = new Dictionary<int, TriageResponse>();
        
        // For demonstration purposes, we'll process the single issue if provided
        if (config.IssueNumber > 0)
        {
            _logger.LogInformation("Processing issue #{IssueNumber} as part of bulk workflow", config.IssueNumber);
            
            try
            {
                var singleConfig = new SingleIssueTriageConfig
                {
                    Repository = config.Repository,
                    IssueNumber = config.IssueNumber,
                    Token = config.Token,
                    AiEndpoint = config.AiEndpoint,
                    AiModel = config.AiModel,
                    AiToken = config.AiToken,
                    ApplyLabels = config.ApplyLabels,
                    ApplyComment = config.ApplyComment,
                    CommentFooter = config.CommentFooter,
                    TempDir = Path.Combine(config.TempDir, $"item-{config.IssueNumber}"),
                    DryRun = config.DryRun
                };
                
                var responseFile = await RunSingleIssueTriageWorkflowAsync(singleConfig, labelsConfig, cancellationToken);
                
                if (!string.IsNullOrEmpty(responseFile) && File.Exists(responseFile))
                {
                    var responseContent = await File.ReadAllTextAsync(responseFile, cancellationToken);
                    var response = JsonSerializer.Deserialize<TriageResponse>(responseContent, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                    
                    if (response != null)
                    {
                        bulkResults[config.IssueNumber] = response;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process issue #{IssueNumber} in bulk workflow", config.IssueNumber);
            }
        }
        
        // Write final merged response
        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        var mergedJson = JsonSerializer.Serialize(bulkResults, jsonOptions);
        await File.WriteAllTextAsync(finalResponseFile, mergedJson, cancellationToken);
        
        _logger.LogInformation("Bulk triage complete. Processed {Count} items successfully", bulkResults.Count);
        
        return finalResponseFile;
    }
    
    /// <inheritdoc />
    public async Task<string> MergeAndApplyTriageAsync(ApplyTriageConfig config, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Merging responses and applying triage for issue #{IssueNumber}", config.IssueNumber);
        
        // Merge response JSON files
        var mergedResponseFile = Path.Combine(config.TempDir, "triage-assistant", "responses.json");
        var responsesDir = Path.Combine(config.TempDir, "triage-assistant", "responses");
        
        var mergedResponse = await _triageService.MergeResponsesAsync(responsesDir, mergedResponseFile, cancellationToken);
        
        // Log the merged response for debugging
        _logger.LogInformation("Merged response: {Response}", JsonSerializer.Serialize(mergedResponse, new JsonSerializerOptions { WriteIndented = true }));
        
        if (config.ApplyComment)
        {
            // Generate summary response using AI
            var summaryConfig = new SummaryConfig
            {
                Repository = config.Repository,
                IssueNumber = config.IssueNumber,
                Token = config.Token,
                AiEndpoint = config.AiEndpoint,
                AiModel = config.AiModel,
                AiToken = config.AiToken,
                TempDir = config.TempDir
            };
            
            var summaryResponseFile = await _triageService.GenerateSummaryAsync(summaryConfig, mergedResponseFile, cancellationToken);
            
            // TODO: Comment on the issue using GitHub service
            if (!config.DryRun)
            {
                _logger.LogInformation("Would comment on issue #{IssueNumber} with summary from {SummaryFile}", 
                    config.IssueNumber, summaryResponseFile);
            }
            else
            {
                _logger.LogInformation("Dry run: Would comment on issue #{IssueNumber} with summary from {SummaryFile}", 
                    config.IssueNumber, summaryResponseFile);
            }
        }
        
        if (config.ApplyLabels)
        {
            // Collect all the labels from the merged response
            var labels = mergedResponse.Labels?.Select(l => l.Label)?.Where(l => !string.IsNullOrEmpty(l))?.ToList() ?? new List<string>();
            
            if (labels.Count > 0)
            {
                // TODO: Apply labels to the issue using GitHub service
                if (!config.DryRun)
                {
                    _logger.LogInformation("Would apply labels to issue #{IssueNumber}: {Labels}", 
                        config.IssueNumber, string.Join(", ", labels));
                }
                else
                {
                    _logger.LogInformation("Dry run: Would apply labels to issue #{IssueNumber}: {Labels}", 
                        config.IssueNumber, string.Join(", ", labels));
                }
            }
            else
            {
                _logger.LogInformation("No labels to apply for issue #{IssueNumber}", config.IssueNumber);
            }
        }
        
        return mergedResponseFile;
    }
    
    /// <summary>
    /// Processes all label groups for an issue
    /// </summary>
    private async Task ProcessLabelGroupsAsync(SingleIssueTriageConfig config, LabelsConfiguration labelsConfig, CancellationToken cancellationToken)
    {
        foreach (var (groupName, groupConfig) in labelsConfig.Groups)
        {
            _logger.LogInformation("Selecting labels for group {GroupName} with template {Template}", 
                groupName, groupConfig.Template);
            
            var labelConfig = new LabelSelectionConfig
            {
                Template = groupConfig.Template,
                Repository = config.Repository,
                IssueNumber = config.IssueNumber,
                LabelPrefix = groupConfig.LabelPrefix ?? string.Empty,
                Label = groupConfig.Label ?? string.Empty,
                Token = config.Token,
                AiEndpoint = config.AiEndpoint,
                AiModel = config.AiModel,
                AiToken = config.AiToken,
                TempDir = config.TempDir
            };
            
            try
            {
                await _triageService.SelectLabelsAsync(labelConfig, cancellationToken);
                _logger.LogInformation("Successfully processed label group {GroupName}", groupName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process label group {GroupName}: {Message}", groupName, ex.Message);
                // Continue with other groups even if one fails
            }
        }
    }
    
    /// <summary>
    /// Creates an empty response file for cases where no processing is needed
    /// </summary>
    private static async Task<string> CreateEmptyResponseFileAsync(string tempDir)
    {
        var responseFile = Path.Combine(tempDir, "triage-assistant", "empty-response.json");
        Directory.CreateDirectory(Path.GetDirectoryName(responseFile)!);
        
        var emptyResponse = new TriageResponse();
        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        var json = JsonSerializer.Serialize(emptyResponse, jsonOptions);
        await File.WriteAllTextAsync(responseFile, json);
        
        return responseFile;
    }
}