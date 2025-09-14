namespace TriageAssistant.Core.Utils;

/// <summary>
/// Utility class for safe path operations
/// </summary>
public static class PathUtils
{
    /// <summary>
    /// Safely resolves and validates a path to prevent path traversal attacks
    /// </summary>
    /// <param name="basePath">The base workspace path</param>
    /// <param name="relativePath">The relative path to resolve</param>
    /// <returns>The resolved and validated absolute path</returns>
    public static string SafePath(string basePath, string relativePath)
    {
        var resolved = Path.GetFullPath(Path.Combine(basePath, relativePath));
        var normalizedBase = Path.GetFullPath(basePath);

        // Ensure the resolved path is within the base path
        if (!resolved.StartsWith(normalizedBase + Path.DirectorySeparatorChar) && resolved != normalizedBase)
        {
            throw new ArgumentException($"Path traversal detected: {relativePath} resolves outside {basePath}");
        }

        return resolved;
    }

    /// <summary>
    /// Safely resolves and validates a path with multiple components
    /// </summary>
    /// <param name="basePath">The base workspace path</param>
    /// <param name="pathComponents">Array of path components to combine</param>
    /// <returns>The resolved and validated absolute path</returns>
    public static string SafePath(string basePath, params string[] pathComponents)
    {
        var relativePath = Path.Combine(pathComponents);
        return SafePath(basePath, relativePath);
    }

    /// <summary>
    /// Ensures a directory exists, creating it if necessary
    /// </summary>
    /// <param name="directoryPath">Path to the directory</param>
    /// <returns>Task representing the async operation</returns>
    public static async Task EnsureDirectoryExistsAsync(string directoryPath)
    {
        await Task.Run(() =>
        {
            if (!Directory.Exists(directoryPath))
            {
                Directory.CreateDirectory(directoryPath);
            }
        });
    }

    /// <summary>
    /// Safely reads a file ensuring it exists and is within allowed paths
    /// </summary>
    /// <param name="filePath">Path to the file</param>
    /// <returns>File content as string</returns>
    public static async Task<string> ReadFileAsync(string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File not found: {filePath}");
        }

        return await File.ReadAllTextAsync(filePath);
    }

    /// <summary>
    /// Safely writes content to a file, ensuring the directory exists
    /// </summary>
    /// <param name="filePath">Path to the file</param>
    /// <param name="content">Content to write</param>
    /// <returns>Task representing the async operation</returns>
    public static async Task WriteFileAsync(string filePath, string content)
    {
        var directory = Path.GetDirectoryName(filePath);
        if (directory != null)
        {
            await EnsureDirectoryExistsAsync(directory);
        }

        await File.WriteAllTextAsync(filePath, content);
    }
}