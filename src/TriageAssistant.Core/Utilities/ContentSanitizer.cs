using System.Text.RegularExpressions;

namespace TriageAssistant.Core.Utilities;

public static class ContentSanitizer
{
    public const int MAX_COMMENT_LENGTH = 65536; // GitHub's comment limit

    private static readonly Regex TokenPattern = new(@"(ghp_[a-zA-Z0-9]{36}|sk_[a-zA-Z0-9_-]+)", RegexOptions.Compiled);
    private static readonly Regex DangerousHtmlPattern = new(@"<(script|iframe|form|input|object|embed|link|meta)[^>]*>.*?</\1>|<(script|iframe|form|input|object|embed|link|meta)[^>]*/>", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex ScriptTagPattern = new(@"<script[^>]*>.*?</script>", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static string SanitizeForLogging(string content, int maxLength = 500)
    {
        if (string.IsNullOrEmpty(content))
        {
            return content;
        }

        // Remove potential tokens
        var sanitized = TokenPattern.Replace(content, "[REDACTED]");

        // Truncate if too long
        if (sanitized.Length > maxLength)
        {
            sanitized = sanitized[..maxLength] + "[truncated]";
        }

        return sanitized;
    }

    public static string SanitizeMarkdownContent(string content)
    {
        if (string.IsNullOrEmpty(content))
        {
            return content;
        }

        // Remove dangerous script tags first
        var sanitized = ScriptTagPattern.Replace(content, "[REMOVED: Script tag]");

        // Remove other dangerous HTML elements
        sanitized = DangerousHtmlPattern.Replace(sanitized, "[REMOVED: Potentially dangerous HTML]");

        // Enforce GitHub comment length limits
        if (sanitized.Length > MAX_COMMENT_LENGTH)
        {
            sanitized = sanitized[..(MAX_COMMENT_LENGTH - 50)] + "\n\n[Content truncated for safety]";
        }

        return sanitized;
    }

    public static string SubstituteTemplateVariables(string template, Dictionary<string, string> replacements)
    {
        if (string.IsNullOrEmpty(template) || replacements == null || !replacements.Any())
        {
            return template;
        }

        var result = template;

        foreach (var kvp in replacements)
        {
            if (string.IsNullOrEmpty(kvp.Key))
            {
                continue;
            }

            // Escape special regex characters in the key to prevent ReDoS
            var escapedKey = Regex.Escape(kvp.Key);
            var pattern = $@"\{{\{{\s*{escapedKey}\s*\}}\}}";

            try
            {
                // Use a timeout to prevent ReDoS attacks
                var regex = new Regex(pattern, RegexOptions.None, TimeSpan.FromMilliseconds(100));
                result = regex.Replace(result, kvp.Value ?? string.Empty);
            }
            catch (RegexMatchTimeoutException)
            {
                // If regex times out, just continue without replacement
                Console.WriteLine($"Warning: Template variable replacement timed out for key: {kvp.Key}");
                continue;
            }
        }

        return result;
    }
}