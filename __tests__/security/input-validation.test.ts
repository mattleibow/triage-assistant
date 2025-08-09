import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock the modules before importing
jest.unstable_mockModule('@actions/core', () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  debug: jest.fn()
}))

jest.unstable_mockModule('@actions/github', () => ({
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    issue: { number: 123 }
  }
}))

// Import modules after mocking
const core = await import('@actions/core')
const github = await import('@actions/github')
const { run } = await import('../../src/main.js')

const mockCore = core as jest.Mocked<typeof core>
const mockGithub = github as any

describe('Input Validation Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset GitHub context
    mockGithub.context = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      issue: { number: 123 }
    }
    
    // Mock default inputs
    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'template': '',
        'project': '',
        'issue': '',
        'ai-endpoint': '',
        'ai-model': '',
        'ai-token': '',
        'token': 'test-token',
        'fallback-token': 'fallback-token',
        'label': '',
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
    
    mockCore.getBooleanInput.mockImplementation((name: string) => {
      const boolInputs: Record<string, boolean> = {
        'apply-labels': false,
        'apply-comment': false,
        'apply-scores': false,
        'dry-run': true
      }
      return boolInputs[name] || false
    })
  })

  describe('Repository ID Validation', () => {
    it('should reject invalid repository owner', async () => {
      mockGithub.context.repo.owner = '../../../malicious'
      
      await expect(run()).rejects.toThrow('Invalid repository identifier')
    })

    it('should reject invalid repository name', async () => {
      mockGithub.context.repo.repo = '<script>alert("xss")</script>'
      
      await expect(run()).rejects.toThrow('Invalid repository identifier')
    })

    it('should accept valid repository identifiers', async () => {
      mockGithub.context.repo.owner = 'valid-owner_123'
      mockGithub.context.repo.repo = 'valid.repo-name'
      
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
      mockCore.getInput = jest.fn().mockImplementation((name: string) => {
        if (name === 'project') return 'invalid-number'
        if (name === 'template') return 'engagement-score'
        return ''
      })
      
      // Should log warning but not throw
      await run()
      expect(mockCore.warning).toHaveBeenCalledWith(
        expect.stringContaining('Invalid project number: invalid-number')
      )
    })

    it('should handle negative numbers gracefully', async () => {
      mockCore.getInput = jest.fn().mockImplementation((name: string) => {
        if (name === 'issue') return '-123'
        return ''
      })
      
      await run()
      expect(mockCore.warning).toHaveBeenCalledWith(
        expect.stringContaining('Invalid issue number: -123')
      )
    })

    it('should accept valid positive numbers', async () => {
      mockCore.getInput = jest.fn().mockImplementation((name: string) => {
        if (name === 'project') return '123'
        if (name === 'template') return 'engagement-score'
        return ''
      })
      
      await run()
      // Should not log any warnings about invalid numbers
      expect(mockCore.warning).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid project number')
      )
    })
  })

  describe('Template Validation', () => {
    it('should reject invalid template names', async () => {
      mockCore.getInput = jest.fn().mockImplementation((name: string) => {
        if (name === 'template') return 'malicious-template'
        return ''
      })
      
      await expect(run()).rejects.toThrow('Invalid template: malicious-template')
    })

    it('should accept valid template names', async () => {
      const validTemplates = ['multi-label', 'single-label', 'regression', 'missing-info', 'engagement-score']
      
      for (const template of validTemplates) {
        mockCore.getInput = jest.fn().mockImplementation((name: string) => {
          if (name === 'template') return template
          if (name === 'project') return '123' // For engagement-score
          return ''
        })
        
        // Should not throw
        await expect(run()).resolves.not.toThrow()
      }
    })

    it('should accept empty template', async () => {
      mockCore.getInput = jest.fn().mockImplementation((name: string) => {
        if (name === 'template') return ''
        return ''
      })
      
      // Should not throw
      await expect(run()).resolves.not.toThrow()
    })
  })
})