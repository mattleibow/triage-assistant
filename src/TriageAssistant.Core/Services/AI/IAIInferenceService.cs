using TriageAssistant.Core.Models.AI;

namespace TriageAssistant.Core.Services.AI;

/// <summary>
/// Service for AI inference operations
/// </summary>
public interface IAIInferenceService
{
    /// <summary>
    /// Runs AI inference with the provided request
    /// </summary>
    /// <param name="request">The inference request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The AI response</returns>
    Task<AIInferenceResponse> RunInferenceAsync(AIInferenceRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validates the AI configuration
    /// </summary>
    /// <returns>True if configuration is valid</returns>
    bool IsConfigured { get; }
}