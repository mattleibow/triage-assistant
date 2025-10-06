using TriageAssistant.Core.Models.Triage;

namespace TriageAssistant.Core.Services.Triage;

/// <summary>
/// Service for AI-powered triage operations
/// </summary>
public interface ITriageService
{
    /// <summary>
    /// Runs label selection for an issue using AI
    /// </summary>
    /// <param name="config">Label selection configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Path to the response file</returns>
    Task<string> SelectLabelsAsync(LabelSelectionConfig config, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generates a summary of triage results
    /// </summary>
    /// <param name="config">Summary generation configuration</param>
    /// <param name="mergedResponseFile">Path to merged response file</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Path to the summary file</returns>
    Task<string> GenerateSummaryAsync(SummaryConfig config, string mergedResponseFile, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Merges multiple response files into a single response
    /// </summary>
    /// <param name="responsesDir">Directory containing response files</param>
    /// <param name="outputPath">Output path for merged response</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The merged triage response</returns>
    Task<TriageResponse> MergeResponsesAsync(string responsesDir, string outputPath, CancellationToken cancellationToken = default);
}

/// <summary>
/// Configuration for label selection
/// </summary>
public class LabelSelectionConfig
{
    /// <summary>
    /// Template to use (multi-label, single-label, regression, missing-info)
    /// </summary>
    public string Template { get; set; } = string.Empty;
    
    /// <summary>
    /// Repository owner and name
    /// </summary>
    public string Repository { get; set; } = string.Empty;
    
    /// <summary>
    /// Issue number to analyze
    /// </summary>
    public int IssueNumber { get; set; }
    
    /// <summary>
    /// Label prefix to filter available labels
    /// </summary>
    public string LabelPrefix { get; set; } = string.Empty;
    
    /// <summary>
    /// Specific label to match
    /// </summary>
    public string Label { get; set; } = string.Empty;
    
    /// <summary>
    /// GitHub token for API access
    /// </summary>
    public string Token { get; set; } = string.Empty;
    
    /// <summary>
    /// AI endpoint for inference
    /// </summary>
    public string AiEndpoint { get; set; } = string.Empty;
    
    /// <summary>
    /// AI model to use
    /// </summary>
    public string AiModel { get; set; } = string.Empty;
    
    /// <summary>
    /// AI token for inference
    /// </summary>
    public string AiToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Temporary directory for files
    /// </summary>
    public string TempDir { get; set; } = string.Empty;
    
    /// <summary>
    /// Maximum tokens for AI response
    /// </summary>
    public int MaxTokens { get; set; } = 200;
}

/// <summary>
/// Configuration for summary generation
/// </summary>
public class SummaryConfig
{
    /// <summary>
    /// Repository owner and name
    /// </summary>
    public string Repository { get; set; } = string.Empty;
    
    /// <summary>
    /// Issue number being summarized
    /// </summary>
    public int IssueNumber { get; set; }
    
    /// <summary>
    /// GitHub token for API access
    /// </summary>
    public string Token { get; set; } = string.Empty;
    
    /// <summary>
    /// AI endpoint for inference
    /// </summary>
    public string AiEndpoint { get; set; } = string.Empty;
    
    /// <summary>
    /// AI model to use
    /// </summary>
    public string AiModel { get; set; } = string.Empty;
    
    /// <summary>
    /// AI token for inference
    /// </summary>
    public string AiToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Temporary directory for files
    /// </summary>
    public string TempDir { get; set; } = string.Empty;
    
    /// <summary>
    /// Maximum tokens for AI response
    /// </summary>
    public int MaxTokens { get; set; } = 500;
}