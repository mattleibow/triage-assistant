using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace TriageAssistant.Core.Prompts;

/// <summary>
/// Service for generating prompts for AI inference
/// </summary>
public interface IPromptService
{
    /// <summary>
    /// Generate system prompt for label selection
    /// </summary>
    /// <param name="template">Template type (multi-label, single-label, regression, missing-info)</param>
    /// <param name="config">Prompt configuration</param>
    /// <returns>System prompt content</returns>
    Task<string> GenerateSystemPromptAsync(string template, SelectLabelsPromptConfig config);

    /// <summary>
    /// Generate user prompt for label selection
    /// </summary>
    /// <param name="issue">Issue details</param>
    /// <param name="config">Prompt configuration</param>
    /// <returns>User prompt content</returns>
    Task<string> GenerateUserPromptAsync(IssueDetails issue, SelectLabelsPromptConfig config);

    /// <summary>
    /// Generate summary prompt
    /// </summary>
    /// <param name="triageResponse">Triage response to summarize</param>
    /// <param name="config">Summary configuration</param>
    /// <returns>Summary prompt content</returns>
    Task<string> GenerateSummaryPromptAsync(TriageResponse triageResponse, SummaryPromptConfig config);
}

/// <summary>
/// Implementation of prompt generation service
/// </summary>
public class PromptService : IPromptService
{
    private readonly ILogger<PromptService> _logger;

