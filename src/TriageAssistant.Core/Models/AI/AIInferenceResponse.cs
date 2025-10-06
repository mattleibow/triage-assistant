namespace TriageAssistant.Core.Models.AI;

/// <summary>
/// Represents a response from AI inference
/// </summary>
public class AIInferenceResponse
{
    /// <summary>
    /// The AI-generated content
    /// </summary>
    public string Content { get; set; } = string.Empty;
    
    /// <summary>
    /// Token usage statistics
    /// </summary>
    public TokenUsage? Usage { get; set; }
    
    /// <summary>
    /// Model used for the inference
    /// </summary>
    public string Model { get; set; } = string.Empty;
}

/// <summary>
/// Token usage statistics
/// </summary>
public class TokenUsage
{
    /// <summary>
    /// Number of tokens in the prompt
    /// </summary>
    public int PromptTokens { get; set; }
    
    /// <summary>
    /// Number of tokens in the response
    /// </summary>
    public int CompletionTokens { get; set; }
    
    /// <summary>
    /// Total tokens used
    /// </summary>
    public int TotalTokens { get; set; }
}