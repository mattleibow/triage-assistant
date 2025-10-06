using Xunit;
using FluentAssertions;
using TriageAssistant.Core.Utilities;

namespace TriageAssistant.Core.Tests;

public class ContentSanitizationTests
{
    [Fact]
    public void SanitizeForLogging_WithTokenPatterns_RedactsTokens()
    {
        // Arrange (using a simpler but valid pattern)
        var testContent = "Here is a token: ghp_somevalidtokenvalue123456789012345678901234567890 and a secret: sk_test_123456789012345678901234567890123456";

        // Act
        var sanitized = ContentSanitizer.SanitizeForLogging(testContent);

        // Assert
        sanitized.Should().Contain("[REDACTED]");
        sanitized.Should().NotContain("ghp_somevalidtokenvalue123456789012345678901234567890");
        sanitized.Should().NotContain("sk_test_123456789012345678901234567890123456");
    }

    [Fact]
    public void SanitizeForLogging_WithLongContent_TruncatesContent()
    {
        // Arrange
        var longContent = new string('A', 1000);
        const int maxLength = 200;

        // Act
        var truncated = ContentSanitizer.SanitizeForLogging(longContent, maxLength);

        // Assert
        truncated.Length.Should().BeLessOrEqualTo(maxLength + 15); // +15 for "[truncated]"
        truncated.Should().Contain("[truncated]");
    }

    [Fact]
    public void SanitizeMarkdownContent_WithDangerousScriptTags_RemovesScripts()
    {
        // Arrange
        var maliciousContent = "Hello <script>alert(\"xss\")</script> world";

        // Act
        var sanitized = ContentSanitizer.SanitizeMarkdownContent(maliciousContent);

        // Assert
        sanitized.Should().NotContain("<script>");
        sanitized.Should().Contain("[REMOVED: Script tag]");
        sanitized.Should().Be("Hello [REMOVED: Script tag] world");
    }

    [Fact]
    public void SanitizeMarkdownContent_WithDangerousHtmlElements_RemovesElements()
    {
        // Arrange
        var maliciousContent = "Hello <iframe src=\"evil.com\"></iframe> and <form><input type=\"password\"></form>";

        // Act
        var sanitized = ContentSanitizer.SanitizeMarkdownContent(maliciousContent);

        // Assert
        sanitized.Should().NotContain("<iframe>");
        sanitized.Should().NotContain("<form>");
        sanitized.Should().NotContain("<input>");
        sanitized.Should().Contain("[REMOVED: Potentially dangerous HTML]");
        sanitized.Should().Be("Hello [REMOVED: Potentially dangerous HTML] and [REMOVED: Potentially dangerous HTML]");
    }

    [Fact]
    public void SanitizeMarkdownContent_WithExcessiveLength_TruncatesContent()
    {
        // Arrange
        var veryLongContent = new string('A', ContentSanitizer.MAX_COMMENT_LENGTH + 1000);

        // Act
        var limited = ContentSanitizer.SanitizeMarkdownContent(veryLongContent);

        // Assert
        limited.Length.Should().BeLessOrEqualTo(ContentSanitizer.MAX_COMMENT_LENGTH);
        limited.Should().Contain("[Content truncated for safety]");
    }

    [Fact]
    public void SanitizeMarkdownContent_WithSafeMarkdown_PreservesContent()
    {
        // Arrange
        var safeMarkdown = "# Hello\n\n**Bold text** and *italic* and `code`\n\n- List item";

        // Act
        var sanitized = ContentSanitizer.SanitizeMarkdownContent(safeMarkdown);

        // Assert
        sanitized.Should().Be(safeMarkdown); // Should be unchanged
    }

    [Fact]
    public void SubstituteTemplateVariables_WithSpecialRegexCharacters_HandlesCorrectly()
    {
        // Arrange
        var maliciousKey = ".*+?^${}()|[]\\dangerous";
        var template = $"Hello {{{{{maliciousKey}}}}} world";
        var replacements = new Dictionary<string, string> { [maliciousKey] = "SAFE_VALUE" };

        // Act
        var startTime = DateTime.UtcNow;
        var result = ContentSanitizer.SubstituteTemplateVariables(template, replacements);
        var endTime = DateTime.UtcNow;

        // Assert
        (endTime - startTime).Should().BeLessThan(TimeSpan.FromMilliseconds(100)); // Should complete quickly
        result.Should().Be("Hello SAFE_VALUE world");
    }

    [Fact]
    public void SubstituteTemplateVariables_WithNestedBraces_HandlesCorrectly()
    {
        // Arrange
        var nestedBraces = "{{{{{{{{nested}}}}}}}}";
        var template = $"Content with {nestedBraces}";
        var replacements = new Dictionary<string, string> { ["nested"] = "value" };

        // Act
        var startTime = DateTime.UtcNow;
        var result = ContentSanitizer.SubstituteTemplateVariables(template, replacements);
        var endTime = DateTime.UtcNow;

        // Assert
        (endTime - startTime).Should().BeLessThan(TimeSpan.FromMilliseconds(100));
        result.Should().Be("Content with {{{{{{value}}}}}}");
    }

    [Fact]
    public void SubstituteTemplateVariables_WithMultipleVariables_ReplacesCorrectly()
    {
        // Arrange
        var template = "Hello {{name}}, your issue is {{status}}";
        var replacements = new Dictionary<string, string> 
        { 
            ["name"] = "John", 
            ["status"] = "open" 
        };

        // Act
        var result = ContentSanitizer.SubstituteTemplateVariables(template, replacements);

        // Assert
        result.Should().Be("Hello John, your issue is open");
    }

    [Fact]
    public void SubstituteTemplateVariables_WithNullOrEmptyTemplate_ReturnsOriginal()
    {
        // Arrange
        var replacements = new Dictionary<string, string> { ["test"] = "value" };

        // Act & Assert
        ContentSanitizer.SubstituteTemplateVariables(null, replacements).Should().BeNull();
        ContentSanitizer.SubstituteTemplateVariables("", replacements).Should().Be("");
    }

    [Fact]
    public void SubstituteTemplateVariables_WithNullReplacements_ReturnsOriginal()
    {
        // Arrange
        var template = "Hello {{name}}";

        // Act
        var result = ContentSanitizer.SubstituteTemplateVariables(template, null);

        // Assert
        result.Should().Be(template);
    }
}