    public PromptService(ILogger<PromptService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<string> GenerateSystemPromptAsync(string template, SelectLabelsPromptConfig config)
    {
        _logger.LogInformation("🎯 Generating system prompt for template: {Template}", template);

        var prompt = template.ToLowerInvariant() switch
        {
            "multi-label" => GetMultiLabelSystemPrompt(config),
            "single-label" => GetSingleLabelSystemPrompt(config),
            "regression" => GetRegressionSystemPrompt(config),
            "missing-info" => GetMissingInfoSystemPrompt(config),
            _ => GetMultiLabelSystemPrompt(config)
        };

        await Task.CompletedTask; // For async interface consistency
        return prompt;
    }

    /// <inheritdoc/>
    public async Task<string> GenerateUserPromptAsync(IssueDetails issue, SelectLabelsPromptConfig config)
    {
        _logger.LogInformation("📝 Generating user prompt for issue #{IssueNumber}", issue.Number);

        var userPrompt = $"""
        # Issue Title
        {issue.Title}

        # Issue Description
        {issue.Body}

        # Issue Details
        - **Repository**: {config.Repository}
        - **Issue Number**: {issue.Number}
        - **State**: {issue.State}
        - **Author**: {issue.User.Login}
        - **Created**: {issue.CreatedAt:yyyy-MM-dd HH:mm:ss} UTC
        - **Updated**: {issue.UpdatedAt:yyyy-MM-dd HH:mm:ss} UTC

        # Community Engagement
        - **Comments**: {issue.Comments.Count}
        - **Reactions**: {issue.Reactions.Count}
        - **Assignees**: {string.Join(", ", issue.Assignees.Select(a => a.Login))}

        Please analyze this issue and suggest appropriate labels based on the content above.
        """;

        await Task.CompletedTask; // For async interface consistency
        return userPrompt;
    }

    /// <inheritdoc/>
    public async Task<string> GenerateSummaryPromptAsync(TriageResponse triageResponse, SummaryPromptConfig config)
    {
        _logger.LogInformation("📋 Generating summary prompt for issue #{IssueNumber}", config.IssueNumber);

        var labelsJson = JsonSerializer.Serialize(triageResponse, new JsonSerializerOptions { WriteIndented = true });

        var summaryPrompt = $"""
        Please generate a concise summary comment for the triage analysis results below.

        # Triage Results
        {labelsJson}

        # Requirements
        - Create a friendly, professional comment suitable for posting on a GitHub issue
        - Summarize the suggested labels and reasoning
        - Keep the tone helpful and constructive
        - Include any relevant next steps or recommendations
        - Format using GitHub markdown

        Generate the summary comment:
        """;

        await Task.CompletedTask; // For async interface consistency
        return summaryPrompt;
    }

    private static string GetMultiLabelSystemPrompt(SelectLabelsPromptConfig config)
    {
        var labelPrefix = config.LabelPrefix ?? "";
        
        return $@"You are an expert triage assistant who is able to correctly and
accurately assign multiple labels to new issues that are opened.

## Triage Process
1. Carefully analyze the issue to be labeled.
2. Locate and prioritize the key bits of information.
3. Pick all appropriate labels from the list below and assign
   them.
4. If none of the labels are correct, do not assign any labels.
5. If no issue content was provided or if there is not enough
   content to make a decision, do not assign any labels.
6. If the label that you have selected is not in the list
   of labels, then do not assign any labels.
7. If no labels match or can be assigned, then you are to reply
   with a `null` label and `null` reason.

## Labels
* The only labels that are valid for assignment are found
  between the ""===== Available Labels ====="" lines.
* Do not return a label if that label is not found in
  the list.
* Some labels have an additional description that should
  be used in order to find the best match.

===== Available Labels =====
# NOTE: In a complete implementation, this would fetch actual labels from GitHub
# For now, using common label patterns based on prefix: {labelPrefix}
- name: {labelPrefix}bug
  description: Something isn't working correctly
- name: {labelPrefix}enhancement
  description: New feature or request
- name: {labelPrefix}documentation
  description: Improvements or additions to documentation
- name: {labelPrefix}question
  description: Further information is requested
- name: {labelPrefix}help-wanted
  description: Extra attention is needed
- name: {labelPrefix}good-first-issue
  description: Good for newcomers
===== Available Labels =====

## Reasoning
* You are to also provide a reason as to why each label
  was selected to make sure that everyone knows why.
* You need to make sure to mention other related labels
  and why they were not a good selection for the issue.
* You should also provide a brief reasoning if there
  were no labels selected for assignment.
* Make sure your reason is short and concise, but
  includes the reason for the selection and the rejection.

## Response
* Respond in valid and properly formatted JSON with the
  following structure and only in this structure.
* Do not wrap the JSON in any other text or formatting,
  including code blocks or markdown as this will be read
  by a machine.

If there were appropriate labels selected for assignment,
respond with the labels and the reason for each label:

{{
  ""labels"": [
    {{
      ""label"": ""label-name"",
      ""confidence"": 0.85,
      ""reasoning"": ""Brief explanation of why this label was selected and why others were not.""
    }}
  ]
}}

If no labels could be assigned, respond with:

{{
  ""labels"": [
    {{
      ""label"": null,
      ""confidence"": 0,
      ""reasoning"": ""Brief explanation of why no labels could be assigned.""
    }}
  ]
}}";
    }

    private static string GetSingleLabelSystemPrompt(SelectLabelsPromptConfig config)
    {
        var labelPrefix = config.LabelPrefix ?? "";
        
        return $"""
        You are an expert triage assistant who is able to correctly and
        accurately assign a single label to new issues that are opened.

        ## Triage Process
        1. Carefully analyze the issue to be labeled.
        2. Locate and prioritize the key bits of information.
        3. Pick the SINGLE most appropriate label from the list below.
        4. If none of the labels are correct, do not assign any labels.
        5. If no issue content was provided or if there is not enough
           content to make a decision, do not assign any labels.

        ## Labels
        ===== Available Labels =====
        # NOTE: In a complete implementation, this would fetch actual labels from GitHub
        - name: {labelPrefix}bug
          description: Something isn't working correctly
        - name: {labelPrefix}enhancement
          description: New feature or request
        - name: {labelPrefix}documentation
          description: Improvements or additions to documentation
        - name: {labelPrefix}question
          description: Further information is requested
        ===== Available Labels =====

        ## Response
        Respond in valid JSON format with a single label:

        {
          "labels": [
            {
              "label": "most-appropriate-label",
              "confidence": 0.85,
              "reasoning": "Brief explanation of why this label was selected."
            }
          ]
        }
        """;
    }

    private static string GetRegressionSystemPrompt(SelectLabelsPromptConfig config)
    {
        var specificLabel = config.Label ?? "regression";
        
        return $"""
        You are an expert triage assistant who determines if an issue represents
        a regression (something that previously worked but is now broken).

        ## Analysis Process
        1. Look for keywords indicating something previously worked
        2. Check for version comparisons or "worked in X but not Y"
        3. Look for phrases like "used to work", "previously worked", "broke in", etc.
        4. Determine if this is truly a regression vs a new bug

        ## Response
        If this is a regression, respond with:

        {
          "labels": [
            {
              "label": "{specificLabel}",
              "confidence": 0.85,
              "reasoning": "Brief explanation of why this is considered a regression."
            }
          ]
        }

        If this is NOT a regression, respond with:

        {
          "labels": [
            {
              "label": null,
              "confidence": 0,
              "reasoning": "Brief explanation of why this is not a regression."
            }
          ]
        }
        """;
    }

    private static string GetMissingInfoSystemPrompt(SelectLabelsPromptConfig config)
    {
        return """
        You are an expert triage assistant who determines if an issue is missing
        critical information needed for proper triage and resolution.

        ## Analysis Process
        1. Check if the issue has a clear problem statement
        2. Look for steps to reproduce (for bugs)
        3. Check for expected vs actual behavior
        4. Look for environment information when relevant
        5. Assess if enough detail is provided for someone to take action

        ## Response
        If the issue is missing critical information, respond with:

        {
          "labels": [
            {
              "label": "needs-more-info",
              "confidence": 0.85,
              "reasoning": "Brief explanation of what information is missing."
            }
          ]
        }

        If the issue has sufficient information, respond with:

        {
          "labels": [
            {
              "label": null,
              "confidence": 0,
              "reasoning": "The issue contains sufficient information for triage."
            }
          ]
        }
        """;
    }
}