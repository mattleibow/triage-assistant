using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using TriageAssistant.Core.Models.Configuration;
using TriageAssistant.Core.Utils;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace TriageAssistant.Core.Services;

/// <summary>
/// Service for loading and parsing configuration files
/// </summary>
public class ConfigurationService
{
    private readonly ILogger<ConfigurationService> _logger;
    private readonly IDeserializer _yamlDeserializer;

    public ConfigurationService(ILogger<ConfigurationService> logger)
    {
        _logger = logger;
        _yamlDeserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();
    }

    /// <summary>
    /// Load full triage configuration from .triagerc.yml or .github/.triagerc.yml
    /// </summary>
    /// <param name="workspacePath">The workspace path to search for config files</param>
    /// <returns>The full configuration object</returns>
    public async Task<ConfigFile> LoadConfigFileAsync(string workspacePath = ".")
    {
        // Validate and normalize workspace path to prevent directory traversal
        var currentDir = Directory.GetCurrentDirectory();
        var normalizedWorkspace = Path.GetFullPath(workspacePath);

        // Ensure workspace path is within or at the current working directory
        var relativeToCurrentDir = Path.GetRelativePath(currentDir, normalizedWorkspace);
        if (relativeToCurrentDir.StartsWith("..") || Path.IsPathRooted(relativeToCurrentDir))
        {
            throw new ArgumentException($"Invalid workspace path: {workspacePath} resolves outside current directory");
        }

        var configPaths = new[]
        {
            PathUtils.SafePath(normalizedWorkspace, ".triagerc.yml"),
            PathUtils.SafePath(normalizedWorkspace, ".github", ".triagerc.yml")
        };

        var config = await LoadFileAsync(configPaths);

        // Log final config
        _logger.LogInformation("Using complete configuration: {Config}", JsonSerializer.Serialize(config));

        return config;
    }

    /// <summary>
    /// Load configuration from specified paths in order of preference
    /// </summary>
    /// <param name="configPaths">Paths to search for configuration files</param>
    /// <returns>The loaded configuration</returns>
    public async Task<ConfigFile> LoadFileAsync(string[] configPaths)
    {
        var failedPaths = new Dictionary<string, string>();

        foreach (var configPath in configPaths)
        {
            try
            {
                _logger.LogInformation("Attempting to load triage configuration from {ConfigPath}", configPath);
                var fileContent = await File.ReadAllTextAsync(configPath);
                var parsedConfig = ParseConfigFile(fileContent);
                if (parsedConfig != null)
                {
                    _logger.LogInformation("Successfully loaded configuration from {ConfigPath}: {Config}", 
                        configPath, JsonSerializer.Serialize(parsedConfig));
                    return parsedConfig;
                }
            }
            catch (Exception error)
            {
                failedPaths[configPath] = error.Message;
            }
        }

        // Log failed lookup
        if (failedPaths.Count > 0)
        {
            var details = string.Join("\n", failedPaths.Select(kvp => $" - {kvp.Key}: {kvp.Value}"));
            _logger.LogWarning("Failed to load configuration from the following paths:\n{Details}", details);
        }

        // Nothing was loaded, so return default config
        return new ConfigFile
        {
            Engagement = new ConfigFileEngagement
            {
                Weights = DefaultEngagementWeights.Default
            },
            Labels = new ConfigFileLabels
            {
                Groups = new Dictionary<string, ConfigFileLabelGroup>()
            }
        };
    }

    /// <summary>
    /// Parse configuration file content from YAML
    /// </summary>
    /// <param name="fileContent">YAML file content</param>
    /// <returns>Parsed configuration or null if invalid</returns>
    public ConfigFile? ParseConfigFile(string fileContent)
    {
        try
        {
            var parsedConfig = _yamlDeserializer.Deserialize<ConfigFile?>(fileContent);

            // We successfully loaded a configuration
            if (parsedConfig == null)
            {
                return null;
            }

            // Make sure the config is normalized with defaults
            var normalized = new ConfigFile
            {
                Engagement = new ConfigFileEngagement
                {
                    Weights = MergeWeights(DefaultEngagementWeights.Default, parsedConfig.Engagement?.Weights)
                },
                Labels = new ConfigFileLabels
                {
                    Groups = parsedConfig.Labels?.Groups ?? new Dictionary<string, ConfigFileLabelGroup>()
                }
            };

            return normalized;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to parse configuration file: {Error}", ex.Message);
            return null;
        }
    }

