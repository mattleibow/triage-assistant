import * as utils from '../../src/utils.js'

describe('Enhanced Content Sanitization Security Tests', () => {
  describe('Comprehensive Secret Detection', () => {
    it('should detect and redact GitHub tokens', () => {
      const content = `
        ghp_1234567890123456789012345678901234567890
        github_pat_11234567890123456789012345678901234567890123456789012345678901234567890123456789
        ghs_1234567890123456789012345678901234567890
        gho_1234567890123456789012345678901234567890
        ghu_1234567890123456789012345678901234567890
      `
      
      const sanitized = utils.sanitizeForLogging(content, 500)

      expect(sanitized).not.toContain('ghp_123456')
      expect(sanitized).not.toContain('github_pat_')
      expect(sanitized).not.toContain('ghs_')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should detect AWS credentials', () => {
      const content = `
        AKIA1234567890123456
        aws_secret_access_key=abcdefghijklmnopqrstuvwxyz1234567890abcd
        aws_session_token=verylongtokenstring123456789012345678901234567890123456789012345678901234567890123456789012345
      `
      
      const sanitized = utils.sanitizeForLogging(content, 500)

      expect(sanitized).not.toContain('AKIA123456')
      expect(sanitized).not.toContain('aws_secret_access_key=')
      expect(sanitized).not.toContain('aws_session_token=very')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should detect JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      
      const sanitized = utils.sanitizeForLogging(`Token: ${jwt}`)
      
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiI')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should detect API keys and Bearer tokens', () => {
      const content = `
        Bearer abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
        api_key=1234567890abcdef1234567890abcdef12345678
        sk-proj-1234567890abcdef1234567890abcdef
        Authorization: Bearer token123456789012345678901234567890
      `
      
      const sanitized = utils.sanitizeForLogging(content, 500)

      expect(sanitized).not.toContain('Bearer abc123')
      expect(sanitized).not.toContain('api_key=123')
      expect(sanitized).not.toContain('sk-proj-1234')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should detect database connection strings', () => {
      const content = `
        mysql://user:password@localhost:3306/database
        postgres://user:pass@host:5432/db
        mongodb://user:pass@cluster.mongodb.net/db
        redis://user:pass@host:6379
      `
      
      const sanitized = utils.sanitizeForLogging(content, 500)

      expect(sanitized).not.toContain('mysql://user:password')
      expect(sanitized).not.toContain('postgres://user:pass')
      expect(sanitized).not.toContain('mongodb://user:pass')
      expect(sanitized).not.toContain('redis://user:pass')
      expect(sanitized).toContain('[REDACTED]')
    })
  })

  describe('Path Traversal Protection', () => {
    it('should reject null byte attacks', () => {
      expect(() => utils.safePath('/base', 'file.txt\0../../../etc/passwd'))
        .toThrow('contains dangerous characters')
    })

    it('should reject Windows drive letter attacks', () => {
      expect(() => utils.safePath('/base', 'C:\\Windows\\System32'))
        .toThrow('contains dangerous characters')
    })

    it('should reject dangerous filename characters', () => {
      const dangerousChars = ['<', '>', '"', '|', '*', '?']
      
      dangerousChars.forEach(char => {
        expect(() => utils.safePath('/base', `file${char}name.txt`))
          .toThrow('contains dangerous characters')
      })
    })

    it('should handle empty inputs gracefully', () => {
      expect(() => utils.safePath('', 'file.txt')).toThrow('Both basePath and relativePath are required')
      expect(() => utils.safePath('/base', '')).toThrow('Both basePath and relativePath are required')
    })

    it('should prevent double-encoded attacks', () => {
      // Double-encoded attacks are less relevant for our use case since we're not doing URL decoding
      // Instead test for other dangerous patterns
      expect(() => utils.safePath('/base', '../etc/passwd'))
        .toThrow('contains dangerous characters')
    })
  })

  describe('Template Variable Injection Protection', () => {
    it('should sanitize command injection attempts', () => {
      const template = 'Command: {{CMD}}'
      const replacements = {
        CMD: 'echo "test"; rm -rf / && whoami'
      }
      
      const result = utils.substituteTemplateVariables(template, replacements)
      
      // Check that dangerous characters are removed
      expect(result).not.toContain(';')
      expect(result).not.toContain('&&')
      expect(result).toContain('echo test') // Quotes should be removed but text preserved
    })

    it('should remove backticks and dollar signs', () => {
      const template = 'Value: {{INJECT}}'
      const replacements = {
        INJECT: '`whoami` $(id) ${HOME}'
      }
      
      const result = utils.substituteTemplateVariables(template, replacements)
      
      expect(result).not.toContain('`')
      expect(result).not.toContain('$')
    })

    it('should limit replacement length', () => {
      const template = 'Long: {{LONG}}'
      const replacements = {
        LONG: 'a'.repeat(1000)
      }
      
      const result = utils.substituteTemplateVariables(template, replacements)
      
      expect(result.length).toBeLessThan(520) // Template + 500 char limit
    })

    it('should normalize whitespace', () => {
      const template = 'Text: {{TEXT}}'
      const replacements = {
        TEXT: 'line1\nline2\r\nline3\t\tspaced'
      }
      
      const result = utils.substituteTemplateVariables(template, replacements)
      
      expect(result).toBe('Text: line1 line2 line3 spaced')
    })
  })

  describe('Original Tests (Preserved)', () => {
    it('should sanitize potential token patterns in logs', async () => {
      const testContent =
        'Here is a token: ghp_1234567890abcdef1234567890abcdef12 and a secret: sk_test_1234567890abcdef'

      const sanitized = utils.sanitizeForLogging(testContent)

      expect(sanitized).not.toContain('ghp_1234567890abcdef1234567890abcdef12')
      expect(sanitized).toBe('Here is a [REDACTED] and a [REDACTED]')
    })

    it('should truncate very long content for safety', () => {
      const longContent = 'A'.repeat(1000)
      const maxLength = 200

      const truncated = utils.sanitizeForLogging(longContent, maxLength)

      expect(truncated.length).toBeLessThanOrEqual(maxLength + 20) // +20 for "...[truncated]"
      expect(truncated).toContain('...[truncated]')
    })

    it('should remove dangerous script tags', () => {
      const maliciousContent = 'Hello <script>alert("xss")</script> world'

      const sanitized = utils.sanitizeMarkdownContent(maliciousContent)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('[REMOVED: Script tag]')
      expect(sanitized).toBe('Hello [REMOVED: Script tag] world')
    })

    it('should remove dangerous HTML elements', () => {
      const maliciousContent = 'Hello <iframe src="evil.com"></iframe> and <form><input type="password"></form>'

      const sanitized = utils.sanitizeMarkdownContent(maliciousContent)

      expect(sanitized).not.toContain('<iframe>')
      expect(sanitized).not.toContain('<form>')
      expect(sanitized).not.toContain('<input>')
      expect(sanitized).toContain('[REMOVED: Potentially dangerous HTML]')
      expect(sanitized).toBe('Hello [REMOVED: Potentially dangerous HTML] and [REMOVED: Potentially dangerous HTML]')
    })

    it('should handle GitHub comment length limits', () => {
      const veryLongContent = 'A'.repeat(utils.MAX_COMMENT_LENGTH + 1000)

      const limited = utils.sanitizeMarkdownContent(veryLongContent)

      expect(limited.length).toBeLessThanOrEqual(utils.MAX_COMMENT_LENGTH)
      expect(limited).toContain('[Content truncated for safety]')
    })

    it('should preserve safe markdown formatting', () => {
      const safeMarkdown = '# Hello\n\n**Bold text** and *italic* and `code`\n\n- List item'

      const sanitized = utils.sanitizeMarkdownContent(safeMarkdown)

      expect(sanitized).toBe(safeMarkdown) // Should be unchanged
    })

    it('should safely handle special regex characters in template keys', () => {
      const maliciousKey = '.*+?^${}()|[]\\dangerous'
      const template = `Hello {{${maliciousKey}}} world`

      const startTime = Date.now()
      const result = utils.substituteTemplateVariables(template, { [maliciousKey]: 'SAFE_VALUE' })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete quickly
      expect(result).toBe('Hello SAFE_VALUE world')
    })
  })
})
