import * as utils from '../../src/utils.js'

describe('Content Sanitization Security Tests', () => {
  describe('AI Response Sanitization', () => {
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

      expect(truncated.length).toBeLessThanOrEqual(maxLength + 15) // +15 for "[truncated]"
      expect(truncated).toContain('[truncated]')
    })
  })

  describe('Markdown Content Sanitization', () => {
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
  })

  describe('RegEx ReDoS Prevention', () => {
    it('should safely handle special regex characters in template keys', () => {
      const maliciousKey = '.*+?^${}()|[]\\dangerous'
      const template = `Hello {{${maliciousKey}}} world`

      const startTime = Date.now()
      const result = utils.substituteTemplateVariables(template, { [maliciousKey]: 'SAFE_VALUE' })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete quickly
      expect(result).toBe('Hello SAFE_VALUE world')
    })

    it('should handle nested braces safely', () => {
      const nestedBraces = '{{{{{{{{nested}}}}}}}}'
      const template = `Content with ${nestedBraces}`

      const startTime = Date.now()
      const result = utils.substituteTemplateVariables(template, { nested: 'value' })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100)
      expect(result).toBe('Content with {{{{{{value}}}}}}')
    })

    it('should safely replace multiple template variables', () => {
      const template = 'Hello {{name}}, your issue is {{status}}'
      const replacements = { name: 'John', status: 'open' }

      const result = utils.substituteTemplateVariables(template, replacements)

      expect(result).toBe('Hello John, your issue is open')
    })
  })
})
