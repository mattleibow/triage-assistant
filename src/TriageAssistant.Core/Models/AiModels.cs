using System.Text.Json.Serialization;

namespace TriageAssistant.Core.Models;

/// <summary>
/// AI inference request model
/// </summary>
public class AiInferenceRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("messages")]
    public List<AiMessage> Messages { get; set; } = new();

    [JsonPropertyName("temperature")]
    public double Temperature { get; set; } = 0.1;

    [JsonPropertyName("max_tokens")]
    public int MaxTokens { get; set; } = 1000;
}

/// <summary>
/// AI message model
/// </summary>
public class AiMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

/// <summary>
/// AI inference response model
/// </summary>
public class AiInferenceResponse
{
    [JsonPropertyName("choices")]
    public List<AiChoice> Choices { get; set; } = new();

    [JsonPropertyName("usage")]
    public AiUsage? Usage { get; set; }
}

/// <summary>
/// AI choice model
/// </summary>
public class AiChoice
{
    [JsonPropertyName("message")]
    public AiMessage Message { get; set; } = new();

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }
}

/// <summary>
/// AI usage statistics
/// </summary>
public class AiUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int PromptTokens { get; set; }

    [JsonPropertyName("completion_tokens")]
    public int CompletionTokens { get; set; }

    [JsonPropertyName("total_tokens")]
    public int TotalTokens { get; set; }
}

/// <summary>
/// Label suggestion from AI
/// </summary>
public class LabelSuggestion
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("reasoning")]
    public string? Reasoning { get; set; }
}

/// <summary>
/// Triage response model
/// </summary>
public class TriageResponse
{
    [JsonPropertyName("labels")]
    public List<LabelSuggestion> Labels { get; set; } = new();

    [JsonPropertyName("summary")]
    public string? Summary { get; set; }

    [JsonPropertyName("reasoning")]
    public string? Reasoning { get; set; }
}