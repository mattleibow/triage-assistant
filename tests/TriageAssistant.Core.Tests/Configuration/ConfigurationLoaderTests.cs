using FluentAssertions;
using TriageAssistant.Core.Configuration;
using Xunit;

namespace TriageAssistant.Core.Tests.Configuration;

public class ConfigurationLoaderTests : IDisposable
{
    private readonly ConfigurationLoader _configurationLoader;
    private readonly string _tempDirectory;

    public ConfigurationLoaderTests()
    {
        _configurationLoader = new ConfigurationLoader();
        _tempDirectory = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_tempDirectory);
    }

    [Fact]
    public async Task LoadConfigurationAsync_WithValidYamlFile_ShouldParseCorrectly()
    {
        // Arrange
        const string yamlContent = @"
engagement:
  weights:
    comments: 5
    reactions: 2
    contributors: 3
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 4
labels:
  groups:
    area:
      labelPrefix: 'area-'
      template: 'multi-label'
";
        var configPath = Path.Combine(_tempDirectory, ".triagerc.yml");
        await File.WriteAllTextAsync(configPath, yamlContent);

        // Act
        var config = await _configurationLoader.LoadConfigurationAsync(_tempDirectory);

        // Assert
        config.Should().NotBeNull();
        config.Engagement.Weights.Comments.Should().Be(5);
        config.Engagement.Weights.Reactions.Should().Be(2);
        config.Engagement.Weights.Contributors.Should().Be(3);
        config.Engagement.Weights.LinkedPullRequests.Should().Be(4);
        config.Labels.Groups.Should().ContainKey("area");
        config.Labels.Groups["area"].LabelPrefix.Should().Be("area-");
        config.Labels.Groups["area"].Template.Should().Be("multi-label");
    }

    [Fact]
    public async Task LoadConfigurationAsync_WithMissingFile_ShouldReturnDefaultConfiguration()
    {
        // Act
        var config = await _configurationLoader.LoadConfigurationAsync(_tempDirectory);

        // Assert
        config.Should().NotBeNull();
        config.Engagement.Weights.Comments.Should().Be(3.0); // Default value
        config.Engagement.Weights.Reactions.Should().Be(1.0); // Default value
        config.Labels.Groups.Should().BeEmpty();
    }

    [Fact]
    public async Task LoadConfigurationAsync_WithPartialConfiguration_ShouldMergeWithDefaults()
    {
        // Arrange
        const string yamlContent = @"
engagement:
  weights:
    comments: 10
labels:
  groups: {}
";
        var configPath = Path.Combine(_tempDirectory, ".triagerc.yml");
        await File.WriteAllTextAsync(configPath, yamlContent);

        // Act
        var config = await _configurationLoader.LoadConfigurationAsync(_tempDirectory);

        // Assert
        config.Should().NotBeNull();
        config.Engagement.Weights.Comments.Should().Be(10); // Overridden value
        config.Engagement.Weights.Reactions.Should().Be(1.0); // Default value
        config.Engagement.Weights.Contributors.Should().Be(2.0); // Default value
    }

    [Fact]
    public void ParseConfigurationFile_WithInvalidYaml_ShouldReturnNull()
    {
        // Arrange
        const string invalidYaml = "invalid: yaml: content: [";

        // Act
        var result = _configurationLoader.ParseConfigurationFile(invalidYaml);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoadConfigurationAsync_WithInvalidPath_ShouldThrowArgumentException()
    {
        // Act & Assert
        await FluentActions.Invoking(() => _configurationLoader.LoadConfigurationAsync("../invalid-path"))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*contains directory traversal*");
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, true);
        }
    }
}