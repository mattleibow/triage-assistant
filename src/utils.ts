import * as core from '@actions/core'
import path from 'path'

/**
 * Sanitizes content for safe logging by truncating and removing potential sensitive data
 * @param content Content to sanitize
 * @param maxLength Maximum length for logged content
 * @returns Sanitized content safe for logging
 */
export function sanitizeForLogging(content: string, maxLength: number = 200): string {
  // Remove potential tokens, keys, secrets (basic patterns)
  const sensitivePatterns = [
    /(?:token|key|secret|password)[\s:=]+[a-zA-Z0-9+/=_-]{20,}/gi,
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
    /github_pat_[a-zA-Z0-9_]{82}/g // GitHub fine-grained tokens
  ]

  let sanitized = content
  sensitivePatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  })

  // Truncate for logging
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...[truncated]'
  }

  return sanitized
}

/**
 * Safely resolves and validates a config file path to prevent path traversal attacks
 * @param basePath The base workspace path
 * @param relativePath The relative path to the config file
 * @returns The resolved and validated absolute path
 */
export function safeConfigPath(basePath: string, relativePath: string): string {
  const resolved = path.resolve(basePath, relativePath)
  const normalizedBase = path.resolve(basePath)

  // Ensure the resolved path is within the base directory
  // Use path.relative to check if we need to traverse up from base to reach resolved
  const relative = path.relative(normalizedBase, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid config path: ${relativePath} resolves outside workspace`)
  }

  return resolved
}

/**
 * Sanitizes markdown content to prevent injection attacks while preserving formatting
 * @param content Raw markdown content
 * @returns Sanitized content safe for GitHub comments
 */
export function sanitizeMarkdownContent(content: string): string {
  // Remove any potentially dangerous HTML/script tags
  const htmlTagPattern = /<script[^>]*>.*?<\/script>/gi
  const dangerousHtml = /<(?:iframe|object|embed|form|input|meta|link)[^>]*>/gi

  let sanitized = content
    .replace(htmlTagPattern, '[REMOVED: Script tag]')
    .replace(dangerousHtml, '[REMOVED: Potentially dangerous HTML]')

  // Limit length to prevent abuse
  const MAX_COMMENT_LENGTH = 65536 // GitHub's comment limit
  if (sanitized.length > MAX_COMMENT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_COMMENT_LENGTH - 100) + '\n\n[Content truncated for safety]'
  }

  return sanitized
}

/**
 * Validates and sanitizes numeric input
 * @param input Raw string input
 * @param fieldName Field name for error messages
 * @returns Validated number or 0 if invalid
 */
export function validateNumericInput(input: string, fieldName: string): number {
  if (!input.trim()) return 0
  const num = parseInt(input, 10)
  if (isNaN(num) || num < 0) {
    core.warning(`Invalid ${fieldName}: ${input}. Using 0 as fallback.`)
    return 0
  }
  return num
}

/**
 * Validates repository identifier format
 * @param owner Repository owner
 * @param repo Repository name
 */
export function validateRepositoryId(owner: string, repo: string): void {
  const validPattern = /^[a-zA-Z0-9._-]+$/
  if (!owner || !repo || !validPattern.test(owner) || !validPattern.test(repo)) {
    throw new Error(`Invalid repository identifier: ${owner}/${repo}`)
  }
}

/**
 * Substitutes template variables in a string with their corresponding values from a replacements map.
 * @param replacements Map of variable names to their replacement values
 * @param line The input string with template variables
 * @returns The input string with all template variables replaced
 */
export function substituteTemplateVariables(replacements: Record<string, unknown>, line: string) {
  for (const [key, value] of Object.entries(replacements)) {
    // Escape special regex characters in the key to prevent ReDoS
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    line = line.replace(new RegExp(`{{${escapedKey}}}`, 'g'), String(value || ''))
  }
  return line
}
