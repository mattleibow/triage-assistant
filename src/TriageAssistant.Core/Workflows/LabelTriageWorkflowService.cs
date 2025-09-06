using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using TriageAssistant.Core.GitHub;
using TriageAssistant.Core.AI;
using TriageAssistant.Core.Prompts;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace TriageAssistant.Core.Workflows;

/// <summary>
/// Service for running the label triage workflow
/// </summary>
public interface ILabelTriageWorkflowService
{
    /// <summary>
    /// Run the complete label triage workflow for a single issue
    /// </summary>
    /// <param name="config">Label triage configuration</param>
    /// <param name="configFile">Configuration file with label groups</param>
    /// <returns>Response file path</returns>
    Task<string> RunSingleIssueTriageAsync(LabelTriageWorkflowConfig config, ConfigFileLabels configFile);

    /// <summary>
    /// Run the complete label triage workflow for multiple issues from search
    /// </summary>
    /// <param name="config">Bulk triage configuration</param>
    /// <param name="configFile">Configuration file with label groups</param>
    /// <returns>Response file path</returns>
    Task<string> RunBulkTriageAsync(BulkLabelTriageWorkflowConfig config, ConfigFileLabels configFile);
}

/// <summary>
/// Implementation of the label triage workflow service
/// </summary>
public class LabelTriageWorkflowService : ILabelTriageWorkflowService
{
    private readonly IGitHubIssuesService _githubService;
    private readonly IAiInferenceService _aiService;
    private readonly IPromptService _promptService;
    private readonly ILogger<LabelTriageWorkflowService> _logger;

