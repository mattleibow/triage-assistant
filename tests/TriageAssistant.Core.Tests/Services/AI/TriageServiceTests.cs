using NSubstitute;
using TriageAssistant.Core.Services.AI;
using TriageAssistant.Core.Services.Prompts;
using TriageAssistant.Core.Services.Triage;
using TriageAssistant.Core.Models.AI;
using TriageAssistant.Core.Models.Triage;
using Microsoft.Extensions.Logging;
using Xunit;

namespace TriageAssistant.Core.Tests.Services.AI;

public class TriageServiceTests : IDisposable
{
    private readonly ILogger<TriageService> _logger;
    private readonly IAIInferenceService _aiService;
    private readonly IPromptService _promptService;
    private readonly TriageService _triageService;
    private readonly string _tempDir;

    public TriageServiceTests()
    {
        _logger = Substitute.For<ILogger<TriageService>>();
        _aiService = Substitute.For<IAIInferenceService>();
        _promptService = Substitute.For<IPromptService>();
        _triageService = new TriageService(_logger, _aiService, _promptService);
        _tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_tempDir);
    }

    [Fact]
    public async Task SelectLabelsAsync_ShouldGeneratePromptsAndRunInference()
    {
        // Arrange
        var config = new LabelSelectionConfig
        {
            Template = "multi-label",
            Repository = "owner/repo",
            IssueNumber = 123,
            LabelPrefix = "area-",
            Token = "test-token",
            AiEndpoint = "https://test.endpoint",
            AiModel = "gpt-4",
            AiToken = "ai-token",
            TempDir = _tempDir
        };

        var systemTemplate = "System prompt template with {LABEL_PREFIX}";
        var userTemplate = "User prompt template with {ISSUE_NUMBER}";
        var aiResponse = new AIInferenceResponse
        {
            Content = """{"labels": [{"label": "area-core", "reason": "Core functionality issue"}]}"""
        };

        _promptService.GetTemplate("multi-label").Returns(systemTemplate);
        _promptService.GetTemplate("user").Returns(userTemplate);
        _promptService.GeneratePromptAsync(Arg.Any<string>(), Arg.Any<Dictionary<string, object>>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns("Generated prompt");
        _aiService.RunInferenceAsync(Arg.Any<AIInferenceRequest>(), Arg.Any<CancellationToken>())
            .Returns(aiResponse);

        // Act
        var result = await _triageService.SelectLabelsAsync(config);

        // Assert
        Assert.False(string.IsNullOrEmpty(result));
        Assert.True(File.Exists(result));
        
        await _promptService.Received(2).GeneratePromptAsync(
            Arg.Any<string>(), 
            Arg.Any<Dictionary<string, object>>(), 
            "test-token", 
            Arg.Any<CancellationToken>());
        
        await _aiService.Received(1).RunInferenceAsync(
            Arg.Is<AIInferenceRequest>(r => r.Model == "gpt-4"), 
            Arg.Any<CancellationToken>());

        // Verify response file content
        var responseContent = await File.ReadAllTextAsync(result);
        Assert.Contains("area-core", responseContent);
    }

    [Fact]
    public async Task MergeResponsesAsync_ShouldCombineMultipleResponses()
    {
        // Arrange
        var responsesDir = Path.Combine(_tempDir, "responses");
        Directory.CreateDirectory(responsesDir);

        var response1 = new TriageResponse
        {
            Labels = [new LabelResponse { Label = "area-core", Reason = "Core issue" }],
            Remarks = ["First response"]
        };

        var response2 = new TriageResponse
        {
            Labels = [new LabelResponse { Label = "priority-high", Reason = "High priority" }],
            Remarks = ["Second response"]
        };

        var response1File = Path.Combine(responsesDir, "response1.json");
        var response2File = Path.Combine(responsesDir, "response2.json");
        var outputFile = Path.Combine(_tempDir, "merged.json");

        await File.WriteAllTextAsync(response1File, System.Text.Json.JsonSerializer.Serialize(response1));
        await File.WriteAllTextAsync(response2File, System.Text.Json.JsonSerializer.Serialize(response2));

        // Act
        var result = await _triageService.MergeResponsesAsync(responsesDir, outputFile);

        // Assert
        Assert.Equal(2, result.Labels.Count);
        Assert.Equal(2, result.Remarks.Count);
        Assert.Contains("area-core", result.Labels.Select(l => l.Label));
        Assert.Contains("priority-high", result.Labels.Select(l => l.Label));
        Assert.Contains("First response", result.Remarks);
        Assert.Contains("Second response", result.Remarks);
        Assert.True(File.Exists(outputFile));
    }

    [Fact]
    public void PromptTemplates_ShouldContainAllRequiredTemplates()
    {
        // Act & Assert
        var promptService = new PromptService(Substitute.For<ILogger<PromptService>>());
        
        Assert.NotEmpty(promptService.GetTemplate("multi-label"));
        Assert.NotEmpty(promptService.GetTemplate("single-label"));
        Assert.NotEmpty(promptService.GetTemplate("regression"));
        Assert.NotEmpty(promptService.GetTemplate("missing-info"));
        Assert.NotEmpty(promptService.GetTemplate("summary-system"));
        Assert.NotEmpty(promptService.GetTemplate("summary-user"));
        Assert.NotEmpty(promptService.GetTemplate("user"));
    }

    [Fact]
    public void PromptTemplates_ShouldContainExpectedContent()
    {
        // Arrange
        var promptService = new PromptService(Substitute.For<ILogger<PromptService>>());
        
        // Act & Assert
        var multiLabelTemplate = promptService.GetTemplate("multi-label");
        Assert.Contains("multiple labels", multiLabelTemplate);
        Assert.Contains("Available Labels", multiLabelTemplate);
        Assert.Contains("JSON", multiLabelTemplate);

        var userTemplate = promptService.GetTemplate("user");
        Assert.Contains("{ISSUE_NUMBER}", userTemplate);
        Assert.Contains("{ISSUE_REPO}", userTemplate);
        Assert.Contains("EXEC:", userTemplate);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, true);
        }
    }
}