using System;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace TriageAssistant.Core.Utils;

/// <summary>
/// Enum for triage modes
/// </summary>
public enum TriageMode
{
    ApplyLabels,
    EngagementScore
}

/// <summary>
/// Utility class for validation and sanitization operations
/// </summary>
public static class ValidationUtils
{
    private const int MaxCommentLength = 65536; // GitHub's comment limit

    /// <summary>
    /// Validates and sanitizes numeric input
    /// </summary>
    /// <param name="input">Raw string input</param>
    /// <param name="fieldName">Field name for error messages</param>
    /// <param name="logger">Logger for warnings</param>
    /// <returns>Validated number or 0 if invalid</returns>
    public static int ValidateNumericInput(string? input, string fieldName, ILogger? logger = null)
    {
        if (string.IsNullOrWhiteSpace(input)) 
            return 0;
            
        if (int.TryParse(input, out var num) && num >= 0)
        {
            return num;
        }
        
        logger?.LogWarning("Invalid {FieldName}: {Input}. Using 0 as fallback", fieldName, input);
        return 0;
    }

    /// <summary>
    /// Validates and sanitizes optional numeric input
    /// </summary>
    /// <param name="input">Raw string input</param>
    /// <param name="fieldName">Field name for error messages</param>
    /// <param name="logger">Logger for warnings</param>
    /// <returns>Validated number or null if invalid or empty</returns>
    public static int? ValidateOptionalNumericInput(string? input, string fieldName, ILogger? logger = null)
    {
        if (string.IsNullOrWhiteSpace(input)) 
            return null;
            
        if (int.TryParse(input, out var num) && num >= 0)
        {
            return num;
        }
        
        logger?.LogWarning("Invalid {FieldName}: {Input}. Ignoring invalid value", fieldName, input);
        return null;
    }

    /// <summary>
    /// Validates repository identifier format
    /// </summary>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    public static void ValidateRepositoryId(string owner, string repo)
    {
        var validPattern = new Regex(@"^[a-zA-Z0-9._-]+$");
        if (string.IsNullOrEmpty(owner) || string.IsNullOrEmpty(repo) || 
            !validPattern.IsMatch(owner) || !validPattern.IsMatch(repo))
        {
            throw new ArgumentException($"Invalid repository identifier: {owner}/{repo}");
        }
    }

    /// <summary>
    /// Validates the triage mode
    /// </summary>
    /// <param name="mode">The triage mode to validate</param>
    /// <returns>The validated triage mode</returns>
    public static TriageMode ValidateMode(string mode)
    {
        return mode.ToLowerInvariant() switch
        {
            "apply-labels" => TriageMode.ApplyLabels,
            "engagement-score" => TriageMode.EngagementScore,
            _ => throw new ArgumentException($"Invalid mode: {mode}. Allowed values: apply-labels, engagement-score")
        };
    }

    /// <summary>
    /// Sanitizes content for safe logging by truncating and removing potential sensitive data
    /// </summary>
    /// <param name="content">Content to sanitize</param>
    /// <param name="maxLength">Maximum length for logged content</param>
    /// <returns>Sanitized content safe for logging</returns>
    public static string SanitizeForLogging(string content, int maxLength = 200)
    {
        // Remove potential tokens, keys, secrets (basic patterns)
        var sensitivePatterns = new[]
        {
            new Regex(@"(?:token|key|secret|password)[\s:=]+[a-zA-Z0-9+/=_-]{20,}", RegexOptions.IgnoreCase),
            new Regex(@"ghp_[a-zA-Z0-9]{36}"), // GitHub personal access tokens
            new Regex(@"github_pat_[a-zA-Z0-9_]{82}") // GitHub fine-grained tokens
        };

        var sanitized = content;
        foreach (var pattern in sensitivePatterns)
        {
            sanitized = pattern.Replace(sanitized, "[REDACTED]");
        }

        // Truncate for logging
        if (sanitized.Length > maxLength && maxLength > 0)
        {
            sanitized = sanitized[..maxLength] + "...[truncated]";
        }

        return sanitized;
    }

    /// <summary>
    /// Sanitizes markdown content to prevent injection attacks
    /// </summary>
    /// <param name="content">Markdown content to sanitize</param>
    /// <returns>Sanitized markdown content</returns>
    public static string SanitizeMarkdownContent(string content)
    {
        if (string.IsNullOrEmpty(content))
            return string.Empty;

        // Remove script tags and potentially dangerous HTML
        var scriptPattern = new Regex(@"<script[^>]*>.*?</script>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        var htmlPattern = new Regex(@"<(?!/?(?:b|i|em|strong|code|pre|blockquote|ul|ol|li|a|h[1-6]|p|br)\b)[^>]*>", RegexOptions.IgnoreCase);
        
        var sanitized = scriptPattern.Replace(content, "");
        sanitized = htmlPattern.Replace(sanitized, "");

        // Limit total length to GitHub's comment limit
        if (sanitized.Length > MaxCommentLength)
        {
            sanitized = sanitized[..(MaxCommentLength - 100)] + "\n\n_[Content truncated due to length limits]_";
        }

        return sanitized;
    }
}