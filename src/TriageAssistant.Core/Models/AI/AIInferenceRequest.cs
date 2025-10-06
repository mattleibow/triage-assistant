namespace TriageAssistant.Core.Models.AI;

/// <summary>
/// Represents a request for AI inference
/// </summary>
public class AIInferenceRequest
{
    /// <summary>
    /// System prompt that provides context and instructions
    /// </summary>
    public string SystemPrompt { get; set; } = string.Empty;
    
    /// <summary>
    /// User prompt containing the specific content to analyze
    /// </summary>
    public string UserPrompt { get; set; } = string.Empty;
    
    /// <summary>
    /// Maximum number of tokens for the response
    /// </summary>
    public int MaxTokens { get; set; } = 200;
    
    /// <summary>
    /// AI model to use for inference
    /// </summary>
    public string Model { get; set; } = string.Empty;
}