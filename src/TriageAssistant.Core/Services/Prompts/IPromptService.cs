namespace TriageAssistant.Core.Services.Prompts;

/// <summary>
/// Service for generating prompts from templates
/// </summary>
public interface IPromptService
{
    /// <summary>
    /// Generates a prompt from a template with variable substitution
    /// </summary>
    /// <param name="templateContent">The template content</param>
    /// <param name="variables">Variables to substitute in the template</param>
    /// <param name="token">GitHub token for CLI operations</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The generated prompt</returns>
    Task<string> GeneratePromptAsync(string templateContent, Dictionary<string, object> variables, string token, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Gets a system prompt template by name
    /// </summary>
    /// <param name="templateName">Name of the template (multi-label, single-label, regression, missing-info, summary-system, summary-user)</param>
    /// <returns>The template content</returns>
    string GetTemplate(string templateName);
}

/// <summary>
/// Represents a prompt generation request
/// </summary>
public class PromptRequest
{
    /// <summary>
    /// Template to use for prompt generation
    /// </summary>
    public string Template { get; set; } = string.Empty;
    
    /// <summary>
    /// Variables to substitute in the template
    /// </summary>
    public Dictionary<string, object> Variables { get; set; } = new();
    
    /// <summary>
    /// GitHub token for CLI operations
    /// </summary>
    public string Token { get; set; } = string.Empty;
}