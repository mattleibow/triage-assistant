using System.Text.Json.Serialization;

namespace TriageAssistant.Core.Models;

/// <summary>
/// Classification for engagement levels
/// </summary>
public enum EngagementClassification
{
    Hot
}

/// <summary>
/// Engagement information for an issue
/// </summary>
public class EngagementInfo
{
    [JsonPropertyName("score")]
    public int Score { get; set; }

    [JsonPropertyName("previousScore")]
    public int PreviousScore { get; set; }

    [JsonPropertyName("classification")]
    public EngagementClassification? Classification { get; set; }
}

/// <summary>
/// Engagement item representing an issue with its engagement data
/// </summary>
public class EngagementItem
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("issue")]
    public Issue Issue { get; set; } = new();

    [JsonPropertyName("engagement")]
    public EngagementInfo Engagement { get; set; } = new();
}

/// <summary>
/// Complete engagement scoring response
/// </summary>
public class EngagementResponse
{
    [JsonPropertyName("items")]
    public List<EngagementItem> Items { get; set; } = new();

    [JsonPropertyName("totalItems")]
    public int TotalItems { get; set; }

    [JsonPropertyName("project")]
    public Project? Project { get; set; }
}