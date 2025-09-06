using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using TriageAssistant.Core.Utils;
using TriageAssistant.Core.Prompts;
using TriageAssistant.Core.AI;
using Microsoft.Extensions.Logging;
using Moq;

namespace TriageAssistant.Tests;

public class TriageAssistantCoreTests
{
    [Fact]
    public void TriageUtils_ValidateMode_ShouldReturnCorrectModes()
    {
        // Arrange & Act & Assert
        Assert.Equal(TriageMode.ApplyLabels, TriageUtils.ValidateMode("apply-labels"));
        Assert.Equal(TriageMode.EngagementScore, TriageUtils.ValidateMode("engagement-score"));
        
        // Test case insensitivity  
        Assert.Equal(TriageMode.ApplyLabels, TriageUtils.ValidateMode("APPLY-LABELS"));
        
        // Test invalid mode throws exception
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateMode("invalid-mode"));
    }

    [Fact]
    public void TriageUtils_ValidateNumericInput_ShouldValidateCorrectly()
    {
        // Arrange & Act & Assert
        Assert.Equal(123, TriageUtils.ValidateNumericInput("123", "test field"));
        Assert.Equal(1, TriageUtils.ValidateNumericInput("1", "test field"));
        
        // Test validation errors
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateNumericInput("", "test field"));
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateNumericInput("abc", "test field"));
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateNumericInput("0", "test field"));
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateNumericInput("-1", "test field"));
    }

    [Fact]
    public void TriageUtils_ValidateOptionalNumericInput_ShouldHandleNullCorrectly()
    {
        // Arrange & Act & Assert
        Assert.Equal(123, TriageUtils.ValidateOptionalNumericInput("123", "test field"));
        Assert.Null(TriageUtils.ValidateOptionalNumericInput("", "test field"));
        Assert.Null(TriageUtils.ValidateOptionalNumericInput(null, "test field"));
        
        // Test validation errors
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateOptionalNumericInput("abc", "test field"));
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateOptionalNumericInput("0", "test field"));
    }

    [Fact]
    public void TriageUtils_ValidateRepositoryId_ShouldValidateCorrectly()
    {
        // Arrange & Act & Assert - should not throw
        TriageUtils.ValidateRepositoryId("owner", "repo");
        TriageUtils.ValidateRepositoryId("microsoft", "dotnet");
        
        // Test validation errors
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateRepositoryId("", "repo"));
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateRepositoryId("owner", ""));
        Assert.Throws<ArgumentException>(() => TriageUtils.ValidateRepositoryId("", ""));
    }

    [Fact]
    public async Task PromptService_GenerateSystemPromptAsync_ShouldReturnValidPrompts()
    {
        // Arrange
        var logger = new Mock<ILogger<PromptService>>();
        var promptService = new PromptService(logger.Object);
        var config = new SelectLabelsPromptConfig
        {
            LabelPrefix = "area-",
            Repository = "test/repo"
        };

        // Act & Assert
        var multiLabelPrompt = await promptService.GenerateSystemPromptAsync("multi-label", config);
        Assert.Contains("multiple labels", multiLabelPrompt);
        Assert.Contains("area-", multiLabelPrompt);

        var singleLabelPrompt = await promptService.GenerateSystemPromptAsync("single-label", config);
        Assert.Contains("single label", singleLabelPrompt);

        var regressionPrompt = await promptService.GenerateSystemPromptAsync("regression", config);
        Assert.Contains("regression", regressionPrompt);

        var missingInfoPrompt = await promptService.GenerateSystemPromptAsync("missing-info", config);
        Assert.Contains("missing", missingInfoPrompt);

        // Test default fallback
        var defaultPrompt = await promptService.GenerateSystemPromptAsync("unknown-template", config);
        Assert.Contains("multiple labels", defaultPrompt); // Should fallback to multi-label
    }

    [Fact]
    public async Task PromptService_GenerateUserPromptAsync_ShouldGenerateValidPrompt()
    {
        // Arrange
        var logger = new Mock<ILogger<PromptService>>();
        var promptService = new PromptService(logger.Object);
        var config = new SelectLabelsPromptConfig
        {
            Repository = "test/repo",
            IssueNumber = 123
        };

        var issue = new IssueDetails
        {
            Number = 123,
            Title = "Test Issue",
            Body = "This is a test issue description",
            State = "open",
            User = new UserInfo { Login = "testuser" },
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow,
            Comments = new List<CommentData>(),
            Reactions = new List<ReactionData>(),
            Assignees = new List<UserInfo>()
        };

        // Act
        var userPrompt = await promptService.GenerateUserPromptAsync(issue, config);

        // Assert
        Assert.Contains("Test Issue", userPrompt);
        Assert.Contains("This is a test issue description", userPrompt);
        Assert.Contains("testuser", userPrompt);
        Assert.Contains("test/repo", userPrompt);
        Assert.Contains("123", userPrompt);
    }

    [Fact]
    public async Task PromptService_GenerateSummaryPromptAsync_ShouldGenerateValidSummary()
    {
        // Arrange
        var logger = new Mock<ILogger<PromptService>>();
        var promptService = new PromptService(logger.Object);
        var config = new SummaryPromptConfig
        {
            IssueNumber = 123,
            Repository = "test/repo"
        };

        var triageResponse = new TriageResponse
        {
            Labels = new List<LabelSuggestion>
            {
                new() { Label = "bug", Confidence = 0.85, Reasoning = "This looks like a bug" },
                new() { Label = "area-ui", Confidence = 0.75, Reasoning = "Related to UI components" }
            },
            Summary = "Issue analysis complete",
            Reasoning = "Applied labels based on content analysis"
        };

        // Act
        var summaryPrompt = await promptService.GenerateSummaryPromptAsync(triageResponse, config);

        // Assert
        Assert.Contains("summary", summaryPrompt);
        Assert.Contains("bug", summaryPrompt);
        Assert.Contains("area-ui", summaryPrompt);
        Assert.Contains("GitHub markdown", summaryPrompt);
    }

    [Fact]
    public void EngagementModels_ShouldCreateCorrectly()
    {
        // Arrange & Act
        var item = new EngagementItem
        {
            Id = "test-id",
            Issue = new Issue
            {
                Id = "issue-id", 
                Owner = "owner",
                Repo = "repo", 
                Number = 123
            },
            Engagement = new EngagementInfo
            {
                Score = 15,
                PreviousScore = 10,
                Classification = EngagementClassification.Hot
            }
        };

        var response = new EngagementResponse
        {
            Items = new List<EngagementItem> { item },
            TotalItems = 1,
            Project = new Project
            {
                Id = "project-id",
                Owner = "owner", 
                Number = 1
            }
        };

        // Assert
        Assert.Single(response.Items);
        Assert.Equal(1, response.TotalItems);
        Assert.Equal("test-id", response.Items[0].Id);
        Assert.Equal(123, response.Items[0].Issue.Number);
        Assert.Equal(15, response.Items[0].Engagement.Score);
        Assert.Equal(EngagementClassification.Hot, response.Items[0].Engagement.Classification);
    }
}