using System.Text.Json;
using Microsoft.Extensions.Logging;
using TriageAssistant.Core.Models.AI;
using TriageAssistant.Core.Models.Triage;
using TriageAssistant.Core.Services.AI;
using TriageAssistant.Core.Services.Prompts;

namespace TriageAssistant.Core.Services.Triage;

/// <summary>
/// Implementation of triage service using AI inference
/// </summary>
public class TriageService : ITriageService
{
    private readonly ILogger<TriageService> _logger;
    private readonly IAIInferenceService _aiService;
    private readonly IPromptService _promptService;
    
    public TriageService(
        ILogger<TriageService> logger,
        IAIInferenceService aiService,
        IPromptService promptService)
    {
        _logger = logger;
        _aiService = aiService;
        _promptService = promptService;
    }
    
    /// <inheritdoc />
    public async Task<string> SelectLabelsAsync(LabelSelectionConfig config, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting label selection for issue #{IssueNumber} with template {Template}", 
            config.IssueNumber, config.Template);
        
        var guid = Guid.NewGuid().ToString();
        var promptDir = Path.Combine(config.TempDir, "triage-labels", "prompts", guid);
        var responseDir = Path.Combine(config.TempDir, "triage-assistant", "responses");
        
        // Ensure directories exist
        Directory.CreateDirectory(promptDir);
        Directory.CreateDirectory(responseDir);
        
        // Generate system prompt
        var systemPromptPath = Path.Combine(promptDir, "system-prompt.md");
        await GeneratePromptFileAsync(config.Template, config, systemPromptPath, cancellationToken);
        
        // Generate user prompt
        var userPromptPath = Path.Combine(promptDir, "user-prompt.md");
        await GeneratePromptFileAsync("user", config, userPromptPath, cancellationToken);
        
        // Run AI inference
        var systemPrompt = await File.ReadAllTextAsync(systemPromptPath, cancellationToken);
        var userPrompt = await File.ReadAllTextAsync(userPromptPath, cancellationToken);
        
        var aiRequest = new AIInferenceRequest
        {
            SystemPrompt = systemPrompt,
            UserPrompt = userPrompt,
            MaxTokens = config.MaxTokens,
            Model = config.AiModel
        };
        
        var responseFile = Path.Combine(responseDir, $"response-{guid}.json");
        
