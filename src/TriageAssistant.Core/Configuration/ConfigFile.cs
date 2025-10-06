using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace TriageAssistant.Core.Configuration;

/// <summary>
/// Configuration interface for engagement scoring weights
/// </summary>
public class ConfigFileEngagementWeights
{
    [YamlMember(Alias = "comments")]
    [JsonPropertyName("comments")]
    public double Comments { get; set; } = 3;

    [YamlMember(Alias = "reactions")]
    [JsonPropertyName("reactions")]
    public double Reactions { get; set; } = 1;

    [YamlMember(Alias = "contributors")]
    [JsonPropertyName("contributors")]
    public double Contributors { get; set; } = 4;

    [YamlMember(Alias = "lastActivity")]
    [JsonPropertyName("lastActivity")]
    public double LastActivity { get; set; } = 1;

    [YamlMember(Alias = "issueAge")]
    [JsonPropertyName("issueAge")]
    public double IssueAge { get; set; } = 1;

    [YamlMember(Alias = "linkedPullRequests")]
    [JsonPropertyName("linkedPullRequests")]
    public double LinkedPullRequests { get; set; } = 2;
}

/// <summary>
/// Configuration interface for engagement scoring
/// </summary>
public class ConfigFileEngagement
{
    [YamlMember(Alias = "weights")]
    [JsonPropertyName("weights")]
    public ConfigFileEngagementWeights Weights { get; set; } = new();
}

/// <summary>
/// Configuration interface for a single label group
/// </summary>
public class ConfigFileLabelGroup
{
    /// <summary>
    /// Label prefix for searching (e.g., 'area-', 'platform-')
    /// </summary>
    [YamlMember(Alias = "labelPrefix")]
    [JsonPropertyName("labelPrefix")]
    public string? LabelPrefix { get; set; }

    /// <summary>
    /// Template to use for this label group
    /// </summary>
    [YamlMember(Alias = "template")]
    [JsonPropertyName("template")]
    public string Template { get; set; } = string.Empty;

    /// <summary>
    /// Specific label to use (for regression type)
    /// </summary>
    [YamlMember(Alias = "label")]
    [JsonPropertyName("label")]
    public string? Label { get; set; }
}

/// <summary>
/// Configuration interface for batch label processing
/// </summary>
public class ConfigFileLabels
{
    [YamlMember(Alias = "groups")]
    [JsonPropertyName("groups")]
    public Dictionary<string, ConfigFileLabelGroup> Groups { get; set; } = new();
}

/// <summary>
/// Configuration interface for the .triagerc.yml file
/// </summary>
public class ConfigFile
{
    [YamlMember(Alias = "engagement")]
    [JsonPropertyName("engagement")]
    public ConfigFileEngagement Engagement { get; set; } = new();

    [YamlMember(Alias = "labels")]
    [JsonPropertyName("labels")]
    public ConfigFileLabels Labels { get; set; } = new();
}