    /// <summary>
    /// Merge engagement weights with defaults
    /// </summary>
    private static ConfigFileEngagementWeights MergeWeights(ConfigFileEngagementWeights defaults, ConfigFileEngagementWeights? custom)
    {
        if (custom == null)
            return defaults;

        return new ConfigFileEngagementWeights
        {
            Comments = custom.Comments != 0 ? custom.Comments : defaults.Comments,
            Reactions = custom.Reactions != 0 ? custom.Reactions : defaults.Reactions,
            Contributors = custom.Contributors != 0 ? custom.Contributors : defaults.Contributors,
            LastActivity = custom.LastActivity != 0 ? custom.LastActivity : defaults.LastActivity,
            IssueAge = custom.IssueAge != 0 ? custom.IssueAge : defaults.IssueAge,
            LinkedPullRequests = custom.LinkedPullRequests != 0 ? custom.LinkedPullRequests : defaults.LinkedPullRequests
        };
    }

    /// <summary>
    /// Build the everything config from environment variables and inputs
    /// </summary>
    /// <returns>Complete configuration object</returns>
    public async Task<EverythingConfig> BuildConfigAsync()
    {
        const string DefaultAiEndpoint = "https://models.github.ai/inference";
        const string DefaultAiModel = "openai/gpt-4o";
        const string DefaultProjectColumnName = "Engagement Score";

        // Get token with fallback logic
        var token = GetEnvironmentVariable("INPUT_TOKEN") ??
                   GetEnvironmentVariable("TRIAGE_GITHUB_TOKEN") ??
                   GetEnvironmentVariable("GITHUB_TOKEN") ??
                   GetEnvironmentVariable("INPUT_FALLBACK-TOKEN") ??
                   throw new InvalidOperationException("No GitHub token found in environment variables");

        var aiToken = GetEnvironmentVariable("INPUT_AI-TOKEN") ?? 
                     GetEnvironmentVariable("TRIAGE_AI_TOKEN") ?? 
                     token;

        var tempDir = GetEnvironmentVariable("RUNNER_TEMP") ?? Path.GetTempPath();

        // Parse repository information
        var repository = GetEnvironmentVariable("GITHUB_REPOSITORY") ?? "";
        var repoParts = repository.Split('/');
        if (repoParts.Length != 2)
        {
            throw new InvalidOperationException($"Invalid repository format: {repository}");
        }

        return new EverythingConfig
        {
            Token = token,
            RepoOwner = repoParts[0],
            RepoName = repoParts[1],
            Repository = repository,
            IssueNumber = ParseOptionalInt(GetEnvironmentVariable("INPUT_ISSUE")),
            IssueQuery = GetEnvironmentVariable("INPUT_ISSUE-QUERY"),
            AiEndpoint = GetEnvironmentVariable("INPUT_AI-ENDPOINT") ?? 
                        GetEnvironmentVariable("TRIAGE_AI_ENDPOINT") ?? 
                        DefaultAiEndpoint,
            AiModel = GetEnvironmentVariable("INPUT_AI-MODEL") ?? 
                     GetEnvironmentVariable("TRIAGE_AI_MODEL") ?? 
                     DefaultAiModel,
            AiToken = aiToken,
            ApplyComment = ParseBool(GetEnvironmentVariable("INPUT_APPLY-COMMENT")),
            ApplyLabels = ParseBool(GetEnvironmentVariable("INPUT_APPLY-LABELS")),
            ApplyScores = ParseBool(GetEnvironmentVariable("INPUT_APPLY-SCORES")),
            CommentFooter = GetEnvironmentVariable("INPUT_COMMENT-FOOTER"),
            DryRun = ParseBool(GetEnvironmentVariable("INPUT_DRY-RUN")),
            ProjectColumn = GetEnvironmentVariable("INPUT_PROJECT-COLUMN") ?? DefaultProjectColumnName,
            ProjectNumber = ParseOptionalInt(GetEnvironmentVariable("INPUT_PROJECT")),
            TempDir = tempDir
        };
    }

    private static string? GetEnvironmentVariable(string name)
    {
        return Environment.GetEnvironmentVariable(name);
    }

    private static bool ParseBool(string? value)
    {
        return string.Equals(value?.Trim(), "true", StringComparison.OrdinalIgnoreCase);
    }

    private static int? ParseOptionalInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (int.TryParse(value, out var result) && result >= 0)
            return result;

        return null;
    }
}