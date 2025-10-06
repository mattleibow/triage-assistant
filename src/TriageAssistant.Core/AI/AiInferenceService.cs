using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

namespace TriageAssistant.Core.AI;

/// <summary>
/// Service for AI inference operations
/// </summary>
public interface IAiInferenceService
{
    /// <summary>
    /// Runs AI inference to generate a response and save to file
    /// </summary>
    /// <param name="systemPrompt">The system prompt content</param>
    /// <param name="userPrompt">The user prompt content</param>
    /// <param name="responseFile">Path to write the response file</param>
    /// <param name="maxTokens">Maximum tokens limit</param>
    /// <param name="config">The inference configuration</param>
    Task RunInferenceAsync(string systemPrompt, string userPrompt, string responseFile, 
        int maxTokens, InferenceConfig config);

    /// <summary>
    /// Perform AI inference for label selection
    /// </summary>
    /// <param name="config">AI inference configuration</param>
    /// <param name="systemPrompt">System prompt for AI</param>
    /// <param name="userPrompt">User prompt with issue details</param>
    /// <returns>AI response as JSON string</returns>
    Task<string> InferAsync(InferenceConfig config, string systemPrompt, string userPrompt);

    /// <summary>
    /// Perform AI inference for summary generation
    /// </summary>
    /// <param name="config">AI inference configuration</param>
    /// <param name="prompt">Complete prompt for summary</param>
    /// <returns>AI generated summary</returns>
    Task<string> GenerateSummaryAsync(InferenceConfig config, string prompt);
}

/// <summary>
/// AI inference service implementation with real HTTP calls
/// </summary>
public class AiInferenceService : IAiInferenceService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AiInferenceService> _logger;

    public AiInferenceService(HttpClient httpClient, ILogger<AiInferenceService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task RunInferenceAsync(string systemPrompt, string userPrompt, string responseFile, 
        int maxTokens, InferenceConfig config)
    {
        _logger.LogInformation("🤖 Running AI inference with model: {Model}", config.AiModel);

        try
        {
            // Run the inference
            var responseContent = await InferAsync(config, systemPrompt, userPrompt);

            // Ensure the response directory exists
            var responseDirectory = Path.GetDirectoryName(responseFile);
            if (!string.IsNullOrEmpty(responseDirectory))
            {
                Directory.CreateDirectory(responseDirectory);
            }

            // Write the response to the specified file
            await File.WriteAllTextAsync(responseFile, responseContent);

            _logger.LogInformation("✅ AI inference completed. Response written to: {ResponseFile}", responseFile);
            _logger.LogInformation("📝 Response preview: {Response}", responseContent[..Math.Min(200, responseContent.Length)]);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ AI inference failed: {Message}", ex.Message);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<string> InferAsync(InferenceConfig config, string systemPrompt, string userPrompt)
    {
        _logger.LogInformation("🤖 AI Inference request to {Endpoint} using model {Model}", 
            config.AiEndpoint, config.AiModel);
        
        try
        {
            var request = new AiInferenceRequest
            {
                Model = config.AiModel,
                Messages = new List<AiMessage>
                {
                    new() { Role = "system", Content = systemPrompt },
                    new() { Role = "user", Content = userPrompt }
                },
                Temperature = 0.1,
                MaxTokens = 1000
            };

            var jsonRequest = JsonSerializer.Serialize(request);
            _logger.LogDebug("AI request payload size: {Size} characters", jsonRequest.Length);

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, config.AiEndpoint)
            {
                Content = new StringContent(jsonRequest, Encoding.UTF8, "application/json")
            };

            httpRequest.Headers.Add("Authorization", $"Bearer {config.AiToken}");
            httpRequest.Headers.Add("User-Agent", "TriageAssistant/1.0");

            var response = await _httpClient.SendAsync(httpRequest);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("❌ AI inference failed with status {StatusCode}: {Error}", 
                    response.StatusCode, errorContent);
                throw new HttpRequestException($"AI inference failed: {response.StatusCode}");
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var aiResponse = JsonSerializer.Deserialize<AiInferenceResponse>(responseContent);

            if (aiResponse?.Choices?.FirstOrDefault()?.Message?.Content != null)
            {
                var content = aiResponse.Choices.First().Message.Content;
                _logger.LogInformation("✅ AI inference successful, tokens used: {Tokens}", 
                    aiResponse.Usage?.TotalTokens ?? 0);
                return content;
            }

            _logger.LogWarning("⚠️ AI response was empty or malformed");
            return """{"labels": [{"label": "needs-triage", "confidence": 0.5, "reasoning": "Empty AI response"}]}""";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ AI inference failed: {Message}", ex.Message);
            // Return a fallback response rather than throwing in file-based workflow
            return """{"labels": [{"label": "needs-triage", "confidence": 0.5, "reasoning": "AI inference unavailable"}]}""";
        }
    }

    /// <inheritdoc/>
    public async Task<string> GenerateSummaryAsync(InferenceConfig config, string prompt)
    {
        _logger.LogInformation("🤖 AI Summary generation request to {Endpoint} using model {Model}", 
            config.AiEndpoint, config.AiModel);
        
        try
        {
            var request = new AiInferenceRequest
            {
                Model = config.AiModel,
                Messages = new List<AiMessage>
                {
                    new() { Role = "system", Content = "You are a helpful assistant that summarizes issue triage results." },
                    new() { Role = "user", Content = prompt }
                },
                Temperature = 0.3,
                MaxTokens = 500
            };

            var jsonRequest = JsonSerializer.Serialize(request);
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, config.AiEndpoint)
            {
                Content = new StringContent(jsonRequest, Encoding.UTF8, "application/json")
            };

            httpRequest.Headers.Add("Authorization", $"Bearer {config.AiToken}");
            httpRequest.Headers.Add("User-Agent", "TriageAssistant/1.0");

            var response = await _httpClient.SendAsync(httpRequest);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("❌ AI summary generation failed with status {StatusCode}: {Error}", 
                    response.StatusCode, errorContent);
                return "Unable to generate AI summary due to API error.";
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var aiResponse = JsonSerializer.Deserialize<AiInferenceResponse>(responseContent);

            if (aiResponse?.Choices?.FirstOrDefault()?.Message?.Content != null)
            {
                var content = aiResponse.Choices.First().Message.Content;
                _logger.LogInformation("✅ AI summary generation successful");
                return content;
            }

            _logger.LogWarning("⚠️ AI summary response was empty or malformed");
            return "Unable to generate AI summary.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ AI summary generation failed: {Message}", ex.Message);
            return "Unable to generate AI summary due to technical error.";
        }
    }
}