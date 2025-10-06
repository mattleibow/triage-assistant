using System.Text.RegularExpressions;

namespace TriageAssistant.Core.Utilities;

public static class InputValidator
{
    private static readonly Regex RepositoryNamePattern = new(@"^[a-zA-Z0-9][a-zA-Z0-9._-]*$", RegexOptions.Compiled);
    private static readonly string[] ValidModes = { "apply-labels", "engagement-score" };

    public static void ValidateRepositoryId(string owner, string repo)
    {
        if (string.IsNullOrWhiteSpace(owner) || string.IsNullOrWhiteSpace(repo))
        {
            throw new ArgumentException("Repository owner and name cannot be empty");
        }

        if (!RepositoryNamePattern.IsMatch(owner) || !RepositoryNamePattern.IsMatch(repo))
        {
            throw new ArgumentException("Invalid repository identifier");
        }

        // Check for path traversal attempts
        if (owner.Contains("..") || repo.Contains("..") || 
            owner.Contains('<') || repo.Contains('>') ||
            owner.Contains("script", StringComparison.OrdinalIgnoreCase) ||
            repo.Contains("script", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid repository identifier");
        }
    }

    public static int ValidateNumericInput(string input, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return 0;
        }

        if (!int.TryParse(input, out var result) || result < 0)
        {
            Console.WriteLine($"Warning: Invalid {fieldName}: {input}. Using 0 instead.");
            return 0;
        }

        return result;
    }

    public static void ValidateMode(string mode)
    {
        if (string.IsNullOrWhiteSpace(mode))
        {
            return; // Empty mode is allowed (defaults to apply-labels)
        }

        if (!ValidModes.Contains(mode))
        {
            throw new ArgumentException($"Invalid mode: {mode}");
        }
    }

    public static string SafePath(string basePath, string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            throw new ArgumentException("Path cannot be empty");
        }

        // Check for path traversal attempts
        if (relativePath.Contains("..") || relativePath.StartsWith('/') || relativePath.Contains('\\'))
        {
            throw new ArgumentException("Invalid path");
        }

        var fullPath = Path.Combine(basePath, relativePath);
        var normalizedPath = Path.GetFullPath(fullPath);

        // Ensure the resolved path is still within the base directory
        if (!normalizedPath.StartsWith(Path.GetFullPath(basePath)))
        {
            throw new ArgumentException("Invalid path");
        }

        return normalizedPath;
    }
}