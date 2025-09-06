using System.Text.Json.Serialization;

namespace TriageAssistant.Core.Models;

/// <summary>
/// Represents a GitHub project
/// </summary>
public class Project
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("owner")]
    public string Owner { get; set; } = string.Empty;
    
    [JsonPropertyName("number")]
    public int Number { get; set; }
}

/// <summary>
/// Extended project with items
/// </summary>
public class ProjectDetails : Project
{
    [JsonPropertyName("items")]
    public List<ProjectItem> Items { get; set; } = new();
}

/// <summary>
/// Represents a project item
/// </summary>
public class ProjectItem
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("projectId")]
    public string ProjectId { get; set; } = string.Empty;
    
    [JsonPropertyName("type")]
    public string? Type { get; set; }
    
    [JsonPropertyName("content")]
    public Issue Content { get; set; } = new();
}

/// <summary>
/// Basic issue information
/// </summary>
public class Issue
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("owner")]
    public string Owner { get; set; } = string.Empty;
    
    [JsonPropertyName("repo")]
    public string Repo { get; set; } = string.Empty;
    
    [JsonPropertyName("number")]
    public int Number { get; set; }
}

/// <summary>
/// Issue with body and metadata
/// </summary>
public class IssueBody : Issue
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;
    
    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;
    
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
    
    [JsonPropertyName("closedAt")]
    public DateTime? ClosedAt { get; set; }
    
    [JsonPropertyName("user")]
    public UserInfo User { get; set; } = new();
    
    [JsonPropertyName("assignees")]
    public List<UserInfo> Assignees { get; set; } = new();
}

/// <summary>
/// Complete issue details with comments and reactions
/// </summary>
public class IssueDetails : IssueBody
{
    [JsonPropertyName("comments")]
    public List<CommentData> Comments { get; set; } = new();
    
    [JsonPropertyName("reactions")]
    public List<ReactionData> Reactions { get; set; } = new();
}

/// <summary>
/// Comment data with reactions
/// </summary>
public class CommentData
{
    [JsonPropertyName("user")]
    public UserInfo User { get; set; } = new();
    
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("reactions")]
    public List<ReactionData> Reactions { get; set; } = new();
}

/// <summary>
/// Reaction data
/// </summary>
public class ReactionData
{
    [JsonPropertyName("user")]
    public UserInfo User { get; set; } = new();
    
    [JsonPropertyName("reaction")]
    public string Reaction { get; set; } = string.Empty;
    
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// User information
/// </summary>
public class UserInfo
{
    [JsonPropertyName("login")]
    public string Login { get; set; } = string.Empty;
    
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
}