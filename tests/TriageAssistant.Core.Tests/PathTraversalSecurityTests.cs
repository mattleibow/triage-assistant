using Xunit;
using FluentAssertions;
using TriageAssistant.Core.Utilities;

namespace TriageAssistant.Core.Tests;

public class PathTraversalSecurityTests
{
    [Theory]
    [InlineData("../../../etc/passwd")]
    [InlineData("..\\..\\..\\windows\\system32")]
    [InlineData("/etc/passwd")]
    [InlineData("C:\\Windows\\System32")]
    public void SafePath_WithDangerousPaths_ThrowsException(string dangerousPath)
    {
        // Arrange & Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => 
            InputValidator.SafePath("/workspace", dangerousPath));
        
        exception.Message.Should().Contain("Invalid path");
    }

    [Theory]
    [InlineData(".triagerc.yml")]
    [InlineData("config/settings.yml")]
    [InlineData("subdir/file.txt")]
    public void SafePath_WithSafePaths_DoesNotThrow(string safePath)
    {
        // Arrange & Act & Assert
        var exception = Record.Exception(() => 
            InputValidator.SafePath("/workspace", safePath));
        
        exception.Should().BeNull();
    }
}