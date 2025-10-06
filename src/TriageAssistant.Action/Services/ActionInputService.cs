using System.CommandLine.Invocation;
using TriageAssistant.Action.Models;

namespace TriageAssistant.Action.Services;

/// <summary>
/// Service for parsing GitHub Action inputs from command line and environment variables
/// </summary>
public interface IActionInputService
{
    /// <summary>
    /// Parses inputs from environment variables (GitHub Actions style)
    /// </summary>
    ActionInputs ParseInputs();
}

/// <summary>
/// Implementation of action input parsing service
/// </summary>
public class ActionInputService : IActionInputService
{
    private const string DefaultAiEndpoint = "https://models.github.ai/inference";
    private const string DefaultAiModel = "openai/gpt-4o";
    private const string DefaultProjectColumn = "Engagement Score";
    private const string DefaultCommentFooter = "_This entire triage process was automated by AI and mistakes may have been made. Please let us know so we can continue to improve._";
    
    public ActionInputs ParseInputs()
    {
        var inputs = new ActionInputs();
        
        // Parse mode
        var modeStr = GetInputValue("mode") ?? "apply-labels";
        inputs.Mode = ParseMode(modeStr);
        
        // Parse tokens
        inputs.Token = GetInputValue("token") ?? 
                      Environment.GetEnvironmentVariable("TRIAGE_GITHUB_TOKEN") ?? 
                      Environment.GetEnvironmentVariable("GITHUB_TOKEN") ?? 
                      string.Empty;
        
        inputs.FallbackToken = GetInputValue("fallback-token") ?? 
                              Environment.GetEnvironmentVariable("GITHUB_TOKEN") ?? 
                              string.Empty;
        
        // Parse AI configuration
        inputs.AiEndpoint = GetInputValue("ai-endpoint") ?? 
                           Environment.GetEnvironmentVariable("TRIAGE_AI_ENDPOINT") ?? 
                           DefaultAiEndpoint;
        
        inputs.AiModel = GetInputValue("ai-model") ?? 
                        Environment.GetEnvironmentVariable("TRIAGE_AI_MODEL") ?? 
                        DefaultAiModel;
        
        inputs.AiToken = GetInputValue("ai-token") ?? 
                        Environment.GetEnvironmentVariable("TRIAGE_AI_TOKEN") ?? 
                        string.Empty;
        
        // Parse issue configuration
        inputs.Issue = ParseIntInput("issue");
        inputs.IssueQuery = GetInputValue("issue-query") ?? string.Empty;
        
        // Parse project configuration
        inputs.Project = ParseIntInput("project");
        inputs.ProjectColumn = GetInputValue("project-column") ?? DefaultProjectColumn;
        inputs.ApplyScores = ParseBoolInput("apply-scores");
        
        // Parse label and comment configuration
        inputs.ApplyLabels = ParseBoolInput("apply-labels");
        inputs.ApplyComment = ParseBoolInput("apply-comment");
        inputs.CommentFooter = GetInputValue("comment-footer") ?? DefaultCommentFooter;
        inputs.DryRun = ParseBoolInput("dry-run");
        
        // Parse repository context from environment
        ParseRepositoryContext(inputs);
        
        // Validate inputs based on mode
        ValidateInputs(inputs);
        
        return inputs;
    }
    
    private static TriageMode ParseMode(string modeStr)
    {
        return modeStr.ToLowerInvariant() switch
        {
            "apply-labels" => TriageMode.ApplyLabels,
            "engagement-score" => TriageMode.EngagementScore,
            _ => throw new ArgumentException($"Invalid mode: {modeStr}. Valid modes are: apply-labels, engagement-score")
        };
    }
    
    private static T? GetOptionValue<T>(InvocationContext context, string optionName)
    {
        // For System.CommandLine, we need to find the option by name and get its value
        var parseResult = context.ParseResult;
        var option = parseResult.CommandResult.Command.Options.FirstOrDefault(o => o.Name == optionName.TrimStart('-'));
        if (option != null)
        {
            var value = parseResult.GetValueForOption(option);
            if (value is T typedValue)
            {
                return typedValue;
            }
        }
        return default;
    }
    
    /// <summary>
    /// Get input value from GitHub Actions INPUT_ environment variables
    /// </summary>
    private static string? GetInputValue(string name)
    {
        // GitHub Actions sets inputs as INPUT_<UPPERCASE_NAME> environment variables
        var envVarName = $"INPUT_{name.ToUpperInvariant().Replace('-', '_')}";
        return Environment.GetEnvironmentVariable(envVarName);
    }
    
    /// <summary>
    /// Parse integer input from environment variables
    /// </summary>
    private static int? ParseIntInput(string name)
    {
        var value = GetInputValue(name);
        if (string.IsNullOrEmpty(value))
            return null;
            
        if (int.TryParse(value, out var result))
            return result;
            
        throw new ArgumentException($"Invalid integer value for input '{name}': {value}");
    }
    
    /// <summary>
    /// Parse boolean input from environment variables
    /// </summary>
    private static bool ParseBoolInput(string name)
    {
        var value = GetInputValue(name);
        return !string.IsNullOrEmpty(value) && 
               (value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1");
    }
    
    private static void ParseRepositoryContext(ActionInputs inputs)
    {
        // GitHub Actions sets these environment variables
        var repoFullName = Environment.GetEnvironmentVariable("GITHUB_REPOSITORY");
        if (!string.IsNullOrEmpty(repoFullName))
        {
            var parts = repoFullName.Split('/', 2);
            if (parts.Length == 2)
            {
                inputs.RepoOwner = parts[0];
                inputs.RepoName = parts[1];
                inputs.Repository = repoFullName;
            }
        }
        
        inputs.TempDir = Environment.GetEnvironmentVariable("RUNNER_TEMP") ?? 
                        Environment.GetEnvironmentVariable("TMPDIR") ?? 
                        Path.GetTempPath();
    }
    
    private static void ValidateInputs(ActionInputs inputs)
    {
        // Validate repository context
        if (string.IsNullOrEmpty(inputs.RepoOwner) || string.IsNullOrEmpty(inputs.RepoName))
        {
            throw new InvalidOperationException("Repository owner and name must be specified via GITHUB_REPOSITORY environment variable");
        }
        
        // Mode-specific validation
        switch (inputs.Mode)
        {
            case TriageMode.EngagementScore:
                if (!inputs.Project.HasValue && !inputs.Issue.HasValue)
                {
                    throw new InvalidOperationException("Either project or issue must be specified when calculating engagement scores");
                }
                break;
                
            case TriageMode.ApplyLabels:
                if (!inputs.Issue.HasValue && string.IsNullOrEmpty(inputs.IssueQuery))
                {
                    throw new InvalidOperationException("Issue number or issue query is required for applying labels");
                }
                if (inputs.Issue.HasValue && !string.IsNullOrEmpty(inputs.IssueQuery))
                {
                    throw new InvalidOperationException("Cannot specify both issue number and issue query - please use only one");
                }
                break;
        }
        
        // Token validation
        if (string.IsNullOrEmpty(inputs.EffectiveToken))
        {
            throw new InvalidOperationException("GitHub token is required");
        }
    }
}