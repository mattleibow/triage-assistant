using System.Text.Json.Serialization;

namespace TriageAssistant.Core.Models.Configuration;

/// <summary>
/// Configuration interface for a single label group
/// </summary>
public class ConfigFileLabelGroup
{
    /// <summary>
    /// Label prefix for searching (e.g., 'area-', 'platform-')
    /// </summary>
    [JsonPropertyName("labelPrefix")]
    public string LabelPrefix { get; set; } = string.Empty;
    
    /// <summary>
    /// Template to use for this label group
    /// </summary>
    [JsonPropertyName("template")]
    public string Template { get; set; } = string.Empty;
    
    /// <summary>
    /// Specific label to use (for regression type)
    /// </summary>
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;
}

/// <summary>
/// Configuration interface for batch label processing
/// </summary>
public class ConfigFileLabels
{
    /// <summary>
    /// Dictionary of label groups
    /// </summary>
    [JsonPropertyName("groups")]
    public Dictionary<string, ConfigFileLabelGroup> Groups { get; set; } = new();
}

/// <summary>
/// Configuration interface for the .triagerc.yml file labels section
/// </summary>
public class LabelsConfig
{
    /// <summary>
    /// Labels configuration
    /// </summary>
    [JsonPropertyName("labels")]
    public ConfigFileLabels Labels { get; set; } = new();
}