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
const mockRunTriageWorkflow = jest.fn().mockResolvedValue('/tmp/response.json')
const mockRunEngagementWorkflow = jest.fn().mockResolvedValue('/tmp/engagement.json')

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

    // Reset mocks
    mockRunTriageWorkflow.mockResolvedValue('/tmp/response.json')
    mockRunEngagementWorkflow.mockResolvedValue('/tmp/engagement.json')
  })

  describe('input validation', () => {
    it('should use current issue number when none provided for triage mode', async () => {
      ;(core.getInput as any).mockImplementation((name: string) => {
        if (name === 'template') return 'single-label'
        if (name === 'token') return 'fake-token'
        return ''
      })
      ;(core.getBooleanInput as any).mockReturnValue(false)

      await run()

      expect(mockRunTriageWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 123,
          template: 'single-label'
        })
      )
    })

    it('should require project for engagement-score template', async () => {
      ;(core.getInput as any).mockImplementation((name: string) => {
        if (name === 'template') return 'engagement-score'
        if (name === 'token') return 'fake-token'
        return ''
      })
      ;(core.getBooleanInput as any).mockReturnValue(false)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Project is required when using engagement-score template')
    })

    it('should require issue number for triage mode when no context available', async () => {
      ;(github.context as any).issue = undefined
      ;(core.getInput as any).mockImplementation((name: string) => {
        if (name === 'template') return 'single-label'
        if (name === 'token') return 'fake-token'
        return ''
      })
      ;(core.getBooleanInput as any).mockReturnValue(false)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Issue number is required for label/comment triage mode')
    })
  })

  describe('engagement scoring mode', () => {
    it('should run engagement workflow when template is engagement-score', async () => {
      ;(core.getInput as any).mockImplementation((name: string) => {
        if (name === 'template') return 'engagement-score'
        if (name === 'token') return 'fake-token'
        if (name === 'project') return '1'
        return ''
      })
      ;(core.getBooleanInput as any).mockReturnValue(false)

      await run()

      expect(mockRunEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'engagement-score',
          project: '1'
        })
      )
      expect(core.setOutput).toHaveBeenCalledWith('engagement-response', '/tmp/engagement.json')
    })
  })

  describe('triage mode', () => {
    it('should run triage workflow for label templates', async () => {
      const templates = ['single-label', 'multi-label', 'regression', 'missing-info']

      for (const template of templates) {
        jest.clearAllMocks()
        mockRunTriageWorkflow.mockResolvedValue('/tmp/response.json')
        ;(core.getInput as any).mockImplementation((name: string) => {
          if (name === 'template') return template
          if (name === 'token') return 'fake-token'
          if (name === 'issue') return '123'
          return ''
        })
        ;(core.getBooleanInput as any).mockReturnValue(false)

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
  })

  describe('error handling', () => {
    it('should handle triage workflow errors', async () => {
      const error = new Error('Triage workflow failed')
      mockRunTriageWorkflow.mockRejectedValue(error)
      ;(core.getInput as any).mockImplementation((name: string) => {
        if (name === 'template') return 'single-label'
        if (name === 'token') return 'fake-token'
        return ''
      })
      ;(core.getBooleanInput as any).mockReturnValue(false)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Triage workflow failed')
    })

    it('should handle engagement workflow errors', async () => {
      const error = new Error('Engagement workflow failed')
      mockRunEngagementWorkflow.mockRejectedValue(error)
      ;(core.getInput as any).mockImplementation((name: string) => {
        if (name === 'template') return 'engagement-score'
        if (name === 'token') return 'fake-token'
        if (name === 'project') return '1'
        return ''
      })
      ;(core.getBooleanInput as any).mockReturnValue(false)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Engagement workflow failed')
    })
  })
})
