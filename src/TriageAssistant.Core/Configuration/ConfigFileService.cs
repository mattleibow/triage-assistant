using Microsoft.Extensions.Logging;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace TriageAssistant.Core.Configuration;

/// <summary>
/// Service for loading and managing configuration files
/// </summary>
public interface IConfigFileService
{
    /// <summary>
    /// Load configuration from .triagerc.yml file
    /// </summary>
    /// <param name="workspacePath">Optional workspace path to search for config files</param>
    /// <returns>Configuration object with defaults if no file is found</returns>
    Task<ConfigFile> LoadConfigFileAsync(string? workspacePath = null);
}

/// <summary>
/// Implementation of configuration file service
/// </summary>
public class ConfigFileService : IConfigFileService
{
    private readonly ILogger<ConfigFileService> _logger;

    public ConfigFileService(ILogger<ConfigFileService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<ConfigFile> LoadConfigFileAsync(string? workspacePath = null)
    {
        var config = new ConfigFile();
        
        // Determine workspace path
        var searchPath = workspacePath ?? Environment.CurrentDirectory;
        
        // Try to load configuration file in priority order
        var configPaths = new[]
        {
            Path.Combine(searchPath, ".triagerc.yml"),
            Path.Combine(searchPath, ".github", ".triagerc.yml")
        };

        foreach (var configPath in configPaths)
        {
            try
            {
                if (File.Exists(configPath))
                {
                    _logger.LogInformation("Loading configuration from: {ConfigPath}", configPath);
                    var yamlContent = await File.ReadAllTextAsync(configPath);
                    
                    var deserializer = new DeserializerBuilder()
                        .WithNamingConvention(CamelCaseNamingConvention.Instance)
                        .IgnoreUnmatchedProperties()
                        .Build();
                        
                    var loadedConfig = deserializer.Deserialize<ConfigFile>(yamlContent);
                    if (loadedConfig != null)
                    {
                        config = loadedConfig;
                        _logger.LogInformation("✅ Successfully loaded configuration from {ConfigPath}", configPath);
                        LogConfigurationWeights(config);
                        return config;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("⚠️ Failed to load configuration from {ConfigPath}: {Error}", configPath, ex.Message);
            }
        }
        
        _logger.LogInformation("📝 No configuration file found, using default values");
        LogConfigurationWeights(config);
        return config;
    }

    private void LogConfigurationWeights(ConfigFile config)
    {
        var weights = config.Engagement.Weights;
        _logger.LogInformation("🎯 Engagement weights: Comments={Comments}, Reactions={Reactions}, Contributors={Contributors}, LastActivity={LastActivity}, IssueAge={IssueAge}, LinkedPRs={LinkedPRs}",
            weights.Comments, weights.Reactions, weights.Contributors, weights.LastActivity, weights.IssueAge, weights.LinkedPullRequests);
    }
}