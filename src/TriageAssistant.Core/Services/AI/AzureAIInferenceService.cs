using Azure;
using Azure.AI.Inference;
using Azure.Core;
using Microsoft.Extensions.Logging;
using TriageAssistant.Core.Models.AI;

namespace TriageAssistant.Core.Services.AI;

/// <summary>
/// Implementation of AI inference service using Azure AI Inference
/// </summary>
public class AzureAIInferenceService : IAIInferenceService
{
    private readonly ILogger<AzureAIInferenceService> _logger;
    private readonly ChatCompletionsClient? _client;
    private readonly string _endpoint;
    private readonly string _token;
    
    public AzureAIInferenceService(
        ILogger<AzureAIInferenceService> logger,
        string endpoint,
        string token)
    {
        _logger = logger;
        _endpoint = endpoint;
        _token = token;
        
        if (IsConfigured)
        {
            var credential = new AzureKeyCredential(token);
            _client = new ChatCompletionsClient(new Uri(endpoint), credential);
        }
    }
    
    /// <inheritdoc />
    public bool IsConfigured => !string.IsNullOrEmpty(_endpoint) && !string.IsNullOrEmpty(_token);
    
    /// <inheritdoc />
    public async Task<AIInferenceResponse> RunInferenceAsync(AIInferenceRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured || _client == null)
        {
            throw new InvalidOperationException("Azure AI Inference service is not properly configured. Endpoint and token are required.");
        }
        
        _logger.LogDebug("Running AI inference with model: {Model}", request.Model);
        
        try
        {
            var messages = new List<ChatRequestMessage>
            {
                new ChatRequestSystemMessage(request.SystemPrompt),
                new ChatRequestUserMessage(request.UserPrompt)
            };
            
            var completionsOptions = new ChatCompletionsOptions(messages)
            {
                MaxTokens = request.MaxTokens,
                Model = request.Model
            };
            
            var response = await _client.CompleteAsync(completionsOptions, null, cancellationToken);
            
            if (response.Value?.Choices?.Count > 0)
            {
                var choice = response.Value.Choices[0];
                var content = choice.Message?.Content ?? string.Empty;
                
                _logger.LogInformation("AI inference completed successfully. Response length: {Length} characters", content.Length);
                _logger.LogDebug("AI response content: {Content}", SanitizeForLogging(content));
                
                return new AIInferenceResponse
                {
                    Content = content,
                    Model = request.Model,
                    Usage = response.Value.Usage != null ? new TokenUsage
                    {
                        PromptTokens = response.Value.Usage.PromptTokens,
                        CompletionTokens = response.Value.Usage.CompletionTokens,
                        TotalTokens = response.Value.Usage.TotalTokens
                    } : null
                };
            }
            
            throw new InvalidOperationException("No choices returned from AI inference");
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "Azure AI request failed: {Message}", ex.Message);
            throw new InvalidOperationException($"AI inference request failed: {ex.Message}", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI inference failed: {Message}", ex.Message);
            throw;
        }
    }
    
    /// <summary>
    /// Sanitizes content for logging by truncating if too long
    /// </summary>
    private static string SanitizeForLogging(string content, int maxLength = 500)
    {
        if (string.IsNullOrEmpty(content))
            return content;
            
        if (content.Length <= maxLength)
            return content;
            
        return content[..maxLength] + "... (truncated)";
    }
}