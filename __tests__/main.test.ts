import { jest } from '@jest/globals'
import * as core from '../__fixtures__/actions-core.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    },
    issue: {
      number: 123
    }
  }
}))

// Mock dependencies
jest.unstable_mockModule('../src/prompts-select-labels.js', () => ({
  selectLabels: jest.fn()
}))

jest.unstable_mockModule('../src/github-apply.js', () => ({
  applyLabelsAndComment: jest.fn(),
  manageReactions: jest.fn()
}))

jest.unstable_mockModule('../src/engagement.js', () => ({
  runEngagementWorkflow: jest.fn()
}))

// Import the module being tested
const { run } = await import('../src/main.js')
const { selectLabels } = await import('../src/prompts-select-labels.js')
const { applyLabelsAndComment, manageReactions } = await import('../src/github-apply.js')
const { runEngagementWorkflow } = await import('../src/engagement.js')

// Type the mocks
const mockSelectLabels = selectLabels as jest.MockedFunction<typeof selectLabels>
const mockApplyLabelsAndComment = applyLabelsAndComment as jest.MockedFunction<typeof applyLabelsAndComment>
const mockManageReactions = manageReactions as jest.MockedFunction<typeof manageReactions>
const mockRunEngagementWorkflow = runEngagementWorkflow as jest.MockedFunction<typeof runEngagementWorkflow>

describe('Main Dual Mode Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'token':
          return 'test-token'
        case 'fallback-token':
          return 'fallback-token'
        default:
          return ''
      }
    })

    core.getBooleanInput.mockReturnValue(false)
    mockSelectLabels.mockResolvedValue('/tmp/response.json')
    mockApplyLabelsAndComment.mockResolvedValue()
    mockManageReactions.mockResolvedValue()
    mockRunEngagementWorkflow.mockResolvedValue('/tmp/engagement-response.json')
  })

  describe('Engagement Scoring Mode', () => {
    it('should run engagement workflow when template is engagement-score', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'project':
            return '1'
          case 'token':
            return 'test-token'
          case 'project-column':
            return 'Engagement Score'
          default:
            return ''
        }
      })

      await run()

      expect(mockRunEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'engagement-score',
          projectNumber: 1,
          projectColumn: 'Engagement Score',
          applyScores: false
        })
      )
      expect(mockSelectLabels).not.toHaveBeenCalled()
      expect(mockApplyLabelsAndComment).not.toHaveBeenCalled()
      expect(mockManageReactions).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenCalledWith('response-file', '/tmp/engagement-response.json')
    })

    it('should work with issue number instead of project', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'issue':
            return '456'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await run()

      expect(mockRunEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'engagement-score',
          issueNumber: 456,
          projectNumber: 0,
          applyScores: false
        })
      )
    })

    it('should throw error when neither project nor issue is specified for engagement mode', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'Either project or issue must be specified when using engagement-score template'
      )
      expect(mockRunEngagementWorkflow).not.toHaveBeenCalled()
    })

    it('should handle apply-scores input correctly', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'project':
            return '1'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      core.getBooleanInput.mockImplementation((name: string) => {
        return name === 'apply-scores'
      })

      await run()

      expect(mockRunEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          applyScores: true
        })
      )
    })
  })

  describe('Normal Triage Mode', () => {
    it('should run normal triage workflow when template is not engagement-score', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'multi-label'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      core.getBooleanInput.mockImplementation((name: string) => {
        return name === 'apply-labels'
      })

      await run()

      expect(mockSelectLabels).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'multi-label'
        })
      )
      expect(mockApplyLabelsAndComment).toHaveBeenCalled()
      expect(mockManageReactions).toHaveBeenCalledTimes(2) // Start and end
      expect(mockRunEngagementWorkflow).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenCalledWith('response-file', '/tmp/response.json')
    })

    it('should use default issue number from context when not specified', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'single-label'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await run()

      expect(mockSelectLabels).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 123 // From mocked context
        })
      )
    })

    it('should handle explicit issue number input', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'single-label'
          case 'issue':
            return '999'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await run()

      expect(mockSelectLabels).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 999
        })
      )
    })

    it('should not remove reactions on error', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'multi-label'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      core.getBooleanInput.mockImplementation((name: string) => {
        return name === 'apply-labels'
      })

      mockSelectLabels.mockRejectedValue(new Error('Test error'))

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Test error')
      expect(mockManageReactions).toHaveBeenCalledTimes(1) // Only start, not end
    })

    it('should handle no template provided', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await run()

      expect(mockSelectLabels).not.toHaveBeenCalled()
      expect(mockApplyLabelsAndComment).not.toHaveBeenCalled()
      expect(mockManageReactions).not.toHaveBeenCalled()
      expect(mockRunEngagementWorkflow).not.toHaveBeenCalled()
    })
  })

  describe('Configuration Parsing', () => {
    it('should parse all configuration options correctly', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'project':
            return '1'
          case 'project-column':
            return 'Custom Score'
          case 'token':
            return 'test-token'
          case 'ai-endpoint':
            return 'https://custom.ai'
          case 'ai-model':
            return 'gpt-4'
          case 'ai-token':
            return 'ai-token'
          case 'comment-footer':
            return 'Custom footer'
          case 'label':
            return 'bug'
          case 'label-prefix':
            return 'area/'
          default:
            return ''
        }
      })

      core.getBooleanInput.mockImplementation((name: string) => {
        return name === 'apply-scores' || name === 'dry-run'
      })

      await run()

      expect(mockRunEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'engagement-score',
          projectNumber: 1,
          projectColumn: 'Custom Score',
          applyScores: true,
          token: 'test-token',
          aiEndpoint: 'https://custom.ai',
          aiModel: 'gpt-4',
          aiToken: 'ai-token',
          commentFooter: 'Custom footer',
          label: 'bug',
          labelPrefix: 'area/',
          dryRun: true,
          repoOwner: 'test-owner',
          repoName: 'test-repo'
        })
      )
    })

    it('should use default values when inputs are not provided', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'project':
            return '1'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await run()

      expect(mockRunEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          projectColumn: 'Engagement Score', // Default value
          applyScores: false, // Default value
          dryRun: false, // Default value
          aiEndpoint: 'https://models.github.ai/inference', // Default value
          aiModel: 'openai/gpt-4o' // Default value
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle errors from engagement workflow', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'project':
            return '1'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      mockRunEngagementWorkflow.mockRejectedValue(new Error('Engagement error'))

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Engagement error')
    })

    it('should handle non-Error objects', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'project':
            return '1'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      mockRunEngagementWorkflow.mockRejectedValue('String error')

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('An unknown error occurred: "String error"')
    })

    it('should handle dry-run mode correctly', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'engagement-score'
          case 'project':
            return '1'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      core.getBooleanInput.mockImplementation((name: string) => {
        return name === 'dry-run'
      })

      await run()

      expect(core.info).toHaveBeenCalledWith('Running in dry-run mode. No changes will be made.')
    })
  })
})
