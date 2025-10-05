using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Azure;
using Azure.AI.Inference;
using Azure.Core;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using TriageAssistant.Core.Models.Configuration;
using TriageAssistant.Core.Utils;

namespace TriageAssistant.Core.AI;

/// <summary>
/// Service for AI inference operations using Azure AI
/// </summary>
public class AIInferenceService
{
    private readonly ILogger<AIInferenceService> _logger;

    public AIInferenceService(ILogger<AIInferenceService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Runs AI inference to generate a response
    /// </summary>
    /// <param name="systemPrompt">The system prompt content</param>
    /// <param name="userPrompt">The user prompt content</param>
    /// <param name="config">The inference configuration</param>
    /// <param name="maxTokens">Maximum tokens limit</param>
    /// <returns>The AI response content</returns>
    public async Task<string> RunInferenceAsync(
        string systemPrompt, 
        string userPrompt, 
        IInferenceConfig config, 
        int maxTokens = 200)
    {
        _logger.LogDebug("Running inference...");

        try
        {
            // Create Azure AI client
            var credential = new AzureKeyCredential(config.AiToken);
            var client = new ChatCompletionsClient(new Uri(config.AiEndpoint), credential);

            // Create chat completion options
            var chatCompletionsOptions = new ChatCompletionsOptions()
            {
                Messages =
                {
                    new ChatRequestSystemMessage(systemPrompt),
                    new ChatRequestUserMessage(userPrompt)
                },
                MaxTokens = maxTokens,
                Model = config.AiModel
            };

            // Make the AI inference request
            var response = await client.CompleteAsync(chatCompletionsOptions);

            if (response?.Value?.Choices?.Count > 0)
            {
                var modelResponse = response.Value.Choices[0].Message.Content ?? string.Empty;

                _logger.LogInformation("AI inference completed successfully");
                _logger.LogDebug("Response content: {Response}", 
                    ValidationUtils.SanitizeForLogging(modelResponse, 0));

                return modelResponse;
            }

            throw new InvalidOperationException("No response received from AI model");
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "AI inference failed with request error: {Message}", ex.Message);
            throw new InvalidOperationException($"AI inference failed: {ex.Message}", ex);
        }
        catch (Exception error)
        {
            _logger.LogError(error, "AI inference failed: {Message}", error.Message);
            throw;
        }
    }

    /// <summary>
    /// Runs AI inference and writes response to a file
    /// </summary>
    /// <param name="systemPrompt">The system prompt content</param>
    /// <param name="userPrompt">The user prompt content</param>
    /// <param name="responseFile">Path to write the response file</param>
    /// <param name="config">The inference configuration</param>
    /// <param name="maxTokens">Maximum tokens limit</param>
    /// <returns>Task representing the async operation</returns>
    public async Task RunInferenceToFileAsync(
        string systemPrompt,
        string userPrompt,
        string responseFile,
        IInferenceConfig config,
        int maxTokens = 200)
    {
        var modelResponse = await RunInferenceAsync(systemPrompt, userPrompt, config, maxTokens);

        // Write the response to the specified file
        await PathUtils.WriteFileAsync(responseFile, modelResponse);

        _logger.LogInformation("AI inference completed. Response written to: {ResponseFile}", responseFile);
    }
}

/// <summary>
/// Models for AI responses
/// </summary>
public class TriageResponse
{
    public List<string> Labels { get; set; } = new();
    public string? Summary { get; set; }
    public string? Reasoning { get; set; }
}

/// <summary>
/// Request for label selection AI inference
/// </summary>
public class SelectLabelsRequest
{
    public required string Template { get; set; }
    public required string IssueTitle { get; set; }
    public required string IssueBody { get; set; }
    public List<string> AvailableLabels { get; set; } = new();
    public string? LabelPrefix { get; set; }
    public string? SpecificLabel { get; set; }
}

/// <summary>
/// AI service extensions for specific triage operations
/// </summary>
public static class AIInferenceServiceExtensions
{
    /// <summary>
    /// Parse AI response as JSON to extract structured triage information
    /// </summary>
    /// <param name="responseContent">Raw AI response content</param>
    /// <returns>Parsed triage response</returns>
    public static TriageResponse ParseTriageResponse(string responseContent)
    {
        try
        {
            // Remove code block wrapping if present
            var content = responseContent.Trim();
            if (content.StartsWith("```json"))
            {
                content = content[7..]; // Remove ```json
            }
            if (content.StartsWith("```"))
            {
                content = content[3..]; // Remove ```
            }
            if (content.EndsWith("```"))
            {
                content = content[..^3]; // Remove trailing ```
            }

            content = content.Trim();

            // Try to parse as JSON
            return JsonSerializer.Deserialize<TriageResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new TriageResponse();
        }
        catch (JsonException)
        {
            // If JSON parsing fails, treat the entire response as a summary
            return new TriageResponse
            {
                Summary = responseContent
            };
        }
    }
}