using System.Text.Json.Serialization;

namespace TriageAssistant.Core.Models.Triage;

/// <summary>
/// Represents the complete response from an AI triage operation
/// </summary>
public class TriageResponse
{
    /// <summary>
    /// Labels selected by the AI
    /// </summary>
    [JsonPropertyName("labels")]
    public List<LabelResponse> Labels { get; set; } = new();
    
    /// <summary>
    /// General remarks from the AI
    /// </summary>
    [JsonPropertyName("remarks")]
    public List<string> Remarks { get; set; } = new();
    
    /// <summary>
    /// Regression-related information
    /// </summary>
    [JsonPropertyName("regression")]
    public RegressionResponse? Regression { get; set; }
    
    /// <summary>
    /// Reproduction information
    /// </summary>
    [JsonPropertyName("repro")]
    public ReproResponse? Repro { get; set; }
}

/// <summary>
/// Represents a label selected by the AI
/// </summary>
public class LabelResponse
{
    /// <summary>
    /// Name of the label
    /// </summary>
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;
    
    /// <summary>
    /// Reason for selecting this label
    /// </summary>
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Represents regression analysis results
/// </summary>
public class RegressionResponse
{
    /// <summary>
    /// Whether this is likely a regression
    /// </summary>
    [JsonPropertyName("isRegression")]
    public bool IsRegression { get; set; }
    
    /// <summary>
    /// Confidence level (0-1)
    /// </summary>
    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }
    
    /// <summary>
    /// Reason for the regression assessment
    /// </summary>
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Represents reproduction information
/// </summary>
public class ReproResponse
{
    /// <summary>
    /// Whether reproduction steps are provided
    /// </summary>
    [JsonPropertyName("hasRepro")]
    public bool HasRepro { get; set; }
    
    /// <summary>
    /// Quality assessment of reproduction steps
    /// </summary>
    [JsonPropertyName("quality")]
    public string Quality { get; set; } = string.Empty;
    
    /// <summary>
    /// Reason for the reproduction assessment
    /// </summary>
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}