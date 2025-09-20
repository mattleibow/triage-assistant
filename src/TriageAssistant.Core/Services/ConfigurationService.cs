using TriageAssistant.Core.Configuration;

namespace TriageAssistant.Core.Services;

/// <summary>
/// Service interface for loading configuration
/// </summary>
public interface IConfigurationService
{
    /// <summary>
    /// Load engagement configuration from .triagerc.yml files
    /// </summary>
    Task<EngagementConfiguration> LoadEngagementConfigurationAsync(string workspacePath = ".");
    
    /// <summary>
    /// Load complete triage configuration from .triagerc.yml files
    /// </summary>
    Task<TriageConfiguration> LoadTriageConfigurationAsync(string workspacePath = ".");
}

/// <summary>
/// Implementation of configuration loading service
/// </summary>
public class ConfigurationService : IConfigurationService
{
    private readonly ConfigurationLoader _loader;
    
    public ConfigurationService()
    {
        _loader = new ConfigurationLoader();
    }
    
    public async Task<EngagementConfiguration> LoadEngagementConfigurationAsync(string workspacePath = ".")
    {
        var triageConfig = await _loader.LoadConfigurationAsync(workspacePath);
        return triageConfig.Engagement;
    }
    
    public async Task<TriageConfiguration> LoadTriageConfigurationAsync(string workspacePath = ".")
    {
        return await _loader.LoadConfigurationAsync(workspacePath);
    }
}