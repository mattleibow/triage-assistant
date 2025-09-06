using TriageAssistant.Core.Configuration;
using Microsoft.Extensions.Logging;

namespace TriageAssistant.Core.AI;

/// <summary>
/// AI inference service interface
/// </summary>
public interface IAiInferenceService
{
    /// <summary>
    /// Runs AI inference to generate a response
    /// </summary>
    /// <param name="systemPrompt">The system prompt content</param>
    /// <param name="userPrompt">The user prompt content</param>
    /// <param name="responseFile">Path to write the response file</param>
    /// <param name="maxTokens">Maximum tokens limit</param>
    /// <param name="config">The inference configuration</param>
    Task RunInferenceAsync(string systemPrompt, string userPrompt, string responseFile, 
        int maxTokens, InferenceConfig config);
}

/// <summary>
/// Simplified implementation of AI inference service for demonstration
/// </summary>
public class AiInferenceService : IAiInferenceService
{
    private readonly ILogger<AiInferenceService> _logger;

    public AiInferenceService(ILogger<AiInferenceService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task RunInferenceAsync(string systemPrompt, string userPrompt, string responseFile, 
        int maxTokens, InferenceConfig config)
    {
        _logger.LogInformation("🤖 Running AI inference with model: {Model}", config.AiModel);

        try
        {
            // For now, create a placeholder response
            var placeholderResponse = $@"{{
  ""labels"": [""enhancement"", ""area-triage""],
  ""reasoning"": ""This is a placeholder response from the simplified AI service. The actual Azure AI Inference integration is pending."",
  ""confidence"": 0.85
}}";

            // Ensure the response directory exists
            var responseDirectory = Path.GetDirectoryName(responseFile);
            if (!string.IsNullOrEmpty(responseDirectory))
            {
                Directory.CreateDirectory(responseDirectory);
            }

            // Write the response to the specified file
            await File.WriteAllTextAsync(responseFile, placeholderResponse);

            _logger.LogInformation("✅ AI inference completed. Response written to: {ResponseFile}", responseFile);
            _logger.LogInformation("📝 Response preview: {Response}", placeholderResponse[..Math.Min(200, placeholderResponse.Length)]);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ AI inference failed: {Message}", ex.Message);
            throw;
        }
    }
}