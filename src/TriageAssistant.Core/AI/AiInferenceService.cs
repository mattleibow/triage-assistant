using Azure;
using Azure.AI.Inference;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Utils;
using Microsoft.Extensions.Logging;

namespace TriageAssistant.Core.AI;

/// <summary>
/// AI inference service using Azure AI Inference
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
/// Implementation of AI inference service
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
        _logger.LogDebug("Running AI inference...");

        try
        {
            // Create Azure AI client
            var client = new ChatCompletionsClient(
                new Uri(config.AiEndpoint), 
                new AzureKeyCredential(config.AiToken));

            // Prepare the chat completions options
            var messages = new List<ChatRequestMessage>
            {
                new ChatRequestSystemMessage(systemPrompt),
                new ChatRequestUserMessage(userPrompt)
            };

            var completionsOptions = new ChatCompletionsOptions(config.AiModel, messages)
            {
                MaxTokens = maxTokens
            };

            // Make the AI inference request
            var response = await client.CompleteAsync(completionsOptions);
            
            if (response.Value?.Choices == null || response.Value.Choices.Count == 0)
            {
                throw new InvalidOperationException("No response from AI model");
            }

            var modelResponse = response.Value.Choices[0].Message.Content ?? string.Empty;

            // Ensure the response directory exists
            var responseDirectory = Path.GetDirectoryName(responseFile);
            if (!string.IsNullOrEmpty(responseDirectory))
            {
                Directory.CreateDirectory(responseDirectory);
            }

            // Write the response to the specified file
            await File.WriteAllTextAsync(responseFile, modelResponse);

            _logger.LogInformation("AI inference completed. Response written to: {ResponseFile}", responseFile);
            _logger.LogInformation("Response content: {Response}", 
                TriageUtils.SanitizeForLogging(modelResponse));
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "AI inference failed with Azure error: {Message}", ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI inference failed: {Message}", ex.Message);
            throw;
        }
    }
}