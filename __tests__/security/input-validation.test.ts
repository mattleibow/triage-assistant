import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import * as github from '../../__fixtures__/actions/github.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)

// Import utils functions after mocking
const {
  validateRepositoryId,
  validateNumericInput,
  safePath,
  sanitizeForLogging,
  sanitizeMarkdownContent,
  safeReplaceText
} = await import('../../src/utils.js')

// Import main module after mocking
const { validateTemplate } = await import('../../src/main.js')

describe('Input Validation Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()

    // Mock workflow modules first before any tests run
    jest.doMock('../../src/triage/triage.js', () => ({
      runTriageWorkflow: jest.fn().mockResolvedValue('/tmp/response.json')
    }))

    jest.doMock('../../src/engagement/engagement.js', () => ({
      runEngagementWorkflow: jest.fn().mockResolvedValue('/tmp/response.json')
    }))

    // Reset GitHub context
    github.mockOctokit.context = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      issue: { number: 123, owner: 'test-owner', repo: 'test-repo' }
    }

    // Mock default inputs
    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        template: '',
        project: '',
        issue: '',
        'ai-endpoint': '',
        'ai-model': '',
        'ai-token': '',
        token: 'test-token',
        'fallback-token': 'fallback-token',
        label: '',
        'label-prefix': '',
        'project-column': '',
        'comment-footer': '',
        'apply-labels': 'false',
        'apply-comment': 'false',
        'apply-scores': 'false',
        'dry-run': 'true'
      }
      return inputs[name] || ''
    })

    core.getBooleanInput.mockImplementation((name: string) => {
      const boolInputs: Record<string, boolean> = {
        'apply-labels': false,
        'apply-comment': false,
        'apply-scores': false,
        'dry-run': true
      }
      return boolInputs[name] || false
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
    github.mockOctokit.context = undefined as unknown as typeof github.mockOctokit.context
  })

  describe('Repository ID Validation', () => {
    it('should reject invalid repository owner', () => {
      expect(() => validateRepositoryId('../../../malicious', 'repo')).toThrow('Invalid repository identifier')
    })

    it('should reject invalid repository name', () => {
      expect(() => validateRepositoryId('owner', '<script>alert("xss")</script>')).toThrow(
        'Invalid repository identifier'
      )
    })

    it('should accept valid repository identifiers', () => {
      expect(() => validateRepositoryId('valid-owner_123', 'valid.repo-name')).not.toThrow()
    })
  })

  describe('Numeric Input Validation', () => {
    it('should handle invalid project numbers gracefully', () => {
      jest.clearAllMocks() // Clear mocks before the test
      const result = validateNumericInput('invalid-number', 'project number')
      expect(result).toBe(0)
      // Check that warning was called with the exact message
      expect(core.warning).toHaveBeenCalledTimes(1)
      const callArgs = (core.warning as jest.Mock).mock.calls[0][0]
      expect(callArgs).toContain('Invalid project number: invalid-number')
    })

    it('should handle negative numbers gracefully', () => {
      jest.clearAllMocks() // Clear mocks before the test
      const result = validateNumericInput('-123', 'issue number')
      expect(result).toBe(0)
      // Check that warning was called with the exact message
      expect(core.warning).toHaveBeenCalledTimes(1)
      const callArgs = (core.warning as jest.Mock).mock.calls[0][0]
      expect(callArgs).toContain('Invalid issue number: -123')
    })

    it('should accept valid positive numbers', () => {
      jest.clearAllMocks() // Clear mocks before the test
      const result = validateNumericInput('123', 'project number')
      expect(result).toBe(123)
      expect(core.warning).not.toHaveBeenCalled()
    })
  })

  describe('Template Validation', () => {
    it('should reject invalid template names', () => {
      expect(() => validateTemplate('malicious-template')).toThrow('Invalid template: malicious-template')
    })

    it('should accept valid template names', () => {
      const validTemplates = ['multi-label', 'single-label', 'regression', 'missing-info', 'engagement-score']

      for (const template of validTemplates) {
        expect(() => validateTemplate(template)).not.toThrow()
      }
    })

    it('should accept empty template', () => {
      expect(() => validateTemplate('')).not.toThrow()
    })
  })

  describe('Path Safety', () => {
    it('should reject paths with directory traversal', () => {
      expect(() => safePath('/workspace', '../../../etc/passwd')).toThrow('Invalid path')
    })

    it('should accept valid relative paths', () => {
      expect(() => safePath('/workspace', '.triagerc.yml')).not.toThrow()
      expect(() => safePath('/workspace', 'subdir/.triagerc.yml')).not.toThrow()
    })
  })

  describe('Content Sanitization', () => {
    it('should sanitize GitHub tokens from logs', () => {
      const content = 'Here is a token: ghp_abcdefghijklmnopqrstuvwxyz1234567890'
      const result = sanitizeForLogging(content)
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('ghp_')
    })

    it('should sanitize dangerous markdown content', () => {
      const content = 'Normal text <script>alert("xss")</script> more text'
      const result = sanitizeMarkdownContent(content)
      expect(result).toContain('[REMOVED: Script tag]')
      expect(result).not.toContain('<script>')
    })

    it('should safely replace template variables', () => {
      const template = 'Hello {{name}}, your issue is {{status}}'
      const replacements = { name: 'John', status: 'open' }
      const result = safeReplaceText(template, replacements)
      expect(result).toBe('Hello John, your issue is open')
    })
  })
})
