import { jest } from '@jest/globals'
import * as core from '../__fixtures__/actions/core.js'
import * as triage from '../__fixtures__/triage/triage.js'
import * as engagement from '../__fixtures__/engagement/engagement.js'
import * as github from '../__fixtures__/actions/github.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('../src/triage/triage.js', () => triage)
jest.unstable_mockModule('../src/engagement/engagement.js', () => engagement)

// Import the module being tested
const { run, runApplyLabels, runEngagementScore } = await import('../src/main.js')

describe('Main Multi-Mode Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()

    // Default mock implementations
    core.getInput.mockImplementation(() => '')
    triage.runTriageWorkflow.mockImplementation(async () => '/tmp/response.json')
    engagement.runEngagementWorkflow.mockImplementation(async () => '/tmp/engagement-response.json')
  })

  afterEach(() => {
    jest.resetAllMocks()
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

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'engagement-score',
          projectNumber: 1,
          projectColumn: 'Engagement Score',
          applyScores: false
        })
      )
      expect(triage.runTriageWorkflow).not.toHaveBeenCalled()
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

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).toHaveBeenCalledWith(
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
        'Either project or issue must be specified when calculating engagement scores'
      )
      expect(engagement.runEngagementWorkflow).not.toHaveBeenCalled()
      expect(triage.runTriageWorkflow).not.toHaveBeenCalled()
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
          case 'apply-scores':
            return 'true'
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).toHaveBeenCalledWith(
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
          case 'issue':
            return '456'
          case 'token':
            return 'test-token'
          case 'apply-labels':
            return 'true'
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(triage.runTriageWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'multi-label',
          issueNumber: 456
        })
      )
      expect(engagement.runEngagementWorkflow).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenCalledWith('response-file', '/tmp/response.json')
    })

    it('should use default issue number from context when not specified', async () => {
      github.mockContext.issue = {
        number: 123
      }

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

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(triage.runTriageWorkflow).toHaveBeenCalledWith(
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

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(triage.runTriageWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 999
        })
      )
    })

    it('should handle workflow errors correctly', async () => {
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

      triage.runTriageWorkflow.mockRejectedValue(new Error('Test error'))

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Test error')
    })

    it('should fail when no template provided', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith('Template is required for applying labels')
      expect(triage.runTriageWorkflow).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).not.toHaveBeenCalled()
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
          case 'apply-scores':
            return 'true'
          case 'dry-run':
            return 'true'
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).toHaveBeenCalledWith(
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

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).toHaveBeenCalledWith(
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

      engagement.runEngagementWorkflow.mockRejectedValue(new Error('Engagement error'))

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

      engagement.runEngagementWorkflow.mockRejectedValue('String error')

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
          case 'dry-run':
            return 'true'
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(core.info).toHaveBeenCalledWith('Running in dry-run mode. No changes will be made.')
    })
  })

  describe('Sub-Action Functions', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should fail to run apply-labels sub-action without template', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'issue':
            return '999'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await runApplyLabels()

      expect(core.setFailed).toHaveBeenCalledWith('Template is required for applying labels')
      expect(triage.runTriageWorkflow).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).not.toHaveBeenCalled()
    })

    it('should run engagement-score sub-action without requiring template', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'project':
            return '456'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      await runEngagementScore()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          projectNumber: 456,
          template: '',
          token: 'test-token'
        })
      )
      expect(triage.runTriageWorkflow).not.toHaveBeenCalled()
    })

    it('should allow apply-labels sub-action to work with template input', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'template':
            return 'multi-label'
          case 'issue':
            return '777'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      const { runApplyLabels } = await import('../src/main.js')
      await runApplyLabels()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(triage.runTriageWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 777,
          template: 'multi-label',
          token: 'test-token'
        })
      )
    })

    it('should allow engagement-score sub-action to work with issue input', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'issue':
            return '789'
          case 'token':
            return 'test-token'
          default:
            return ''
        }
      })

      const { runEngagementScore } = await import('../src/main.js')
      await runEngagementScore()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(engagement.runEngagementWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          issueNumber: 789,
          template: '',
          token: 'test-token'
        })
      )
    })
  })
})
