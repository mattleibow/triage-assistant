using TriageAssistant.Action.Models;

namespace TriageAssistant.Action.Services;

/// <summary>
/// Service for handling GitHub Action outputs
/// </summary>
public interface IActionOutputService
{
    /// <summary>
    /// Sets the GitHub Action outputs
    /// </summary>
    void SetOutputs(ActionOutputs outputs);
    
    /// <summary>
    /// Sets a specific output value
    /// </summary>
    void SetOutput(string name, string value);
}

/// <summary>
/// Implementation of action output service
/// </summary>
public class ActionOutputService : IActionOutputService
{
    public void SetOutputs(ActionOutputs outputs)
    {
        SetOutput("response-file", outputs.ResponseFile);
    }
    
    public void SetOutput(string name, string value)
    {
        // GitHub Actions expects outputs in the format: echo "name=value" >> $GITHUB_OUTPUT
        var githubOutput = Environment.GetEnvironmentVariable("GITHUB_OUTPUT");
        if (!string.IsNullOrEmpty(githubOutput))
        {
            try
            {
                File.AppendAllText(githubOutput, $"{name}={value}{Environment.NewLine}");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to write to GITHUB_OUTPUT: {ex.Message}");
                // Fallback to stdout for debugging
                Console.WriteLine($"::set-output name={name}::{value}");
            }
        }
        else
        {
            // Fallback for non-GitHub Actions environments
            Console.WriteLine($"OUTPUT {name}={value}");
        }
    }
}