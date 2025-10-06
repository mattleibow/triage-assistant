using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace TriageAssistant.Core.Services.Prompts;

/// <summary>
/// Implementation of prompt service that generates prompts from templates
/// </summary>
public class PromptService : IPromptService
{
    private readonly ILogger<PromptService> _logger;
    
    public PromptService(ILogger<PromptService> logger)
    {
        _logger = logger;
    }
    
    /// <inheritdoc />
    public async Task<string> GeneratePromptAsync(string templateContent, Dictionary<string, object> variables, string token, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Generating prompt from template");
        
        var lines = templateContent.Split('\n');
        var outputContent = new List<string>();
        
        foreach (var line in lines)
        {
            // Replace placeholders safely
            var processedLine = SubstituteTemplateVariables(line, variables);
            
            // Check for EXEC: command prefix
            var execMatch = Regex.Match(processedLine, @"^EXEC:\s*(.+)$");
            if (execMatch.Success)
            {
                var command = execMatch.Groups[1].Value;
                _logger.LogInformation("Executing command: {Command}", command);
                
                try
                {
                    var commandOutput = await ExecuteGitHubCliCommandAsync(command, token, cancellationToken);
                    var result = commandOutput.Trim().Split('\n');
                    outputContent.AddRange(result);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error executing command '{Command}': {Message}", command, ex.Message);
                    throw new InvalidOperationException($"Error executing command '{command}': {ex.Message}", ex);
                }
            }
            else
            {
                outputContent.Add(processedLine);
            }
        }
        
        var output = string.Join('\n', outputContent);
        
        _logger.LogInformation("Generated prompt from template");
        _logger.LogDebug("Generated prompt content: {Content}", SanitizeForLogging(output));
        
        return output;
    }
    
    /// <inheritdoc />
    public string GetTemplate(string templateName)
    {
        return templateName.ToLowerInvariant() switch
        {
            "multi-label" or "multi_label" => PromptTemplates.MultiLabelSystemPrompt,
            "single-label" or "single_label" => PromptTemplates.SingleLabelSystemPrompt,
            "regression" => PromptTemplates.RegressionSystemPrompt,
            "missing-info" or "missing_info" => PromptTemplates.MissingInfoSystemPrompt,
            "summary-system" or "summary_system" or "system" => PromptTemplates.SummarySystemPrompt,
            "summary-user" or "summary_user" => PromptTemplates.SummaryUserPrompt,
            "user-prompt" or "user_prompt" or "user" => PromptTemplates.UserPrompt,
            _ => throw new ArgumentException($"Unknown template: {templateName}", nameof(templateName))
        };
    }
    
    /// <summary>
    /// Substitutes template variables in a string safely
    /// </summary>
    private static string SubstituteTemplateVariables(string template, Dictionary<string, object> variables)
    {
        if (string.IsNullOrEmpty(template) || variables.Count == 0)
            return template;
            
        var result = template;
        
        foreach (var kvp in variables)
        {
            var placeholder = $"{{{kvp.Key}}}";
            var value = kvp.Value?.ToString() ?? string.Empty;
            result = result.Replace(placeholder, value);
        }
        
        return result;
    }
    
    /// <summary>
    /// Executes a GitHub CLI command and returns the output
    /// </summary>
    private async Task<string> ExecuteGitHubCliCommandAsync(string command, string token, CancellationToken cancellationToken = default)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "pwsh",
            Arguments = $"-Command \"{command}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        
        // Set environment variables
        startInfo.Environment["GH_TOKEN"] = token;
        
        using var process = new Process { StartInfo = startInfo };
        
        var outputBuilder = new StringBuilder();
        var errorBuilder = new StringBuilder();
        
        process.OutputDataReceived += (_, e) =>
        {
            if (e.Data != null)
                outputBuilder.AppendLine(e.Data);
        };
        
        process.ErrorDataReceived += (_, e) =>
        {
            if (e.Data != null)
                errorBuilder.AppendLine(e.Data);
        };
        
        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        
        await process.WaitForExitAsync(cancellationToken);
        
        if (process.ExitCode != 0)
        {
            var error = errorBuilder.ToString();
            throw new InvalidOperationException($"Command failed with exit code {process.ExitCode}: {error}");
        }
        
        return outputBuilder.ToString();
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