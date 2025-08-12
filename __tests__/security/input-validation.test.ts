import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import * as github from '../../__fixtures__/actions/github.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)

// Import modules after mocking
const { run } = await import('../../src/main.js')

describe('Input Validation Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()

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
    it('should reject invalid repository owner', async () => {
      github.mockOctokit.context.repo!.owner = '../../../malicious'

      await expect(run()).rejects.toThrow('Invalid repository identifier')
    })

    it('should reject invalid repository name', async () => {
      github.mockOctokit.context.repo!.repo = '<script>alert("xss")</script>'

      await expect(run()).rejects.toThrow('Invalid repository identifier')
    })

    it('should accept valid repository identifiers', async () => {
      github.mockOctokit.context.repo!.owner = 'valid-owner_123'
      github.mockOctokit.context.repo!.repo = 'valid.repo-name'

      // Mock the workflow functions to avoid actually running them
      jest.doMock('../../src/triage/triage.js', () => ({
        runTriageWorkflow: jest.fn().mockResolvedValue('/tmp/response.json')
      }))

      // Should not throw
      await expect(run()).resolves.not.toThrow()
    })
  })

  describe('Numeric Input Validation', () => {
    it('should handle invalid project numbers gracefully', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'project') return 'invalid-number'
        if (name === 'template') return 'engagement-score'
        return ''
      })

      // Should log warning but not throw
      await run()
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Invalid project number: invalid-number'))
    })

    it('should handle negative numbers gracefully', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'issue') return '-123'
        return ''
      })

      await run()
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Invalid issue number: -123'))
    })

    it('should accept valid positive numbers', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'project') return '123'
        if (name === 'template') return 'engagement-score'
        return ''
      })

      await run()
      // Should not log any warnings about invalid numbers
      expect(core.warning).not.toHaveBeenCalledWith(expect.stringContaining('Invalid project number'))
    })
  })

  describe('Template Validation', () => {
    it('should reject invalid template names', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'template') return 'malicious-template'
        return ''
      })

      await expect(run()).rejects.toThrow('Invalid template: malicious-template')
    })

    it('should accept valid template names', async () => {
      const validTemplates = ['multi-label', 'single-label', 'regression', 'missing-info', 'engagement-score']

      for (const template of validTemplates) {
        core.getInput.mockImplementation((name: string) => {
          if (name === 'template') return template
          if (name === 'project') return '123' // For engagement-score
          return ''
        })

        // Should not throw
        await expect(run()).resolves.not.toThrow()
      }
    })

    it('should accept empty template', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'template') return ''
        return ''
      })

      // Should not throw
      await expect(run()).resolves.not.toThrow()
    })
  })
})
