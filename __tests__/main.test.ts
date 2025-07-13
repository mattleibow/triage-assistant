/**
 * Unit tests for the main workflow functionality, src/main.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import * as core from '../__fixtures__/actions-core.js'
import * as github from '../__fixtures__/actions-github.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)

// Mock the workflow functions
const mockRunTriageWorkflow = jest.fn<() => Promise<string>>()
const mockRunEngagementWorkflow = jest.fn<() => Promise<string>>()

jest.unstable_mockModule('../src/select-labels.js', () => ({
  runTriageWorkflow: mockRunTriageWorkflow,
  selectLabels: jest.fn()
}))

jest.unstable_mockModule('../src/engagement.js', () => ({
  runEngagementWorkflow: mockRunEngagementWorkflow,
  calculateEngagementScores: jest.fn(),
  updateProjectWithScores: jest.fn()
}))

// Import the module being tested
const { run } = await import('../src/main.js')

describe('main', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default GitHub context
    ;(github.context as any).repo = {
      owner: 'test-owner',
      repo: 'test-repo'
    }
    ;(github.context as any).issue = {
      number: 123
    }

    // Reset all inputs
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'template':
          return 'single-label'
        case 'token':
          return 'fake-token'
        case 'project':
          return ''
        case 'issue':
          return ''
        default:
          return ''
      }
    })
    ;(core.getBooleanInput as jest.Mock).mockReturnValue(false)

    // Mock successful workflow runs
    mockRunTriageWorkflow.mockResolvedValue('/tmp/response.json')
    mockRunEngagementWorkflow.mockResolvedValue('/tmp/engagement.json')
  })

  describe('input validation', () => {
    it('should use current issue number when none provided for triage mode', async () => {
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'single-label'
          case 'token':
            return 'fake-token'
          case 'issue':
            return '' // No issue provided
          default:
            return ''
        }
      })

      await run()

      expect(mockRunTriageWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 123,
          template: 'single-label'
        })
      )
    })

    it('should use explicit issue number when provided for triage mode', async () => {
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'single-label'
          case 'token':
            return 'fake-token'
          case 'issue':
            return '456' // Explicit issue provided
          default:
            return ''
        }
      })

      await run()

      expect(mockRunTriageWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 456,
          template: 'single-label'
        })
      )
    })

    it('should require project for engagement-score template', async () => {
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'token':
            return 'fake-token'
          case 'project':
            return '' // No project provided
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Project is required when using engagement-score template')
    })

    it('should require issue number for triage mode when no context available', async () => {
      ;(github.context as any).issue = undefined
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'single-label'
          case 'token':
            return 'fake-token'
          case 'issue':
            return '' // No issue provided
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Issue number is required for label/comment triage mode')
    })
  })

  describe('engagement scoring mode', () => {
    it('should run engagement workflow when template is engagement-score', async () => {
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'token':
            return 'fake-token'
          case 'project':
            return '1'
          case 'issue':
            return '123'
          default:
            return ''
        }
      })

      await run()

      expect(mockRunEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'engagement-score',
          project: '1',
          issueNumber: 123
        })
      )
      expect(core.setOutput).toHaveBeenCalledWith('engagement-response', '/tmp/engagement.json')
    })

    it('should handle engagement workflow without explicit issue', async () => {
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'token':
            return 'fake-token'
          case 'project':
            return '1'
          case 'issue':
            return '' // No issue provided
          default:
            return ''
        }
      })

      await run()

      expect(mockRunEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'engagement-score',
          project: '1',
          issueNumber: 0 // No issue number
        })
      )
    })
  })

  describe('triage mode', () => {
    it('should run triage workflow for label templates', async () => {
      const templates = ['single-label', 'multi-label', 'regression', 'missing-info']

      for (const template of templates) {
        jest.clearAllMocks()
        ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
          switch (name) {
            case 'template':
              return template
            case 'token':
              return 'fake-token'
            case 'issue':
              return '123'
            default:
              return ''
          }
        })

        await run()

        expect(mockRunTriageWorkflow).toHaveBeenCalledWith(
          expect.objectContaining({
            template,
            issueNumber: 123
          })
        )
        expect(core.setOutput).toHaveBeenCalledWith('response-file', '/tmp/response.json')
      }
    })

    it('should pass all configuration parameters to triage workflow', async () => {
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'single-label'
          case 'token':
            return 'test-token'
          case 'issue':
            return '456'
          case 'ai-endpoint':
            return 'https://custom-ai.com'
          case 'ai-model':
            return 'custom-model'
          case 'label':
            return 'bug'
          case 'label-prefix':
            return 'type/'
          case 'comment-footer':
            return 'Custom footer'
          default:
            return ''
        }
      })
      ;(core.getBooleanInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'apply-labels':
            return true
          case 'apply-comment':
            return true
          case 'apply-scores':
            return true
          default:
            return false
        }
      })

      await run()

      expect(mockRunTriageWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'single-label',
          token: 'test-token',
          issueNumber: 456,
          aiEndpoint: 'https://custom-ai.com',
          aiModel: 'custom-model',
          label: 'bug',
          labelPrefix: 'type/',
          commentFooter: 'Custom footer',
          applyLabels: true,
          applyComment: true,
          applyScores: true
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle triage workflow errors', async () => {
      const error = new Error('Triage workflow failed')
      mockRunTriageWorkflow.mockRejectedValue(error)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Triage workflow failed')
    })

    it('should handle engagement workflow errors', async () => {
      const error = new Error('Engagement workflow failed')
      mockRunEngagementWorkflow.mockRejectedValue(error)
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'token':
            return 'fake-token'
          case 'project':
            return '1'
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Engagement workflow failed')
    })

    it('should handle unknown errors', async () => {
      const error = { message: 'Unknown error' }
      mockRunTriageWorkflow.mockRejectedValue(error)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('An unknown error occurred: {"message":"Unknown error"}')
    })
  })

  describe('environment variables', () => {
    it('should use environment variables for AI configuration', async () => {
      process.env.TRIAGE_AI_ENDPOINT = 'https://env-ai.com'
      process.env.TRIAGE_AI_MODEL = 'env-model'
      process.env.TRIAGE_GITHUB_TOKEN = 'env-token'
      ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'single-label'
          case 'issue':
            return '123'
          default:
            return '' // No input provided, should use env vars
        }
      })

      await run()

      expect(mockRunTriageWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          aiEndpoint: 'https://env-ai.com',
          aiModel: 'env-model',
          token: 'env-token'
        })
      )

      // Clean up
      delete process.env.TRIAGE_AI_ENDPOINT
      delete process.env.TRIAGE_AI_MODEL
      delete process.env.TRIAGE_GITHUB_TOKEN
    })
  })
})