    public LabelTriageWorkflowService(
        IGitHubIssuesService githubService,
        IAiInferenceService aiService,
        IPromptService promptService,
        ILogger<LabelTriageWorkflowService> logger)
    {
        _githubService = githubService;
        _aiService = aiService;
        _promptService = promptService;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<string> RunSingleIssueTriageAsync(LabelTriageWorkflowConfig config, ConfigFileLabels configFile)
    {
        if (!config.IssueNumber.HasValue)
        {
            throw new ArgumentException("Issue number is required for single issue triage");
        }

        var issueNumber = config.IssueNumber.Value;
        _logger.LogInformation("🔍 Starting single issue triage for issue #{IssueNumber}", issueNumber);

        var shouldAddLabels = configFile.Groups.Count > 0;
        var shouldAddSummary = config.ApplyLabels || config.ApplyComment;
        var shouldAddReactions = shouldAddLabels || shouldAddSummary;

        try
        {
            // Step 1: Add eyes reaction at the start
            if (shouldAddReactions)
            {
                var reactionConfig = CreateReactionConfig(config, issueNumber);
                await _githubService.AddEyesAsync(reactionConfig);
            }

            // Get issue details for AI processing
            var issue = await _githubService.GetIssueDetailsAsync(config.RepoOwner, config.RepoName, issueNumber);

            // Step 2: Select labels for each group
            var allResponses = new List<TriageResponse>();
            if (shouldAddLabels)
            {
                foreach (var (groupName, groupConfig) in configFile.Groups)
                {
                    _logger.LogInformation("🏷️ Selecting labels for group '{GroupName}' with template '{Template}'", 
                        groupName, groupConfig.Template);

                    var labelConfig = CreateSelectLabelsConfig(config, issue, groupConfig);
                    var response = await ProcessLabelGroupAsync(issue, labelConfig, groupConfig.Template);
                    allResponses.Add(response);
                }
            }

            // Step 3: Merge responses and apply labels/comments
            string responseFile = "";
            if (shouldAddSummary)
            {
                responseFile = await MergeAndApplyTriageAsync(config, allResponses);
            }

            return responseFile;
        }
        finally
        {
            // Step 4: Remove eyes reaction at the end
            if (shouldAddReactions)
            {
                var reactionConfig = CreateReactionConfig(config, issueNumber);
                await _githubService.RemoveEyesAsync(reactionConfig);
            }
        }
    }

    /// <inheritdoc/>
    public async Task<string> RunBulkTriageAsync(BulkLabelTriageWorkflowConfig config, ConfigFileLabels configFile)
    {
        if (string.IsNullOrEmpty(config.IssueQuery))
        {
            throw new ArgumentException("Issue query is required for bulk triage");
        }

        _logger.LogInformation("🔍 Starting bulk triage with query: {Query}", config.IssueQuery);

        // Search for issues
        var issues = await _githubService.SearchIssuesAsync(config.IssueQuery, config.RepoOwner, config.RepoName);

        if (issues.Count == 0)
        {
            _logger.LogInformation("⚠️ No issues found matching the search query");
            return await CreateEmptyResponseFileAsync(config.TempDir);
        }

        _logger.LogInformation("📋 Processing {Count} issues from search results", issues.Count);

        var itemResults = new Dictionary<int, TriageResponse>();

        // Process each issue individually
        foreach (var issue in issues)
        {
            try
            {
                _logger.LogInformation("🔧 Processing issue #{IssueNumber}: {Title}", issue.Number, issue.Title);

                // Create single issue config for this item
                var itemConfig = new LabelTriageWorkflowConfig
                {
                    Token = config.Token,
                    RepoOwner = config.RepoOwner,
                    RepoName = config.RepoName,
                    Repository = config.Repository,
                    IssueNumber = issue.Number,
                    AiEndpoint = config.AiEndpoint,
                    AiModel = config.AiModel,
                    AiToken = config.AiToken,
                    ApplyLabels = config.ApplyLabels,
                    ApplyComment = config.ApplyComment,
                    CommentFooter = config.CommentFooter,
                    DryRun = config.DryRun,
                    TempDir = Path.Combine(config.TempDir, $"item-{issue.Number}")
                };

                // Run single issue triage
                var responseFile = await RunSingleIssueTriageAsync(itemConfig, configFile);

                // Load and store the response
                if (File.Exists(responseFile))
                {
                    var responseContent = await File.ReadAllTextAsync(responseFile);
                    var response = JsonSerializer.Deserialize<TriageResponse>(responseContent);
                    if (response != null)
                    {
                        itemResults[issue.Number] = response;
                        _logger.LogInformation("✅ Successfully processed issue #{IssueNumber}", issue.Number);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to process issue #{IssueNumber}: {Message}", issue.Number, ex.Message);
                // Continue with other issues even if one fails
            }
        }

        // Create final merged response file
        var finalResponseFile = Path.Combine(config.TempDir, "triage-assistant", "bulk-responses.json");
        Directory.CreateDirectory(Path.GetDirectoryName(finalResponseFile)!);
        
        var bulkResults = new
        {
            processed = itemResults.Count,
            total = issues.Count,
            results = itemResults
        };
        
        await File.WriteAllTextAsync(finalResponseFile, JsonSerializer.Serialize(bulkResults, new JsonSerializerOptions { WriteIndented = true }));

        _logger.LogInformation("🎉 Bulk triage complete. Processed {Processed} of {Total} issues successfully", 
            itemResults.Count, issues.Count);

        return finalResponseFile;
    }

    private async Task<TriageResponse> ProcessLabelGroupAsync(IssueDetails issue, SelectLabelsPromptConfig config, string template)
    {
        try
        {
            // Generate prompts
            var systemPrompt = await _promptService.GenerateSystemPromptAsync(template, config);
            var userPrompt = await _promptService.GenerateUserPromptAsync(issue, config);

            // Create inference config
            var inferenceConfig = new InferenceConfig
            {
                AiEndpoint = config.AiEndpoint,
                AiModel = config.AiModel,
                AiToken = config.AiToken
            };

            // Run AI inference
            var aiResponse = await _aiService.InferAsync(inferenceConfig, systemPrompt, userPrompt);

            // Parse AI response into TriageResponse
            var triageResponse = JsonSerializer.Deserialize<TriageResponse>(aiResponse) ?? new TriageResponse();
            
            _logger.LogInformation("🤖 AI suggested {LabelCount} labels for template '{Template}'", 
                triageResponse.Labels?.Count ?? 0, template);

            return triageResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to process label group with template '{Template}': {Message}", template, ex.Message);
            return new TriageResponse
            {
                Labels = new List<LabelSuggestion>
                {
                    new() { Label = "needs-triage", Confidence = 0.5, Reasoning = "Error during AI processing" }
                }
            };
        }
    }

    private async Task<string> MergeAndApplyTriageAsync(LabelTriageWorkflowConfig config, List<TriageResponse> responses)
    {
        // Merge all responses
        var mergedResponse = new TriageResponse
        {
            Labels = responses.SelectMany(r => r.Labels ?? new List<LabelSuggestion>()).ToList(),
            Summary = string.Join("\n", responses.Where(r => !string.IsNullOrEmpty(r.Summary)).Select(r => r.Summary)),
            Reasoning = string.Join("\n", responses.Where(r => !string.IsNullOrEmpty(r.Reasoning)).Select(r => r.Reasoning))
        };

        // Save merged response
        var responseFile = Path.Combine(config.TempDir, "triage-assistant", "merged-response.json");
        Directory.CreateDirectory(Path.GetDirectoryName(responseFile)!);
        await File.WriteAllTextAsync(responseFile, JsonSerializer.Serialize(mergedResponse, new JsonSerializerOptions { WriteIndented = true }));

        _logger.LogInformation("📄 Merged response: {LabelCount} labels from {GroupCount} groups", 
            mergedResponse.Labels?.Count ?? 0, responses.Count);

        // Apply labels if requested
        if (config.ApplyLabels && mergedResponse.Labels?.Any() == true)
        {
            var labels = mergedResponse.Labels
                .Where(l => !string.IsNullOrEmpty(l.Label))
                .Select(l => l.Label!)
                .ToArray();

            var labelConfig = new ApplyLabelsConfig
            {
                RepoOwner = config.RepoOwner,
                RepoName = config.RepoName,
                IssueNumber = config.IssueNumber ?? 0,
                Token = config.Token,
                ApplyLabels = true,
                DryRun = config.DryRun,
                TempDir = config.TempDir
            };

            await _githubService.ApplyLabelsToIssueAsync(labels, labelConfig);
        }

        // Generate and apply comment if requested
        if (config.ApplyComment)
        {
            var summaryConfig = new SummaryPromptConfig
            {
                Token = config.Token,
                Repository = config.Repository,
                IssueNumber = config.IssueNumber ?? 0
            };

            var summaryPrompt = await _promptService.GenerateSummaryPromptAsync(mergedResponse, summaryConfig);
            
            var inferenceConfig = new InferenceConfig
            {
                AiEndpoint = config.AiEndpoint,
                AiModel = config.AiModel,
                AiToken = config.AiToken
            };

            var summary = await _aiService.GenerateSummaryAsync(inferenceConfig, summaryPrompt);

            // Save summary to file
            var summaryFile = Path.Combine(config.TempDir, "triage-assistant", "summary.md");
            await File.WriteAllTextAsync(summaryFile, summary);

            // Apply comment
            var commentConfig = new ApplySummaryCommentConfig
            {
                RepoOwner = config.RepoOwner,
                RepoName = config.RepoName,
                IssueNumber = config.IssueNumber ?? 0,
                Token = config.Token,
                ApplyComment = true,
                CommentFooter = config.CommentFooter,
                Repository = config.Repository,
                AiEndpoint = config.AiEndpoint,
                AiModel = config.AiModel,
                AiToken = config.AiToken,
                DryRun = config.DryRun,
                TempDir = config.TempDir
            };

            await _githubService.CommentOnIssueAsync(summaryFile, commentConfig, config.CommentFooter);
        }

        return responseFile;
    }

    private static ApplyReactionsConfig CreateReactionConfig(LabelTriageWorkflowConfig config, int issueNumber)
    {
        return new ApplyReactionsConfig
        {
            RepoOwner = config.RepoOwner,
            RepoName = config.RepoName,
            IssueNumber = issueNumber,
            Token = config.Token,
            DryRun = config.DryRun,
            TempDir = config.TempDir
        };
    }

    private static SelectLabelsPromptConfig CreateSelectLabelsConfig(LabelTriageWorkflowConfig config, IssueDetails issue, ConfigFileLabelGroup groupConfig)
    {
        return new SelectLabelsPromptConfig
        {
            Token = config.Token,
            IssueNumber = issue.Number,
            Repository = config.Repository,
            Label = groupConfig.Label,
            LabelPrefix = groupConfig.LabelPrefix,
            AiEndpoint = config.AiEndpoint,
            AiModel = config.AiModel,
            AiToken = config.AiToken
        };
    }

    private static async Task<string> CreateEmptyResponseFileAsync(string tempDir)
    {
        var responseFile = Path.Combine(tempDir, "triage-assistant", "empty-response.json");
        Directory.CreateDirectory(Path.GetDirectoryName(responseFile)!);
        await File.WriteAllTextAsync(responseFile, "{}");
        return responseFile;
    }
}