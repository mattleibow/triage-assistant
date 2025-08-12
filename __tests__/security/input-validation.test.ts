import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

// Import the module being tested and mocked dependencies
const { validateTemplate } = await import('../../src/main.js')
const utils = await import('../../src/utils.js')

describe('Input Validation Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Repository ID Validation', () => {
    it('should reject invalid repository owner', () => {
      expect(() => utils.validateRepositoryId('../../../malicious', 'repo')).toThrow('Invalid repository identifier')
    })

    it('should reject invalid repository name', () => {
      expect(() => utils.validateRepositoryId('owner', '<script>alert("xss")</script>')).toThrow(
        'Invalid repository identifier'
      )
    })

    it('should accept valid repository identifiers', () => {
      expect(() => utils.validateRepositoryId('valid-owner_123', 'valid.repo-name')).not.toThrow()
    })
  })

  describe('Numeric Input Validation', () => {
    it('should handle invalid project numbers gracefully', () => {
      const result = utils.validateNumericInput('invalid-number', 'project number')

      expect(result).toBe(0)

      // Check that warning was called with the exact message
      expect(core.warning).toHaveBeenCalledTimes(1)
      const callArgs = (core.warning as jest.Mock).mock.calls[0][0]
      expect(callArgs).toContain('Invalid project number: invalid-number')
    })

    it('should handle negative numbers gracefully', () => {
      const result = utils.validateNumericInput('-123', 'issue number')

      expect(result).toBe(0)

      // Check that warning was called with the exact message
      expect(core.warning).toHaveBeenCalledTimes(1)
      const callArgs = (core.warning as jest.Mock).mock.calls[0][0]
      expect(callArgs).toContain('Invalid issue number: -123')
    })

    it('should accept valid positive numbers', () => {
      const result = utils.validateNumericInput('123', 'project number')

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
      expect(() => utils.safePath('/workspace', '../../../etc/passwd')).toThrow('Invalid path')
    })

    it('should accept valid relative paths', () => {
      expect(() => utils.safePath('/workspace', '.triagerc.yml')).not.toThrow()
      expect(() => utils.safePath('/workspace', 'subdir/.triagerc.yml')).not.toThrow()
    })
  })
})
