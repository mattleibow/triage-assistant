/**
 * Unit tests for missing info functionality in src/github/issues.ts
 */
import { jest } from '@jest/globals'
import { MissingInfoPayload } from '../../src/triage/triage-response.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

// Import the module being tested
const { buildNeedsInfoComment } = await import('../../src/github/issues.js')

describe('Missing Info Functionality', () => {
  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
    inMemoryFs.setup()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  describe('buildNeedsInfoComment', () => {
    it('should build complete comment with all sections', () => {
      const data: MissingInfoPayload = {
        summary: 'App crashes on startup',
        repro: {
          has_clear_description: true,
          has_steps: false,
          has_code: false,
          links: ['https://example.com/docs']
        },
        missing: ['steps', 'code'],
        questions: ['Can you provide steps to reproduce the issue?', 'Can you share a minimal code sample?'],
        labels: [
          { label: 's/needs-info', reason: 'Missing reproduction steps' },
          { label: 's/needs-repro', reason: 'No code sample provided' }
        ]
      }

      const comment = buildNeedsInfoComment(data)

      expect(comment).toContain('<!-- triage-assistant:needs-info-comment -->')
      expect(comment).toContain('Thank you for reporting this issue!')
      expect(comment).toContain('**Issue Summary**: App crashes on startup')
      expect(comment).toContain('## Missing Information')
      expect(comment).toContain('Clear steps to reproduce the issue')
      expect(comment).toContain('Code samples, repository link, or minimal reproducer')
      expect(comment).toContain('## Questions')
      expect(comment).toContain('1. Can you provide steps to reproduce the issue?')
      expect(comment).toContain('2. Can you share a minimal code sample?')
      expect(comment).toContain('## Helpful Links')
      expect(comment).toContain('https://example.com/docs')
    })

    it('should handle minimal data without optional sections', () => {
      const data: MissingInfoPayload = {
        summary: 'Simple issue',
        repro: {
          has_clear_description: true,
          has_steps: true,
          has_code: true,
          links: []
        },
        missing: [],
        questions: [],
        labels: []
      }

      const comment = buildNeedsInfoComment(data)

      expect(comment).toContain('<!-- triage-assistant:needs-info-comment -->')
      expect(comment).toContain('Thank you for reporting this issue!')
      expect(comment).toContain('**Issue Summary**: Simple issue')
      expect(comment).not.toContain('## Missing Information')
      expect(comment).not.toContain('## Questions')
      expect(comment).not.toContain('## Helpful Links')
      expect(comment).toContain('Once you provide this information')
    })

    it('should include security warning when logs are requested', () => {
      const data: MissingInfoPayload = {
        summary: 'Error in logs',
        repro: {
          has_clear_description: true,
          has_steps: true,
          has_code: true,
          links: []
        },
        missing: [],
        questions: ['Can you share the error logs from your application?'],
        labels: []
      }

      const comment = buildNeedsInfoComment(data)

      expect(comment).toContain('When sharing logs or error messages')
      expect(comment).toContain('sensitive information')
    })

    it('should include security warning when stack trace is requested', () => {
      const data: MissingInfoPayload = {
        summary: 'Exception thrown',
        repro: {
          has_clear_description: true,
          has_steps: true,
          has_code: true,
          links: []
        },
        missing: [],
        questions: ['What is the full stack trace of the exception?'],
        labels: []
      }

      const comment = buildNeedsInfoComment(data)

      expect(comment).toContain('When sharing logs or error messages')
    })

    it('should properly map missing field names to descriptions', () => {
      const data: MissingInfoPayload = {
        summary: 'Issue description',
        repro: {
          has_clear_description: false,
          has_steps: false,
          has_code: false,
          links: []
        },
        missing: ['steps', 'code', 'description', 'custom-field'],
        questions: [],
        labels: []
      }

      const comment = buildNeedsInfoComment(data)

      expect(comment).toContain('Clear steps to reproduce the issue')
      expect(comment).toContain('Code samples, repository link, or minimal reproducer')
      expect(comment).toContain('Detailed description of the expected vs actual behavior')
      expect(comment).toContain('custom-field')
    })

    it('should handle empty summary', () => {
      const data: MissingInfoPayload = {
        summary: '',
        repro: {
          has_clear_description: true,
          has_steps: false,
          has_code: false,
          links: []
        },
        missing: ['steps'],
        questions: ['How do you reproduce this?'],
        labels: []
      }

      const comment = buildNeedsInfoComment(data)

      expect(comment).toContain('<!-- triage-assistant:needs-info-comment -->')
      expect(comment).toContain('Thank you for reporting this issue!')
      expect(comment).not.toContain('**Issue Summary**:')
      expect(comment).toContain('## Missing Information')
      expect(comment).toContain('## Questions')
    })
  })
})
