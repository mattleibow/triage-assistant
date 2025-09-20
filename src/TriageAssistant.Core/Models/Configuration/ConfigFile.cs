using System.Collections.Generic;
using YamlDotNet.Serialization;

namespace TriageAssistant.Core.Models.Configuration;

/// <summary>
/// Configuration interface for engagement scoring weights
/// </summary>
public class ConfigFileEngagementWeights
{
    [YamlMember(Alias = "comments")]
    public int Comments { get; set; } = 3;

    [YamlMember(Alias = "reactions")]
    public int Reactions { get; set; } = 1;

    [YamlMember(Alias = "contributors")]
    public int Contributors { get; set; } = 2;

    [YamlMember(Alias = "lastActivity")]
    public int LastActivity { get; set; } = 1;

    [YamlMember(Alias = "issueAge")]
    public int IssueAge { get; set; } = 1;

    [YamlMember(Alias = "linkedPullRequests")]
    public int LinkedPullRequests { get; set; } = 2;
}

/// <summary>
/// Configuration interface for batch engagement processing
/// </summary>
public class ConfigFileEngagement
{
    [YamlMember(Alias = "weights")]
    public ConfigFileEngagementWeights Weights { get; set; } = new();
}

/// <summary>
/// Configuration interface for a single label group
/// </summary>
public class ConfigFileLabelGroup
{
    /// <summary>Label prefix for searching (e.g., 'area-', 'platform-')</summary>
    [YamlMember(Alias = "labelPrefix")]
    public string? LabelPrefix { get; set; }

    /// <summary>Template to use for this label group</summary>
    [YamlMember(Alias = "template")]
    public required string Template { get; set; }

    /// <summary>Specific label to use (for regression type)</summary>
    [YamlMember(Alias = "label")]
    public string? Label { get; set; }
}

/// <summary>
/// Configuration interface for batch label processing
/// </summary>
public class ConfigFileLabels
{
    [YamlMember(Alias = "groups")]
    public Dictionary<string, ConfigFileLabelGroup> Groups { get; set; } = new();
}

/// <summary>
/// Configuration interface for the .triagerc.yml file
/// </summary>
public class ConfigFile
{
    [YamlMember(Alias = "engagement")]
    public ConfigFileEngagement Engagement { get; set; } = new();

    [YamlMember(Alias = "labels")]
    public ConfigFileLabels Labels { get; set; } = new();
}

/// <summary>
/// Default engagement weights that match the current hardcoded values
/// </summary>
public static class DefaultEngagementWeights
{
    public static readonly ConfigFileEngagementWeights Default = new()
    {
        Comments = 3,
        Reactions = 1,
        Contributors = 2,
        LastActivity = 1,
        IssueAge = 1,
        LinkedPullRequests = 2
    };
}