        try
        {
            var aiResponse = await _aiService.RunInferenceAsync(aiRequest, cancellationToken);
            
            // Write response to file
            await File.WriteAllTextAsync(responseFile, aiResponse.Content, cancellationToken);
            
            _logger.LogInformation("Label selection completed. Response written to: {ResponseFile}", responseFile);
            _logger.LogDebug("AI response content: {Content}", SanitizeForLogging(aiResponse.Content));
            
            return responseFile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Label selection failed: {Message}", ex.Message);
            throw;
        }
    }
    
    /// <inheritdoc />
    public async Task<string> GenerateSummaryAsync(SummaryConfig config, string mergedResponseFile, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Generating summary for issue #{IssueNumber}", config.IssueNumber);
        
        var summaryDir = Path.Combine(config.TempDir, "triage-apply", "prompts");
        var summaryResponseFile = Path.Combine(config.TempDir, "triage-apply", "responses", "response.md");
        
        // Ensure directories exist
        Directory.CreateDirectory(summaryDir);
        Directory.CreateDirectory(Path.GetDirectoryName(summaryResponseFile)!);
        
        // Generate system prompt
        var systemPromptPath = Path.Combine(summaryDir, "system-prompt.md");
        await GenerateSummaryPromptFileAsync("system", systemPromptPath, config, mergedResponseFile, cancellationToken);
        
        // Generate user prompt
        var userPromptPath = Path.Combine(summaryDir, "user-prompt.md");
        await GenerateSummaryPromptFileAsync("user", userPromptPath, config, mergedResponseFile, cancellationToken);
        
        // Run AI inference
        var systemPrompt = await File.ReadAllTextAsync(systemPromptPath, cancellationToken);
        var userPrompt = await File.ReadAllTextAsync(userPromptPath, cancellationToken);
        
        var aiRequest = new AIInferenceRequest
        {
            SystemPrompt = systemPrompt,
            UserPrompt = userPrompt,
            MaxTokens = config.MaxTokens,
            Model = config.AiModel
        };
        
        try
        {
            var aiResponse = await _aiService.RunInferenceAsync(aiRequest, cancellationToken);
            
            // Write response to file
            await File.WriteAllTextAsync(summaryResponseFile, aiResponse.Content, cancellationToken);
            
            _logger.LogInformation("Summary generation completed. Response written to: {ResponseFile}", summaryResponseFile);
            
            return summaryResponseFile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Summary generation failed: {Message}", ex.Message);
            throw;
        }
    }
    
    /// <inheritdoc />
    public async Task<TriageResponse> MergeResponsesAsync(string responsesDir, string outputPath, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Merging response files from directory: {ResponsesDir}", responsesDir);
        
        var allFiles = new List<string>();
        
        // Process all JSON files from responses directory
        if (Directory.Exists(responsesDir))
        {
            var files = Directory.GetFiles(responsesDir, "*.json")
                .Select(Path.GetFullPath)
                .ToList();
            allFiles.AddRange(files);
        }
        
        if (allFiles.Count == 0)
        {
            throw new InvalidOperationException("No input files found for merging responses");
        }
        
        _logger.LogInformation("Merging {Count} files: {Files}", allFiles.Count, string.Join(", ", allFiles));
        
        var merged = new TriageResponse
        {
            Remarks = new List<string>(),
            Labels = new List<LabelResponse>()
        };
        
        foreach (var file in allFiles)
        {
            try
            {
                _logger.LogInformation("Processing file: {File}", file);
                
                // Read and parse the JSON file
                var fileContents = await GetFileContentsAsync(file, cancellationToken);
                var json = JsonSerializer.Deserialize<TriageResponse>(fileContents, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (json != null)
                {
                    // Merge the JSON data
                    merged.Labels.AddRange(json.Labels);
                    merged.Remarks.AddRange(json.Remarks);
                    
                    if (json.Regression != null)
                        merged.Regression = json.Regression;
                        
                    if (json.Repro != null)
                        merged.Repro = json.Repro;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read or parse file: {File}", file);
            }
        }
        
        // Write merged response
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        var mergedJson = JsonSerializer.Serialize(merged, jsonOptions);
        await File.WriteAllTextAsync(outputPath, mergedJson, cancellationToken);
        
        _logger.LogInformation("Merged response written to: {OutputPath}", outputPath);
        
        return merged;
    }
    
    /// <summary>
    /// Generates a prompt file for label selection
    /// </summary>
    private async Task GeneratePromptFileAsync(string template, LabelSelectionConfig config, string outputPath, CancellationToken cancellationToken)
    {
        var templateContent = _promptService.GetTemplate(template);
        var variables = new Dictionary<string, object>
        {
            ["ISSUE_NUMBER"] = config.IssueNumber,
            ["ISSUE_REPO"] = config.Repository,
            ["LABEL_PREFIX"] = config.LabelPrefix,
            ["LABEL"] = config.Label
        };
        
        var prompt = await _promptService.GeneratePromptAsync(templateContent, variables, config.Token, cancellationToken);
        await File.WriteAllTextAsync(outputPath, prompt, cancellationToken);
        
        _logger.LogDebug("Generated prompt file: {FilePath}", outputPath);
    }
    
    /// <summary>
    /// Generates a prompt file for summary generation
    /// </summary>
    private async Task GenerateSummaryPromptFileAsync(string template, string outputPath, SummaryConfig config, string mergedResponseFile, CancellationToken cancellationToken)
    {
        var templateContent = _promptService.GetTemplate($"summary-{template}");
        var variables = new Dictionary<string, object>
        {
            ["ISSUE_NUMBER"] = config.IssueNumber.ToString(),
            ["ISSUE_REPO"] = config.Repository,
            ["MERGED_JSON"] = mergedResponseFile
        };
        
        var prompt = await _promptService.GeneratePromptAsync(templateContent, variables, config.Token, cancellationToken);
        await File.WriteAllTextAsync(outputPath, prompt, cancellationToken);
        
        _logger.LogDebug("Generated summary prompt file: {FilePath}", outputPath);
    }
    
    /// <summary>
    /// Helper function to read file contents and remove wrapping code blocks if present
    /// </summary>
    private static async Task<string> GetFileContentsAsync(string file, CancellationToken cancellationToken = default)
    {
        var fileContents = await File.ReadAllTextAsync(file, cancellationToken);
        
        // Break file contents into lines
        var lines = fileContents.Split('\n');
        
        // Remove wrapping code blocks if present
        if (lines.Length > 0 && lines[0].Trim().StartsWith("```"))
        {
            lines = lines[1..];
        }
        
        if (lines.Length > 0 && lines[^1].Trim().StartsWith("```"))
        {
            lines = lines[..^1];
        }
        
        // Combine lines back into a single string
        return string.Join('\n', lines);
    }
    
    /// <summary>
    /// Sanitizes content for logging by truncating if too long
    /// </summary>
    private static string SanitizeForLogging(string content, int maxLength = 500)
    {
        if (string.IsNullOrEmpty(content))
            return content;
            
        if (content.Length <= maxLength)
            return content;
            
        return content[..maxLength] + "... (truncated)";
    }
}