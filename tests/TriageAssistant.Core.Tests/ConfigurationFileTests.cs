using System.IO;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using TriageAssistant.Core.Configuration;

namespace TriageAssistant.Core.Tests;

public class ConfigurationFileTests : IAsyncLifetime
{
    private readonly ConfigurationLoader _configLoader;
    private readonly string _testWorkspacePath;

    public ConfigurationFileTests()
    {
        _configLoader = new ConfigurationLoader();
        _testWorkspacePath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_testWorkspacePath);
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync()
    {
        if (Directory.Exists(_testWorkspacePath))
        {
            Directory.Delete(_testWorkspacePath, true);
        }
        return Task.CompletedTask;
    }

    [Fact]
    public async Task LoadConfigurationAsync_WithNoConfigFile_ShouldReturnDefaultConfiguration()
    {
        // Act
        var result = await _configLoader.LoadConfigurationAsync(_testWorkspacePath);

        // Assert
        result.Should().NotBeNull();
        result.Engagement.Weights.Comments.Should().Be(3.0);
        result.Engagement.Weights.Reactions.Should().Be(1.0);
        result.Engagement.Weights.Contributors.Should().Be(2.0);
        result.Engagement.Weights.LastActivity.Should().Be(1.0);
        result.Engagement.Weights.IssueAge.Should().Be(1.0);
        result.Engagement.Weights.LinkedPullRequests.Should().Be(2.0);
        result.Labels.Groups.Should().BeEmpty();
    }

    [Fact]
    public async Task LoadConfigurationAsync_WithTriageRcYml_ShouldLoadConfiguration()
    {
        // Arrange
        var configContent = """
            engagement:
              weights:
                comments: 5
                reactions: 2
                contributors: 3
            """;
        var configPath = Path.Combine(_testWorkspacePath, ".triagerc.yml");
        await File.WriteAllTextAsync(configPath, configContent);

        // Act
        var result = await _configLoader.LoadConfigurationAsync(_testWorkspacePath);

        // Assert
        result.Engagement.Weights.Comments.Should().Be(5.0);
        result.Engagement.Weights.Reactions.Should().Be(2.0);
        result.Engagement.Weights.Contributors.Should().Be(3.0);
        // Should use defaults for missing values
        result.Engagement.Weights.LastActivity.Should().Be(1.0); // Default from record
        result.Engagement.Weights.IssueAge.Should().Be(1.0);
        result.Engagement.Weights.LinkedPullRequests.Should().Be(2.0);
    }

    [Fact]
    public async Task LoadConfigurationAsync_WithGithubTriageRcYml_ShouldLoadConfiguration()
    {
        // Arrange
        var githubDir = Path.Combine(_testWorkspacePath, ".github");
        Directory.CreateDirectory(githubDir);
        
        var configContent = """
            engagement:
              weights:
                comments: 4
                linkedPullRequests: 3
            """;
        var configPath = Path.Combine(githubDir, ".triagerc.yml");
        await File.WriteAllTextAsync(configPath, configContent);

        // Act
        var result = await _configLoader.LoadConfigurationAsync(_testWorkspacePath);

        // Assert
        result.Engagement.Weights.Comments.Should().Be(4.0);
        result.Engagement.Weights.LinkedPullRequests.Should().Be(3.0);
    }

    [Fact]
    public async Task ParseConfigurationFile_WithInvalidYaml_ShouldReturnNull()
    {
        // Arrange
        var invalidYaml = "invalid: yaml: content: [";

        // Act
        var result = _configLoader.ParseConfigurationFile(invalidYaml);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoadConfigurationAsync_WithInvalidPath_ShouldThrowArgumentException()
    {
        // Arrange
        var invalidPath = "../../../etc/passwd";

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => 
            _configLoader.LoadConfigurationAsync(invalidPath));
    }

    [Fact]
    public void ParseConfigurationFile_WithValidYaml_ShouldReturnConfiguration()
    {
        // Arrange
        var validYaml = """
            engagement:
              weights:
                comments: 8
                reactions: 2
            labels:
              groups:
                area:
                  template: "multi-label"
                  labelPrefix: "area-"
            """;

        // Act
        var result = _configLoader.ParseConfigurationFile(validYaml);

        // Assert
        result.Should().NotBeNull();
        result!.Engagement.Weights.Comments.Should().Be(8.0);
        result.Engagement.Weights.Reactions.Should().Be(2.0);
        result.Labels.Groups.Should().ContainKey("area");
        result.Labels.Groups["area"].Template.Should().Be("multi-label");
        result.Labels.Groups["area"].LabelPrefix.Should().Be("area-");
    }

    [Fact]
    public async Task LoadConfigurationAsync_ShouldPreferRootConfigOverGithubConfig()
    {
        // Arrange
        var githubDir = Path.Combine(_testWorkspacePath, ".github");
        Directory.CreateDirectory(githubDir);

        var rootConfig = """
            engagement:
              weights:
                comments: 10
            """;
        var githubConfig = """
            engagement:
              weights:
                comments: 5
            """;
        
        var rootConfigPath = Path.Combine(_testWorkspacePath, ".triagerc.yml");
        var githubConfigPath = Path.Combine(githubDir, ".triagerc.yml");
        
        await File.WriteAllTextAsync(rootConfigPath, rootConfig);
        await File.WriteAllTextAsync(githubConfigPath, githubConfig);

        // Act
        var result = await _configLoader.LoadConfigurationAsync(_testWorkspacePath);

        // Assert
        result.Engagement.Weights.Comments.Should().Be(10.0); // From root config, not GitHub config
    }
}