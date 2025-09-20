using Xunit;
using FluentAssertions;
using TriageAssistant.Core.Utilities;

namespace TriageAssistant.Core.Tests;

public class InputValidationTests
{
    [Fact]
    public void ValidateRepositoryId_WithInvalidOwner_ThrowsException()
    {
        // Arrange & Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => 
            InputValidator.ValidateRepositoryId("../../../malicious", "repo"));
        
        exception.Message.Should().Contain("Invalid repository identifier");
    }

    [Fact]
    public void ValidateRepositoryId_WithInvalidRepo_ThrowsException()
    {
        // Arrange & Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => 
            InputValidator.ValidateRepositoryId("owner", "<script>alert(\"xss\")</script>"));
        
        exception.Message.Should().Contain("Invalid repository identifier");
    }

    [Fact]
    public void ValidateRepositoryId_WithValidIdentifiers_DoesNotThrow()
    {
        // Arrange & Act & Assert
        var exception = Record.Exception(() => 
            InputValidator.ValidateRepositoryId("valid-owner_123", "valid.repo-name"));
        
        exception.Should().BeNull();
    }

    [Fact]
    public void ValidateNumericInput_WithInvalidNumber_ReturnsZero()
    {
        // Arrange
        var originalOut = Console.Out;
        using var stringWriter = new StringWriter();
        Console.SetOut(stringWriter);

        try
        {
            // Act
            var result = InputValidator.ValidateNumericInput("invalid-number", "project number");

            // Assert
            result.Should().Be(0);
            stringWriter.ToString().Should().Contain("Invalid project number: invalid-number");
        }
        finally
        {
            Console.SetOut(originalOut);
        }
    }

    [Fact]
    public void ValidateNumericInput_WithNegativeNumber_ReturnsZero()
    {
        // Arrange
        var originalOut = Console.Out;
        using var stringWriter = new StringWriter();
        Console.SetOut(stringWriter);

        try
        {
            // Act
            var result = InputValidator.ValidateNumericInput("-123", "issue number");

            // Assert
            result.Should().Be(0);
            stringWriter.ToString().Should().Contain("Invalid issue number: -123");
        }
        finally
        {
            Console.SetOut(originalOut);
        }
    }

    [Fact]
    public void ValidateNumericInput_WithValidNumber_ReturnsNumber()
    {
        // Arrange & Act
        var result = InputValidator.ValidateNumericInput("123", "project number");

        // Assert
        result.Should().Be(123);
    }

    [Fact]
    public void ValidateMode_WithInvalidMode_ThrowsException()
    {
        // Arrange & Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => 
            InputValidator.ValidateMode("malicious-mode"));
        
        exception.Message.Should().Contain("Invalid mode: malicious-mode");
    }

    [Theory]
    [InlineData("apply-labels")]
    [InlineData("engagement-score")]
    public void ValidateMode_WithValidMode_DoesNotThrow(string mode)
    {
        // Arrange & Act & Assert
        var exception = Record.Exception(() => InputValidator.ValidateMode(mode));
        exception.Should().BeNull();
    }

    [Fact]
    public void SafePath_WithDirectoryTraversal_ThrowsException()
    {
        // Arrange & Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => 
            InputValidator.SafePath("/workspace", "../../../etc/passwd"));
        
        exception.Message.Should().Contain("Invalid path");
    }

    [Theory]
    [InlineData(".triagerc.yml")]
    [InlineData("subdir/.triagerc.yml")]
    [InlineData("valid-file.txt")]
    public void SafePath_WithValidRelativePath_DoesNotThrow(string relativePath)
    {
        // Arrange & Act & Assert
        var exception = Record.Exception(() => 
            InputValidator.SafePath("/workspace", relativePath));
        
        exception.Should().BeNull();
    }
}