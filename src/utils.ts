import * as core from '@actions/core'
import path from 'path'

export const MAX_COMMENT_LENGTH = 65536 // GitHub's comment limit

/**
 * Sanitizes content for safe logging by truncating and removing potential sensitive data
 * @param content Content to sanitize
 * @param maxLength Maximum length for logged content
 * @returns Sanitized content safe for logging
 */
export function sanitizeForLogging(content: string, maxLength: number = 200): string {
  // Comprehensive patterns for various token types and secrets
  const sensitivePatterns = [
    // Generic patterns
    /(?:token|key|secret|password|auth|credential)[\s:=]+[a-zA-Z0-9+/=_-]{20,}/gi,
    /(?:bearer\s+)[a-zA-Z0-9+/=_-]{20,}/gi,
    
    // GitHub tokens
    /ghp_[a-zA-Z0-9]{36}/g, // Personal access tokens
    /github_pat_[a-zA-Z0-9_]{82}/g, // Fine-grained tokens
    /ghs_[a-zA-Z0-9]{36}/g, // GitHub App installation tokens
    /gho_[a-zA-Z0-9]{36}/g, // OAuth tokens
    /ghu_[a-zA-Z0-9]{36}/g, // GitHub user-to-server tokens
    
    // AWS credentials
    /AKIA[0-9A-Z]{16}/g, // AWS access key IDs
    /(?:aws_secret_access_key|secretAccessKey)[\s:=]+[a-zA-Z0-9+/]{40}/gi,
    /(?:aws_session_token|sessionToken)[\s:=]+[a-zA-Z0-9+/=]{100,}/gi,
    
    // Azure tokens
    /(?:azure|az)[\s_-]?(?:token|key|secret)[\s:=]+[a-zA-Z0-9+/=_-]{40,}/gi,
    
    // JWT tokens (basic detection)
    /eyJ[a-zA-Z0-9+/=_-]{100,}/g,
    
    // API keys (common formats)
    /(?:api[_-]?key|apikey)[\s:=]+[a-zA-Z0-9+/=_-]{20,}/gi,
    /sk-[a-zA-Z0-9]{32,}/g, // OpenAI style keys
    
    // Database connection strings
    /(?:mysql|postgres|mongodb|redis):\/\/[^\\s'"]+/gi,
    
    // Common credential patterns
    /\b[a-zA-Z0-9]{32}\b/g, // 32-char hex strings (potential tokens)
    /\b[a-zA-Z0-9+/=]{40,}\b/g // Base64 encoded secrets (40+ chars)
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
 * Safely resolves and validates a path to prevent path traversal attacks
 * Also validates that the resolved path is safe for file operations
 * @param basePath The base workspace path
 * @param relativePath The relative path to resolve
 * @returns The resolved and validated absolute path
 * @throws Error if path is unsafe or resolves outside base directory
 */
export function safePath(basePath: string, relativePath: string): string {
  // Input validation
  if (!basePath || !relativePath) {
    throw new Error('Both basePath and relativePath are required')
  }

  // Normalize inputs to prevent bypass attempts
  const normalizedBase = path.resolve(basePath)
  const normalizedRelative = relativePath.replace(/\\/g, '/') // Normalize separators
  
  // Check for dangerous patterns in relativePath
  const dangerousPatterns = [
    /\.\./,           // Directory traversal
    /^\/+/,           // Absolute path attempts
    /^[a-zA-Z]:/,     // Windows drive letters
    /\0/,             // Null bytes
    /[<>"|*?]/,       // Dangerous filename characters
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalizedRelative)) {
      throw new Error(`Invalid path: ${relativePath} contains dangerous characters or patterns`)
    }
  }

  const resolved = path.resolve(normalizedBase, normalizedRelative)

  // Ensure the resolved path is within the base directory
  // Use path.relative to check if we need to traverse up from base to reach resolved
  const relative = path.relative(normalizedBase, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid path: ${relativePath} resolves outside base directory`)
  }

  // Additional safety check - ensure the resolved path doesn't contain suspicious segments
  const pathSegments = resolved.split(path.sep)
  for (const segment of pathSegments) {
    if (segment === '..') {
      throw new Error(`Invalid path: resolved path contains directory traversal segment`)
    }
  }

  return resolved
}

/**
 * Sanitizes markdown content to prevent injection attacks while preserving formatting
 * @param content Raw markdown content
 * @returns Sanitized content safe for GitHub comments
 */
export function sanitizeMarkdownContent(content: string): string {
  // Match complete <script> blocks across lines
  const scriptBlockPattern = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi
  // Match complete paired dangerous elements (remove the whole block including closing tag and inner content)
  const pairedDangerousBlocks = /<\s*(iframe|object|embed|form)\b[^>]*>[\s\S]*?<\s*\/\1\s*>/gi
  // Match self-closing or standalone dangerous tags
  const selfClosingDangerous = /<\s*(?:input|meta|link)\b[^>]*\/?\s*>/gi

  // Remove any potentially dangerous HTML/script tags
  let sanitized = content
    .replace(scriptBlockPattern, '[REMOVED: Script tag]')
    .replace(pairedDangerousBlocks, '[REMOVED: Potentially dangerous HTML]')
    .replace(selfClosingDangerous, '[REMOVED: Potentially dangerous HTML]')

  // Limit length to prevent abuse
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
 * Includes input sanitization to prevent command injection attacks.
 * @param replacements Map of variable names to their replacement values
 * @param line The input string with template variables
 * @returns The input string with all template variables replaced
 */
export function substituteTemplateVariables(line: string, replacements: Record<string, unknown>): string {
  for (const [key, value] of Object.entries(replacements)) {
    // Sanitize replacement values to prevent injection attacks
    const sanitizedValue = sanitizeReplacementValue(String(value || ''))
    
    // Escape special regex characters in the key to prevent ReDoS
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    line = line.replace(new RegExp(`{{${escapedKey}}}`, 'g'), sanitizedValue)
  }
  return line
}

/**
 * Sanitizes a replacement value to prevent command injection
 * @param value The value to sanitize
 * @returns Sanitized value safe for template substitution
 */
function sanitizeReplacementValue(value: string): string {
  // Remove or escape dangerous characters that could be used for command injection
  return value
    .replace(/[`$(){}[\]\\|&;><]/g, '') // Remove command injection chars
    .replace(/\n|\r/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 500) // Limit length to prevent abuse
}
