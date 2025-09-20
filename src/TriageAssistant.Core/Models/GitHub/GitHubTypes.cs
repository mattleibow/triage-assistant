using System;
using System.Collections.Generic;

namespace TriageAssistant.Core.Models.GitHub;

/// <summary>
/// Represents a GitHub Project
/// </summary>
public class Project
{
    public required string Id { get; set; }
    public required string Owner { get; set; }
    public required int Number { get; set; }
}

/// <summary>
/// Represents a GitHub Project with detailed information
/// </summary>
public class ProjectDetails : Project
{
    public List<ProjectItem> Items { get; set; } = new();
}

/// <summary>
/// Represents an item in a GitHub Project
/// </summary>
public class ProjectItem
{
    public required string Id { get; set; }
    public required string ProjectId { get; set; }
    public string? Type { get; set; }
    public required Issue Content { get; set; }
}

/// <summary>
/// Represents a GitHub Issue (basic information)
/// </summary>
public class Issue
{
    public required string Id { get; set; }
    public required string Owner { get; set; }
    public required string Repo { get; set; }
    public required int Number { get; set; }
}

/// <summary>
/// Represents a GitHub Issue with body content
/// </summary>
public class IssueBody : Issue
{
    public required string Title { get; set; }
    public required string Body { get; set; }
    public required string State { get; set; }
    public required DateTime CreatedAt { get; set; }
    public required DateTime UpdatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public required UserInfo User { get; set; }
    public List<UserInfo> Assignees { get; set; } = new();
}

/// <summary>
/// Represents a GitHub Issue with detailed comment and reaction information
/// </summary>
public class IssueDetails : IssueBody
{
    public List<CommentData> Comments { get; set; } = new();
    public List<ReactionData> Reactions { get; set; } = new();
}

/// <summary>
/// Represents a comment on a GitHub Issue
/// </summary>
public class CommentData
{
    public required UserInfo User { get; set; }
    public required DateTime CreatedAt { get; set; }
    public List<ReactionData> Reactions { get; set; } = new();
}

/// <summary>
/// Represents a reaction on a GitHub Issue or Comment
/// </summary>
public class ReactionData
{
    public required UserInfo User { get; set; }
    public required string Reaction { get; set; }
    public required DateTime CreatedAt { get; set; }
}

/// <summary>
/// Represents a GitHub User
/// </summary>
public class UserInfo
{
    public required string Login { get; set; }
    public required string Type { get; set; }
}