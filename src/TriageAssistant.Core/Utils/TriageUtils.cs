using System.ComponentModel;

namespace TriageAssistant.Core.Utils;

/// <summary>
/// Enumeration of supported triage modes
/// </summary>
public enum TriageMode
{
    [Description("apply-labels")]
    ApplyLabels,
    
    [Description("engagement-score")]
    EngagementScore
}

/// <summary>
/// Utility methods for the triage assistant
/// </summary>
public static class TriageUtils
{
    /// <summary>
    /// Validates that a numeric input is valid
    /// </summary>
    /// <param name="input">The input to validate</param>
    /// <param name="fieldName">The name of the field for error messages</param>
    /// <returns>The parsed integer</returns>
    /// <exception cref="ArgumentException">Thrown if input is invalid</exception>
    public static int ValidateNumericInput(string input, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            throw new ArgumentException($"{fieldName} is required");
        }
        
        if (!int.TryParse(input, out var result))
        {
            throw new ArgumentException($"{fieldName} must be a valid number");
        }
        
        if (result <= 0)
        {
            throw new ArgumentException($"{fieldName} must be a positive number");
        }
        
        return result;
    }
    
    /// <summary>
    /// Validates an optional numeric input
    /// </summary>
    /// <param name="input">The input to validate</param>
    /// <param name="fieldName">The name of the field for error messages</param>
    /// <returns>The parsed integer or null if input is empty</returns>
    /// <exception cref="ArgumentException">Thrown if input is invalid</exception>
    public static int? ValidateOptionalNumericInput(string? input, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return null;
        }
        
        return ValidateNumericInput(input, fieldName);
    }
    
    /// <summary>
    /// Validates repository identifier
    /// </summary>
    /// <param name="owner">Repository owner</param>
    /// <param name="repo">Repository name</param>
    /// <exception cref="ArgumentException">Thrown if parameters are invalid</exception>
    public static void ValidateRepositoryId(string owner, string repo)
    {
        if (string.IsNullOrWhiteSpace(owner))
        {
            throw new ArgumentException("Repository owner cannot be empty");
        }
        
        if (string.IsNullOrWhiteSpace(repo))
        {
            throw new ArgumentException("Repository name cannot be empty");
        }
    }
    
    /// <summary>
    /// Validates and parses a triage mode string
    /// </summary>
    /// <param name="mode">The mode string to parse</param>
    /// <returns>The parsed triage mode</returns>
    /// <exception cref="ArgumentException">Thrown if mode is invalid</exception>
    public static TriageMode ValidateMode(string mode)
    {
        return mode.ToLowerInvariant() switch
        {
            "apply-labels" => TriageMode.ApplyLabels,
            "engagement-score" => TriageMode.EngagementScore,
            _ => throw new ArgumentException($"Unsupported triage mode: {mode}")
        };
    }
    
    /// <summary>
    /// Sanitizes content for logging by truncating and removing sensitive information
    /// </summary>
    /// <param name="content">Content to sanitize</param>
    /// <param name="maxLength">Maximum length of output</param>
    /// <returns>Sanitized content</returns>
    public static string SanitizeForLogging(string content, int maxLength = 1000)
    {
        if (string.IsNullOrEmpty(content))
        {
            return string.Empty;
        }
        
        // Remove potential sensitive information
        var sanitized = content
            .Replace("\r\n", " ")
            .Replace("\n", " ")
            .Replace("\r", " ");
        
        // Truncate if necessary
        if (sanitized.Length > maxLength)
        {
            sanitized = sanitized[..maxLength] + "...";
        }
        
        return sanitized;
    }
    
    /// <summary>
    /// Gets the description attribute value from an enum
    /// </summary>
    /// <param name="value">The enum value</param>
    /// <returns>Description or string representation</returns>
    public static string GetDescription(this Enum value)
    {
        var field = value.GetType().GetField(value.ToString());
        if (field == null) return value.ToString();
        
        var attribute = (DescriptionAttribute?)Attribute.GetCustomAttribute(field, typeof(DescriptionAttribute));
        return attribute?.Description ?? value.ToString();
    }
}