using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace TriageAssistant.Core.Configuration;

/// <summary>
/// Service for loading and parsing .triagerc.yml configuration files
/// </summary>
public class ConfigurationLoader
{
    private readonly IDeserializer _yamlDeserializer;
    
    public ConfigurationLoader()
    {
        _yamlDeserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();
    }

    /// <summary>
    /// Load triage configuration from .triagerc.yml or .github/.triagerc.yml
    /// </summary>
    /// <param name="workspacePath">The workspace path to search for config files</param>
    /// <returns>The configuration object</returns>
    public async Task<TriageConfiguration> LoadConfigurationAsync(string workspacePath = ".")
    {
        // Validate and normalize workspace path to prevent directory traversal
        var currentDir = Directory.GetCurrentDirectory();
        var normalizedWorkspace = Path.GetFullPath(workspacePath);

        // For security, check for obvious directory traversal attempts
        if (workspacePath.Contains(".."))
        {
            throw new ArgumentException($"Invalid workspace path: {workspacePath} contains directory traversal");
        }

        var configPaths = new[]
        {
            Path.Combine(normalizedWorkspace, ".triagerc.yml"),
            Path.Combine(normalizedWorkspace, ".github", ".triagerc.yml")
        };

        return await LoadFromPathsAsync(configPaths);
    }

    /// <summary>
    /// Load configuration from multiple potential file paths
    /// </summary>
    /// <param name="configPaths">Array of file paths to try</param>
    /// <returns>The configuration object</returns>
    public async Task<TriageConfiguration> LoadFromPathsAsync(string[] configPaths)
    {
        var failedPaths = new Dictionary<string, string>();

        foreach (var configPath in configPaths)
        {
            try
            {
                Console.WriteLine($"Attempting to load triage configuration from {configPath}");
                var fileContent = await File.ReadAllTextAsync(configPath);
                var parsedConfig = ParseConfigurationFile(fileContent);
                if (parsedConfig != null)
                {
                    Console.WriteLine($"Successfully loaded configuration from {configPath}");
                    return parsedConfig;
                }
            }
            catch (Exception error)
            {
                failedPaths[configPath] = error.Message;
            }
        }

        // Log failed lookups
        if (failedPaths.Count > 0)
        {
            var details = string.Join("\n", failedPaths.Select(kvp => $" - {kvp.Key}: {kvp.Value}"));
            Console.WriteLine($"Warning: Failed to load configuration from the following paths:\n{details}");
        }

        // Return default configuration if nothing was loaded
        return new TriageConfiguration();
    }

    /// <summary>
    /// Parse configuration from YAML content
    /// </summary>
    /// <param name="fileContent">YAML file content</param>
    /// <returns>Parsed configuration or null if invalid</returns>
    public TriageConfiguration? ParseConfigurationFile(string fileContent)
    {
        try
        {
            var parsedConfig = _yamlDeserializer.Deserialize<TriageConfiguration?>(fileContent);
            return parsedConfig ?? new TriageConfiguration();
        }
        catch (Exception)
        {
            return null;
        }
    }
}